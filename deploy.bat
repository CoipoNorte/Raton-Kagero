@echo off
rem ============================================================
rem  Raton-Kagero - despliegue en GitHub Pages (Windows)
rem  Repo : https://github.com/CoipoNorte/Raton-Kagero
rem  Web  : https://coiponorte.github.io/Raton-Kagero/
rem
rem  Reglas de este archivo:
rem    - NO usa EnableDelayedExpansion (destruye "!" en JavaScript).
rem    - NO genera JavaScript con echo ni con node -e.
rem    - Toda la logica vive en scripts/deploy-prepare.cjs.
rem    - Se puede ejecutar tantas veces como se quiera (idempotente).
rem ============================================================

setlocal DisableDelayedExpansion

set "ROOT=%~dp0"
set "FAILED=0"

echo.
echo ============================================================
echo  RATON-KAGERO :: despliegue en GitHub Pages
echo  Carpeta del proyecto: %ROOT%
echo ============================================================
echo.

rem ---------- 0. Node disponible ----------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no esta en el PATH.
    echo         Instalalo desde https://nodejs.org y vuelve a intentarlo.
    set "FAILED=1"
    goto :end
)

for /f "delims=" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo [OK] Node %NODE_VERSION%

rem ---------- 1. Estructura basica ----------
if not exist "%ROOT%package.json" (
    echo [ERROR] Falta package.json en %ROOT%.
    set "FAILED=1"
    goto :end
)

if not exist "%ROOT%scripts\deploy-prepare.cjs" (
    echo [ERROR] Falta scripts\deploy-prepare.cjs.
    echo         Ese archivo contiene toda la preparacion del despliegue.
    set "FAILED=1"
    goto :end
)

rem ---------- 2. gh-pages instalado (comprobacion defensiva) ----------
if not exist "%ROOT%node_modules\gh-pages\package.json" (
    echo [AVISO] gh-pages no esta instalado. Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install fallo.
        set "FAILED=1"
        goto :end
    )
)

if not exist "%ROOT%node_modules\gh-pages\package.json" (
    echo [ERROR] gh-pages sigue sin estar disponible.
    echo         Ejecuta manualmente: npm install -D gh-pages
    set "FAILED=1"
    goto :end
)

echo [OK] gh-pages presente

rem ---------- 3. Preparar package.json, vite.config.ts y .nojekyll ----------
echo.
echo --- Preparando configuracion de despliegue ---
node "%ROOT%scripts\deploy-prepare.cjs" all --root="%ROOT%"
if errorlevel 1 (
    echo [ERROR] La preparacion de la configuracion fallo.
    set "FAILED=1"
    goto :end
)

rem ---------- 4. Compilar ----------
echo.
echo --- Compilando (tsc --noEmit + vite build) ---
call npm run build
if errorlevel 1 (
    echo [ERROR] La compilacion fallo. Corrige los errores y vuelve a ejecutar.
    set "FAILED=1"
    goto :end
)

rem ---------- 5. Verificar el resultado ----------
echo.
echo --- Verificando dist ---
node "%ROOT%scripts\deploy-prepare.cjs" check --root="%ROOT%"
if errorlevel 1 (
    echo [ERROR] La verificacion de dist fallo.
    set "FAILED=1"
    goto :end
)

rem ---------- 6. Publicar ----------
echo.
echo --- Publicando en la rama gh-pages ---
call npm run deploy
if errorlevel 1 (
    echo [ERROR] gh-pages no pudo publicar.
    echo         Revisa que el repositorio remoto este configurado y tengas permisos.
    set "FAILED=1"
    goto :end
)

echo.
echo ============================================================
if "%FAILED%"=="0" (
    echo  DESPLIEGO CORRECTAMENTE
    echo.
    echo  Web: https://coiponorte.github.io/Raton-Kagero/
    echo  Espera 1-2 minutos a que GitHub Pages refresque la cache.
)
echo ============================================================
echo.

:end
if not "%FAILED%"=="0" (
    echo.
    echo ============================================================
    echo  DESPLIEGO CANCELADO CON ERRORES
    echo  Revisa los mensajes de arriba. Nada se ha publicado.
    echo ============================================================
    echo.
)

endlocal
exit /b %FAILED%
