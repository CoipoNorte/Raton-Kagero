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
rem    - PUSHD entra en la carpeta junto al BAT (sirve al abrirlo con Explorer).
rem    - No se pasa --root con una ruta que termina en \: CMD puede adjuntar
rem      la comilla de cierre a la ruta y Node acaba buscando package.json".
rem    - Se puede ejecutar tantas veces como se quiera (idempotente).
rem ============================================================

setlocal DisableDelayedExpansion

set "ROOT=%~dp0"
for %%I in ("%ROOT%.") do set "ROOT_CLEAN=%%~fI"
set "FAILED=0"
set "ROOT_PUSHED=0"

echo.
echo ============================================================
echo  RATON-KAGERO :: despliegue en GitHub Pages
echo  Carpeta del proyecto detectada junto al BAT.
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
if not exist "%ROOT_CLEAN%\package.json" (
    echo [ERROR] No se encontro package.json junto a deploy.bat.
    echo         Si el ZIP creo una subcarpeta anidada, mueve el BAT al nivel de package.json.
    set "FAILED=1"
    goto :end
)

if not exist "%ROOT_CLEAN%\scripts\deploy-prepare.cjs" (
    echo [ERROR] Falta scripts\deploy-prepare.cjs.
    echo         Ese archivo contiene toda la preparacion del despliegue.
    set "FAILED=1"
    goto :end
)

rem Todas las operaciones npm y Node deben ejecutarse en la carpeta del repo,
rem incluso si el BAT se lanza desde Explorer o desde otra carpeta.
pushd "%ROOT_CLEAN%" >nul
if errorlevel 1 (
    echo [ERROR] No se pudo entrar a la carpeta del proyecto.
    set "FAILED=1"
    goto :end
)
set "ROOT_PUSHED=1"

rem ---------- 2. gh-pages instalado (comprobacion defensiva) ----------
if not exist "%ROOT_CLEAN%\node_modules\gh-pages\package.json" (
    echo [AVISO] gh-pages no esta instalado. Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install fallo.
        set "FAILED=1"
        goto :end
    )
)

if not exist "%ROOT_CLEAN%\node_modules\gh-pages\package.json" (
    echo [ERROR] gh-pages sigue sin estar disponible.
    echo         Ejecuta manualmente: npm install -D gh-pages
    set "FAILED=1"
    goto :end
)

echo [OK] gh-pages presente

rem ---------- 3. Preparar package.json, vite.config.ts y .nojekyll ----------
echo.
echo --- Preparando configuracion de despliegue ---
rem No se pasa --root: CMD escapaba la comilla final al combinarla con %~dp0.
node scripts\deploy-prepare.cjs all
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
node scripts\deploy-prepare.cjs check
if errorlevel 1 (
    echo [ERROR] La verificacion de dist fallo.
    set "FAILED=1"
    goto :end
)

rem ---------- 5b. Repositorio Git y remoto ----------
rem gh-pages necesita un repo Git con remoto; si el proyecto se descargo como
rem ZIP, aqui se avisa con claridad en vez de fallar con un mensaje criptico.
echo.
echo --- Comprobando repositorio Git ---
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git no esta en el PATH.
    echo         Instalalo desde https://git-scm.com/download/win y vuelve a intentarlo.
    set "FAILED=1"
    goto :end
)
echo [OK] Git disponible

if not exist "%ROOT_CLEAN%\.git" (
    echo [ERROR] Esta carpeta no es un repositorio Git.
    echo         gh-pages publica en la rama gh-pages de un remoto, asi que hace falta Git.
    echo.
    echo         Opcion A, enlazar con tu repo de GitHub:
    echo             git init
    echo             git add -A
    echo             git commit -m "Raton-Kagero"
    echo             git branch -M main
    echo             git remote add origin https://github.com/CoipoNorte/Raton-Kagero.git
    echo         Opcion B, clonar el repo y copiar estos archivos dentro.
    echo         Despues vuelve a ejecutar deploy.bat
    set "FAILED=1"
    goto :end
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo [ERROR] El repositorio no tiene configurado el remoto "origin".
    echo         Ejecuta: git remote add origin https://github.com/CoipoNorte/Raton-Kagero.git
    set "FAILED=1"
    goto :end
)

for /f "delims=" %%u in ('git remote get-url origin') do set "GIT_REMOTE=%%u"
echo [OK] remoto origin: %GIT_REMOTE%

rem ---------- 6. Publicar ----------
rem Se invoca gh-pages directamente: "npm run deploy" dispararia predeploy y
rem volveria a compilar lo que los pasos 4 y 5 ya compilaron y verificaron.
echo.
echo --- Publicando en la rama gh-pages ---
if exist "%ROOT_CLEAN%\node_modules\.bin\gh-pages.cmd" (
    call "%ROOT_CLEAN%\node_modules\.bin\gh-pages.cmd" -d dist -t
) else (
    call npx gh-pages -d dist -t
)
if errorlevel 1 (
    echo [ERROR] gh-pages no pudo publicar.
    echo         Causas habituales:
    echo           - la carpeta no es un repositorio Git, o no tiene remoto "origin"
    echo           - faltan credenciales de GitHub con permiso de escritura
    echo           - la rama gh-pages esta protegida en el repositorio
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
if "%ROOT_PUSHED%"=="1" popd >nul
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
