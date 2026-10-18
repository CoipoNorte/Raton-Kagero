# 📋 Plan de Desarrollo — Ratón: Zombie Cat Trap (Raton-Kagero)

Estado real del proyecto. Marca las fases completadas y qué queda por hacer.

**Web:** <https://coiponorte.github.io/Raton-Kagero/> · **Repo:** <https://github.com/CoipoNorte/Raton-Kagero>

| Fase | Estado | Notas |
|---|---|---|
| 0. Configuración del proyecto | ✅ Hecho | Vite 7 + React 19 + TS estricto + Tailwind 4, `base: /Raton-Kagero/` |
| 1. Fundamentos técnicos | ✅ Hecho | `useLayout`, `storage.ts`, `sound.ts`, `random.ts`, `textures.ts` |
| 2. Habitación 3D y ratón | ✅ Hecho | Sala procedural, cuadrícula 9×7, ratón inventor con animaciones |
| 3. Enemigos y simulación | ✅ Hecho | 6 gatos, campo de flujo BFS, física arcade con timestep fijo |
| 4. Sistema de trampas | ✅ Hecho | 16 trampas en suelo/pared/techo, colocación validada, activaciones |
| 5. Combos y puntuación | ✅ Hecho | Ventana 2,5 s, ×1/×2/×3/×5, variedad, ambiental, finisher |
| 6. UI y UX | ✅ Hecho | Inicio, briefing, HUD, barra de trampas, pausa, game over |
| 7. Modos de juego | ✅ Hecho | Supervivencia (90 s) y Laboratorio sin reloj |
| 8. Estética PS1 / VHS | ✅ Hecho | Texturas canvas + dithering, scanlines, ruido, tracking, vignette |
| 9. Persistencia y ajustes | ✅ Hecho | Claves versionadas, fallback en memoria, calidad/volcado/VHS |
| 10. Optimización y pruebas | ✅ Hecho | Pooling, instancing, DPR adaptativo, calidad automática y tests de lógica |
| 11. Despliegue y docs | 🟡 Preparado | Scripts y README listos; publicación remota pendiente de acceso al repositorio |
| 12. QA de jugabilidad y responsive | ✅ Hecho | Tests de regresión y Chromium real en 6 tamaños, colocación y pausa |
| 13. Mando y móvil sin solapes | ✅ Hecho | Gamepad API, HUD compacto, dock táctil y 5 checks geométricos |
| 14. Rediseño del ratón inventor | ✅ Hecho | Anatomía cuadrúpeda, hocico, orejas y una única cola larga continua |
| 15. Auditoría de botones y teclado | ✅ Hecho | 47 botones revisados, 7 defectos corregidos, 18 pruebas nuevas |
| 16. Colisiones y legibilidad móvil | ✅ Hecho | Colisión AABB real y cero defectos de tipografía táctil |
| 17. Diseño de nivel y texturas | ✅ Hecho | Sala +2,4 m, texturas a escala real y muebles con fuente única |
| 18. Catálogo de salas | ✅ Hecho | 4 mapas jugables con tema propio, selector y 8 pruebas por mapa |
| 19. Tutorial guiado | ✅ Hecho | 12 pasos que avanzan al hacer la acción; 2 bugs heredados corregidos |
| 20. Estructura del HUD | ✅ Hecho | Dock de sistema anclado y indicadores agrupados en Misión/Marcador/Taller |

---

## Fase 0 — Configuración ✅

- Vite 7, React 19, TypeScript `strict`, Tailwind CSS 4.
- Dependencias: `three`, `@react-three/fiber` (v9), `@react-three/drei` (v10), `framer-motion`, `lucide-react`.
- Dev: `@types/three`, `gh-pages`, `vitest`.
- `base: "/Raton-Kagero/"` y `vite-plugin-singlefile` para un único `index.html`.
- `public/.nojekyll`, `public/icon.svg`, `public/favicon.svg` y favicon embebido como data-URI.
- `index.html` con splash «Cargando polígonos PS1...» y `viewport-fit=cover`.

## Fase 1 — Fundamentos ✅

- `src/hooks/useLayout.ts`: mide el contenedor real con `ResizeObserver`, clasifica el perfil
  (`mobile` / `tablet` / `desktop`, más `short-landscape`), expone safe areas, `reducedMotion`
  y `pointer: coarse`.
- `src/game/storage.ts`: único punto de acceso al almacenamiento. Claves versionadas,
  validación defensiva, `volatile` si `localStorage` está bloqueado y listo para migrar a IndexedDB.
- `src/game/sound.ts`: sintetizador WebAudio con **un solo** `AudioContext`, desbloqueado tras un
  gesto real. Buses independientes para efectos y música, bucle de mansión de 16 pasos.
- `src/game/random.ts`: generador con semilla (mulberry32) y `hashSeed`.
- `src/game/textures.ts`: texturas canvas de baja resolución con `NearestFilter` y dithering Bayer.

## Fase 2 — Habitación y ratón ✅

- `Room.tsx`: suelo, tres paredes, zócalo, vigas, muebles que bloquean casillas, alfombra de la
  guarida, quesera con anillo de estado y tres entradas (puerta, ventana, conducto).
- Planos de raycast invisibles para suelo y paredes.
- `MouseInventor.tsx`: vincha con linterna, mochila de herramientas, cola angular, cono de luz,
  animaciones de idle, caminar, celebrar y derrota cómica.

## Fase 3 — Enemigos y simulación ✅

- `ZombieCat.tsx`: seis siluetas (común, rápido, pesado, saltarín, con casco, jefe) con ojos
  brillantes, lengua, mandíbula, animaciones de caminata torpe, patinaje, aturdimiento con
  estrellas y derrota en polígonos.
- IA con **campo de flujo BFS** (no NavMesh): los gatos entran, siguen el gradiente hacia la
  quesera, recalculan al ser empujados, reanudan la marcha tras el aturdimiento, atacan al
  llegar y huyen si la quesera cae.
- `simulation.ts`: acumulador + `FIXED_DT` (1/60) con `MAX_STEPS`, gravedad, impulso, fricción,
  rebote contra paredes, expulsión de muebles y daño al ratón.
- Oleadas cada 12 s con tabla de aparición ponderada y aceleración del ritmo.

## Fase 4 — Trampas ✅

- 16 trampas originales: 6 de suelo, 5 de pared, 5 de techo.
- Estados `arming → ready → fired → cooldown → broken` con usos, cooldown y tiempo de armado.
- Activación automática, temporizada, manual y encadenada (la lámpara se dispara si otra trampa
  golpea cerca).
- Validación pura en `logic.ts`: superficie correcta, casilla libre, muebles, quesera, coste,
  límite global, máximo tres por carril de pared, sin repetir modelo en el mismo carril y una
  sola lámpara.
- Fantasma verde/rojo con casilla proyectada, radio de efecto, carril y vector de empuje.
- Retirada con reembolso del 85 % durante la preparación y en el Laboratorio.

## Fase 5 — Combos ✅

- El combo pertenece al gato impactado; ventana de 2,5 s; tabla 1/2/3/5.
- Bonus de variedad (+45), golpe ambiental (+30 por gato extra), CHEESE BONUS (×1,25 si el
  inventor está cerca), finisher (+120) y bonus de quesera intacta al terminar.
- Palabras flotantes integradas en la escena mediante sprites con textura procedural.

## Fase 6 — UI ✅

- `StartScreen` con cinta VHS, bestiario, arsenal y controles; `BriefingScreen` con la cadena modelo.
- `Hud` flotante con container queries: quesera segmentada, reloj, puntos, combo, queso, oleada,
  energía y avisos; botones de pausa/sonido/música con iconos grandes.
- `TrapBar` con tabs de categoría, carrusel con scroll táctil, arrastre con ratón, rueda, snap,
  fundidos laterales, autoscroll que se pausa al interactuar y scrollbar retro.
- `PauseMenu` con audio, calidad, sacudida, VHS, flashes, estelas y aviso de almacenamiento.
- `GameOverScreen` con récord, rango y siguiente desbloqueo.

## Fase 7 — Modos ✅

- **Supervivencia**: 90 s, preparación de 10 s, oleadas crecientes, jefe en la 7, récord guardado.
- **Laboratorio**: sin reloj, sin daño, gatos de prueba por tipo y entrada, enjambre, reset de
  sala, estelas y cámara libre en escritorio.

## Fase 8 — Estética ✅

- Modelos low-poly con `flatShading`, paleta limitada, texturas 32×32 con dithering.
- Antialias desactivado, `image-rendering: pixelated`, niebla de mansión, luz cálida y verdosa.
- VHS en CSS puro (scanlines, ruido animado, línea de tracking, aberración en los bordes),
  `pointer-events: none`, configurable y reducido con `prefers-reduced-motion`.

## Fase 9 — Persistencia ✅

- Récord, combo máximo, cadena máxima, queso acumulado, gatos expulsados y partidas.
- Ajustes: efectos, música, volumen, calidad, calidad automática, sacudida, VHS, flashes, estelas.
- Desbloqueos por queso acumulado (7 trampas de serie).

## Fase 10 — Optimización y pruebas ✅

- Pooling de gatos, trampas, proyectiles, partículas y popups; `InstancedMesh` para partículas y estelas.
- HUD a ~8 Hz, sin `setState` dentro de `useFrame`.
- DPR por calidad (1 / 1,25 / 1,5), sombras sólo en alta, límites por perfil, calidad automática.
- `npx tsc --noEmit` limpio y tests en `src/game/__tests__/logic.test.ts` que cubren
  cuadrícula, pathfinding, validación de colocación, combos, oleadas y simulación headless
  (colocación, reembolso, cadena, daño a la quesera, fin por tiempo, pausa y delta grande).
- Pausa automática al ocultar la pestaña y límite de delta al volver.

## Fase 11 — Despliegue preparado 🟡

- `scripts/deploy-prepare.cjs` (CommonJS, `fs` + `path`, idempotente, con verificación y
  `process.exit(1)`). Tareas: `package`, `vite`, `nojekyll`, `check`, `all` y `--root=` para pruebas.
- `deploy.bat` con `setlocal DisableDelayedExpansion`, sin `echo` de JavaScript y sin `node -e`.
- `predeploy: npm run check && npm run build`, `deploy: gh-pages -d dist -t true`.
- `README.md` orientado a jugadores.

**Pendiente externo:** publicar requiere credenciales GitHub y un remoto configurado. Este
entorno no contiene un repositorio Git vinculado a `CoipoNorte/Raton-Kagero`; una compilación
correcta no demuestra que la URL pública responda. En la verificación actual, el repositorio
responde HTTP 200 pero la URL de GitHub Pages devuelve **HTTP 404**. Ejecutar `deploy.bat` desde
un clon conectado al repositorio, activar GitHub Pages con fuente `gh-pages` y comprobar el sitio.

### Publicar en Windows

```bat
deploy.bat
```

El BAT comprueba Node y `gh-pages`, prepara `package.json` / `vite.config.ts` / `.nojekyll`,
compila, verifica `dist` y publica en la rama `gh-pages`.

### Comandos

```bash
npm run dev        # desarrollo
npm run check      # tsc --noEmit
npm run test       # vitest run
npm run build      # vite build
npm run deploy     # publica en GitHub Pages
npx playwright test # pruebas de navegador (requiere npx playwright install chromium)
```

---

## Fase 12 — QA de jugabilidad y responsive ✅

- Corregida validación cruzada de superficies: una trampa no se puede instalar en una
  superficie distinta a la propia, ni en un índice fuera de la cuadrícula.
- Los impactos de techo se resuelven **al aterrizar y una sola vez**; los bolos salen al
  aterrizar. Las trampas de varios usos vuelven a armarse después de un cooldown mínimo.
- La preparación arma trampas sin activarlas ni consumir el reloj de la oleada.
- Pausa blindada desde teclado y llamadas directas: no se puede colocar, quitar ni disparar;
  `Escape` reanuda.
- El Laboratorio deja probar todos los modelos sin gastar queso y no altera el récord.
  El queso inicial deja de contar como queso ganado para desbloqueos.
- Selección táctil en dos toques verificada; el botón Cancelar de la barra deselecciona
  realmente la trampa. El joystick conserva pointer capture hasta soltar el dedo.
- Panel compacto de Laboratorio para móviles apaisados de poca altura.
- **Pruebas automatizadas:** `npm run test` (35 casos de lógica y humo), `npx playwright test`
  (Chromium real: menú, Canvas, suelo/pared/techo, doble toque, pausa/reanudación).
- **Viewports de navegador:** 390×844, 844×390, 768×1024, 1024×768, 1280×820 y 1600×900.
  El Canvas y los botones esenciales quedaron dentro de pantalla sin errores JS.

**No verificado aún:** rendimiento 50–60 FPS en teléfonos físicos, Safari/iOS y publicación
en GitHub Pages. Chromium con renderizado por software no representa FPS reales de móvil.

---

## Fase 13 — Mando y móvil sin solapes ✅

- **Soporte de mando** (`src/game/gamepad.ts` + `src/hooks/useGamepad.ts`): mapeo estándar
  puro y testeable, sondeo con un solo rAF, zona muerta, detección de flancos, cursor por
  casillas con cruceta o stick derecho, cambio de pared y convivencia con teclado/ratón.
  El HUD muestra la insignia MANDO y la escena una retícula cian en el cursor.
- **Móvil vertical reorganizado**: HUD compacto de una fila con salto de línea (ya no
  desborda), controles táctiles en franja propia bajo el Canvas (cero solapes con escena
  y barra), aviso de colocación único en el dock (sin duplicados) y rejilla con
  `minmax(0,1fr)` para que la barra de trampas no ensanche la pantalla.
- **Correcciones encontradas por las pruebas**: el hook publicaba el estado conectado
  tarde y mezclaba publicaciones del mismo frame (cursor pisaba conexión); el test de
  doble toque usaba `context.close()` manual y colgaba al desaparecer el aviso.
- **Pruebas:** 7 unitarias de mando (`gamepad.test.ts`), 1 de navegador con mando virtual
  (cruceta + botón A + Start) y 5 geométricas táctiles (joystick, disparar, papelera y
  pausa dentro de pantalla, sin solapes con HUD ni barra, sin scroll de documento).
- Totales: **42 unitarias + 16 de navegador**, `tsc` limpio y `dist` verificado.

**No verificado aún:** mando físico real (solo virtual en Chromium), rendimiento 50–60 FPS
en teléfonos físicos, Safari/iOS y publicación en GitHub Pages (la URL aún da 404).

---

## Fase 14 — Rediseño completo del ratón inventor ✅

- `MouseInventor.tsx` se reconstruyó desde cero con una silueta animal cuadrúpeda: torso
  horizontal, grupa redonda, pecho pequeño, cabeza grande y hocico cónico terminado en
  nariz oscura.
- Dos orejas grandes circulares con interior rosado, ojos laterales con brillo, cuatro
  bigotes finos y dos incisivos cortos hacen reconocible la cara incluso desde cámara
  isométrica.
- Cuatro patas cortas y separadas, con pies rosados y animación alternada de marcha.
- **Una única cola** rosada, larga, cónica y continua: cinco cilindros conectados entre
  seis puntos, con una sola raíz y un solo extremo. Ya no existen las dos piezas cortas
  que parecían colas separadas.
- Mochila compacta, herramientas y vincha con lámpara conservan la identidad de inventor
  sin competir con la anatomía. El cono de luz se redujo al 6% de opacidad para no ocultar
  la cabeza ni el cuerpo.
- Animaciones nuevas de respiración, caminata, orejas, patas, cabeza, cola, celebración y
  preocupación; escala visual aumentada 25% para mejorar lectura en la sala táctica.
- El zoom libre del Laboratorio deja de ser sobrescrito por la cámara cada frame, lo que
  permite acercarse al modelo con la rueda.
- Verificado con inspección WebGL aislada, `tsc --noEmit`, 42 pruebas y build de producción.

---

## Fase 15 — Auditoría de botones, teclado y remates ✅

Se revisaron los **47 botones** de la interfaz uno a uno y se corrigieron siete defectos
reales que las pruebas anteriores no cubrían:

**Botones que no respondían o confundían**
- «Retirar» y la papelera táctil **no hacían nada** si no había casilla apuntada. Ahora
  `removeHovered()` explica qué falta en lugar de quedarse mudo.
- Dos botones distintos se llamaban «Reiniciar» (partida y sala). Renombrados a
  «Reiniciar la partida desde el principio» y «Vaciar sala» / «Vaciar la habitación».
- «Retirar» carecía de `aria-label`; sólo tenía `title`.
- «Reiniciar» y «Salir» descartaban la partida **sin confirmar**: ahora piden confirmación
  con opción de «Seguir jugando».

**Accesibilidad de teclado (tres fallos WCAG)**
- `Tab` estaba interceptado con `preventDefault()` durante la partida: era una **trampa de
  teclado** que dejaba el HUD y la barra inalcanzables. Ya no se intercepta.
- `Enter` y `Espacio` globales se disparaban **además** del botón enfocado, provocando
  acciones duplicadas. Ahora se ignoran si el foco está en un control.
- `Escape` no cerraba la nueva confirmación; ahora la cierra sin abrir la pausa.

**Contenido declarado pero nunca visible o mal usado**
- `PAD_LEGEND` existía en el código pero **no se mostraba en ninguna pantalla**: quien
  jugaba con mando no tenía forma de conocer los controles. Añadida en el menú como panel
  desplegable «Mando compatible».
- El sonido `coin` se reproducía **dos veces** por evento. Corregido.
- El sonido `chain`, ya sintetizado, nunca sonaba. Ahora remata los finishers, y `coin`
  acompaña al bonus de cercanía.

**Cobertura añadida:** `e2e/buttons.spec.ts` (14 casos) y `e2e/keyboard.spec.ts` (4 casos)
verifican nombre accesible y área táctil de cada botón, las tres categorías de trampas,
los conmutadores de pausa, el volumen, las confirmaciones y la navegación con teclado.

Totales actuales: **42 unitarias + 34 de navegador**, `tsc` limpio y `dist` verificado.

---

## Fase 16 — Colisiones reales y legibilidad móvil ✅

### Colisiones con el entorno

La "colisión" del ratón era un empuje suave de 2,2 u/s cuando el personaje se mueve a
4,1–6,0 u/s: **entraba en el mueble más rápido de lo que salía de él**, por eso lo
atravesaba. Además no comprobaba el destino antes de mover y, en el centro exacto de la
celda, `Math.sign()` devolvía 0 y no empujaba nada.

Se sustituyó por resolución **círculo-contra-caja (AABB)** con deslizamiento por el eje de
mínima penetración (`resolveObstacles`): el personaje rodea el mueble en lugar de pegarse a
él. Los obstáculos se calculan una vez por mundo en coordenadas de mundo a partir de
`BLOCKED_CELLS` y la quesera.

Los gatos usaban otro empuje suave (`pushOutOfFurniture`, eliminado) y ahora comparten el
mismo resolvedor con radio proporcional a su tamaño. Se comprobó que el desplazamiento
máximo por paso fijo (0,12 u) es menor que el radio de colisión, así que no hay
tunelamiento.

### Legibilidad y distribución en móvil

Se midió con una auditoría automática del DOM (tamaños de fuente reales, áreas táctiles,
solapes y desbordes) en cuatro perfiles: 390×844, 844×390, 360×640 y el menú.

Defectos encontrados y corregidos:

- **8 solapes entre botones** en 360×640: el Laboratorio usaba la barra completa en móvil
  vertical y desbordaba sobre las pestañas Suelo/Pared/Techo. Ahora usa la variante compacta.
- **14 textos por debajo de 10 px** ("MOVER" a 8 px, etiquetas del HUD a 8 px, nombres de
  gatos y metadatos de trampas a 9 px). Todos subidos a 10–13 px.
- **Hasta 12 botones de 26–28 px de alto**. Se añadió `min-height: 34px` global para botones
  y se aumentó el relleno de pestañas, selects y acciones del Laboratorio.
- **1 aviso truncado** con elipsis; ahora admite dos líneas.
- `rk-label` subió de 8 px a 10 px, la barra de quesera ganó grosor y contraste.

Resultado de la auditoría tras los cambios: **0 textos < 10 px, 0 botones < 30 px,
0 solapes, 0 truncados y 0 desbordes** en los cuatro perfiles.

### Cobertura añadida

- 5 pruebas unitarias de colisión (`logic.test.ts`): no atravesar ningún mueble en
  trayectorias diagonales, no entrar en la quesera, deslizarse por el borde en vez de
  quedarse clavado, expulsión de gatos clavados dentro de un mueble y ausencia de
  tunelamiento por paso.
- `e2e/collision.spec.ts` (2 casos en Chromium): recorrido real con teclado cruzando
  estanterías y comprobación de límites de sala.

Totales: **47 unitarias + 41 de navegador**, `tsc` limpio y `dist` verificado.

---

## Fase 17 — Diseño de nivel, texturas y distribución ✅

### Sala más amplia y jugable

La habitación pasó de **9×7 celdas (10,8 × 8,4 u)** a **11×9 (13,2 × 10,8 u)**: unos dos
metros más en cada eje, un 57 % más de superficie. Los muebles se redistribuyeron para
crear embudos aprovechables con trampas en vez de obstáculos sueltos: barrera norte, dos
costados y un embudo frente a la puerta, más dos piezas en esquina que rompen la simetría.

El reparto se validó antes de escribirlo: las **tres entradas quedan a 5 pasos** de la
quesera (ninguna es el atajo obvio), las 87 casillas transitables son alcanzables y el
anillo de 8 casillas alrededor de la quesera está despejado para poder defenderla.

### Texturas mal colocadas

Tres defectos reales, medidos antes y después:

| Defecto | Antes | Ahora |
|---|---|---|
| Papel pintado estirado en la pared del fondo | aspecto **2,01** | 1,05 |
| Escala distinta entre pared de fondo y laterales | **+21 %** | +4 % |
| Juntas del suelo desalineadas de la rejilla | no casaban | **1 tabla = 1 casilla** |

La causa era que las repeticiones estaban horneadas en la textura (`repeat` fijo de 4×2 y
6×5) y las tres paredes compartían un único material. Ahora `tiled()` clona la textura y
calcula la repetición a partir del **tamaño real de la superficie**, así la baldosa mide lo
mismo en unidades de mundo en toda la sala. El suelo usa una tabla por celda, de modo que
las juntas marcan la rejilla de juego y se ve a simple vista qué casilla se apunta.

### Muebles: una sola fuente de verdad

`BLOCKED_CELLS` (colisión) y la lista `furniture` de `Room.tsx` (modelos) eran **dos listas
separadas que había que mantener sincronizadas a mano**: en cuanto divergieran aparecerían
muros invisibles o muebles atravesables. Ahora existe `FURNITURE` en `constants.ts` con la
posición y el tipo de cada pieza, y de ahí salen tanto las cajas de colisión como los
modelos visibles.

### Distribución de elementos visibles

- El encuadre de cámara dejó de ser cuatro números mágicos ajustados a la sala vieja: se
  deriva de `ROOM_ISO_W` / `ROOM_ISO_H`, así que si la sala cambia de tamaño el encuadre la
  sigue solo.
- Columnas de escritorio más ajustadas: la escena pasó de **608 px a 698 px** de ancho
  (+15 %), que es donde ocurre el juego.
- Vigas del techo repartidas proporcionalmente al ancho en lugar de tres posiciones fijas.
- La alfombra pasó de tres cuadros sueltos a rodear la quesera, señalando la zona a defender.
- El cursor del mando nace sobre la quesera, no en una celda fija que ya no era el centro.

### Cobertura añadida

8 pruebas nuevas que fijan el diseño: amplitud mínima de sala, ausencia de zonas aisladas y
≥80 % de suelo jugable, entradas en borde y equilibradas (±3 pasos), muebles sin duplicar ni
pisar la quesera, anillo libre alrededor de la guarida, encuadre que reserva sitio para las
paredes, juntas del suelo sobre la rejilla y proporción del papel en las tres paredes.

Además, los tests que fijaban coordenadas a mano ahora derivan de las constantes, así que un
rediseño futuro no los rompe por motivos falsos.

Totales: **55 unitarias + 41 de navegador**, `tsc` limpio y `dist` verificado.

---

## Fase 18 — Catálogo de salas ✅

El juego pasó de una sola habitación a **cuatro salas seleccionables**, cada una con su
reparto de muebles, sus entradas, su punto a defender y su paleta.

| Sala | Dificultad | Qué la hace distinta |
|---|---|---|
| Salón de la mansión | 1 | Guarida central, tres rutas de 5 pasos exactos |
| Cocina de azulejos | 2 | Guarida arrinconada, isla central que parte la sala en dos pasillos |
| Desván polvoriento | 2 | Centro despejado y trastos en las esquinas: carriles largos |
| Bodega de columnas | 3 | Guarida al fondo, bosque de barricas y rutas de 10–11 pasos |

### Cómo está montado

`src/game/maps.ts` define cada sala como dato: `lair`, `furniture`, `entries`, `rugs` y un
`theme` con los tintes de pared, suelo, niebla y luces. Las constantes de layout salieron de
`constants.ts`, que ahora sólo guarda lo común (rejilla y escalas).

La lógica dejó de depender de un layout global: `blockedWalkMask`, `lairGoalMask`,
`isLairCell`, `isFurnitureCell` y `validatePlacement` **reciben el mapa como parámetro**, así
que siguen siendo funciones puras y testeables con cualquier sala. `World` guarda su mapa y
de ahí salen colisiones, pathfinding, apariciones y la guarida.

La rejilla sigue siendo 11×9 en todas: la aritmética de índices y el encoding de `Target`
dependen de ella, y variarla habría obligado a hilar el mapa por una veintena de firmas sin
aportar tanto como cambiar el reparto. Lo digo por claridad: **las salas cambian en trazado y
aspecto, no en tamaño**.

### Interfaz

- Selector en el menú con **plano en miniatura** generado del propio mapa (muebles en gris,
  entradas en rosa, guarida en amarillo), nombre, dificultad y descripción.
- El briefing muestra la sala elegida con una **pista táctica propia** de ese trazado.
- La sala elegida se **guarda entre sesiones**; si el mapa guardado no existe, vuelve al
  clásico en vez de romper.
- El Laboratorio lista las entradas de la sala activa, no unas fijas.

### Validación

Cada diseño se comprobó **antes de escribirlo** con un script de conectividad, y ahora 8
pruebas lo fijan **para los cuatro mapas a la vez**: sin zonas aisladas, ≥70 % de suelo
jugable, entradas en borde que llegan a la guarida con rutas equilibradas (±4 pasos),
muebles sin duplicar ni pisar la guarida ni las entradas, guarida con al menos 4 accesos,
paletas válidas y suelos distintos, trazados distintos entre sí, mapa desconocido con
respaldo, y una ronda completa jugable en cada sala (aparición, avance y colocación).

En navegador, `e2e/maps.spec.ts` recorre las cuatro: carga, briefing, colocación real de
trampa, persistencia de la elección y que dos salas distintas no rendericen igual.

Totales: **63 unitarias + 48 de navegador**, `tsc` limpio y `dist` verificado.

---

## Fase 19 — Tutorial guiado ✅

### Diseño

Un tutorial de **12 pasos que se completan haciendo la acción**, no leyendo: bienvenida,
moverse, elegir trampa, colocar en suelo, pared y techo, atrapar un gato, encadenar combo,
disparar una manual, retirar, pausar y cierre. Corre sobre una partida con reglas de
Laboratorio (sin reloj ni daño) en el Salón y suelta gatos de práctica sólo en los pasos que
los necesitan.

`src/game/tutorial.ts` es puro: el motor toma una instantánea del juego al entrar en cada
paso (`snapshotOf`) y avanza cuando la instantánea actual cumple la condición
(`stepComplete`). Cada paso tiene **textos distintos para teclado, táctil y mando**, elegidos
según cómo se esté jugando. La sugerencia automática de trampa sólo se usa en combo y disparo
manual: en pared y techo se deja que el jugador cambie de categoría, que es justo lo que se
enseña.

La tarjeta vive **en el flujo del layout** (el hueco del panel de Laboratorio), nunca flotando
sobre la escena. En móvil usa una variante compacta de cabecera única para que, incluso a
360×640, la escena conserve altura jugable. El menú lo marca como «Recomendado» hasta
completarlo y como «Completado» después; el estado se guarda en el progreso.

### Bugs heredados que destapó

Escribir la prueba que recorre el tutorial completo con un mundo real sacó a la luz dos fallos
que venían de la ampliación de la sala (fase 17) y que ninguna prueba anterior cubría:

- **Disparo manual con alcance fijo de 9 u.** En la sala de 13,2 × 10,8 un cañón de la pared
  del fondo quedaba fuera de alcance desde la parte delantera (9,43 u), con el mensaje
  engañoso «Ninguna trampa manual lista». Ahora dispara la manual lista más cercana esté donde
  esté, y el aviso distingue entre «coloca primero una» y «se está recargando».
- **El inventor nacía en una posición fija de la sala antigua.** En el Salón actual quedaba
  pegado a la barrera sur, y en Cocina o Bodega aparecía lejos de su guarida. Ahora nace en la
  casilla libre más cercana a la guarida de cada mapa, con holgura para caminar en las cuatro
  direcciones.

### Cobertura añadida

- `tutorial.test.ts` (7 casos): definición completa, textos de control distintos por
  dispositivo, cobertura de todas las mecánicas, ningún paso se completa sin hacer nada, los
  informativos sólo avanzan con el botón, y **un recorrido de los 12 pasos con un mundo real**
  ejecutando cada acción.
- 3 regresiones en `logic.test.ts`: disparo desde el extremo opuesto, aviso de manual, y
  aparición libre y móvil en las cuatro salas.
- `e2e/tutorial.spec.ts` (7 casos en Chromium): recomendación en el menú, avance automático al
  caminar y al elegir trampa, salto hasta el final con persistencia de «Completado», paso a la
  Supervivencia, y en 390×844, 360×640 y 844×390 que la tarjeta no tape escena, joystick,
  disparo ni barra.
- La auditoría de legibilidad móvil incluye ahora tres vistas del tutorial: 0 defectos.

Totales: **73 unitarias + 55 de navegador**, `tsc` limpio y `dist` verificado.

---

## Fase 20 — Estructura del HUD ✅

### Problema detectado

Pausa, audio y música compartían el **mismo flujo `flex-wrap` que los indicadores**. Cuando
las fichas saltaban de línea, arrastraban el grupo de botones consigo: quedaban a media
pantalla (`y=116` en móvil apaisado, `y=120` en tablet) en vez de anclados a una esquina, y
en móvil vertical el botón de música ni siquiera se renderizaba.

### Nueva estructura

El HUD se divide en dos zonas con comportamiento independiente:

```
┌───────────────────────────────────────────────┬────────────┐
│ ZONA ESTADO (puede saltar de línea)            │ ZONA       │
│  MISIÓN    quesera · tiempo · oleada · inventor│ SISTEMA    │
│  MARCADOR  puntos · combo                      │ shrink-0   │
│  TALLER    queso · trampas                     │ self-start │
└───────────────────────────────────────────────┴────────────┘
```

- **Zona de sistema** (`role="group"`, `aria-label="Controles de sistema"`): `shrink-0
  self-start`, fuera del `flex-wrap`. Siempre arriba a la derecha, en el mismo orden
  (pausa · divisor · efectos · música), con divisor de grupo y estado `aria-pressed`.
  Al pausar se atenúa con `aria-disabled` en vez de mostrar un «Reanudar» muerto bajo el
  modal, que es quien realmente reanuda.
- **Indicadores agrupados por función** en vez de una fila plana de fichas equivalentes:
  Misión (qué defiendes y cuánto queda), Marcador (cómo va la partida) y Taller (qué puedes
  gastar). Las etiquetas de grupo y los divisores aparecen por container query a partir de
  900 px; en móvil se omiten pero se conserva el orden.
- El contador de trampas pasa a ser un indicador permanente del grupo Taller (con borde de
  aviso al llegar al tope), sustituyendo al chip transitorio «TRAMPAS LLENAS».
- Se eliminó la duplicación con el panel lateral: allí se mostraba `trampas x/y`, que ahora
  vive junto al queso, donde se decide gastar. El panel lateral muestra el nombre de la sala.
- El distintivo de mando conectado se integra en el dock, separado por divisor.

### Verificación

Sonda geométrica sobre seis perfiles (1280×820, 1600×900, 1024×768, 390×844, 360×640,
844×390) que comprueba que los tres botones comparten fila, van en orden izquierda→derecha,
el dock toca el borde derecho del Canvas (≤26 px), no queda descolgado (≤30 px desde arriba),
respeta el tamaño táctil mínimo y no produce desborde horizontal. Los seis perfiles pasan;
en móvil vertical el dock mide 133×48 con los tres botones, frente a los dos anteriores.

Regresión completa: 73 unitarias, 50 de navegador (botones, juego, colisión, teclado, mapas,
tutorial) y auditoría de legibilidad móvil en 7 vistas sin defectos. `tsc` limpio y `dist`
verificado.

---

## Ideas para siguientes iteraciones

- [x] Soporte de mando (Gamepad API) para escritorio y Android TV.
- [x] Modelo del ratón rehecho de 0: cabeza grande y alargada, orejas grandes redondas con interior rosado, nariz y bigotes, cuerpo pequeño, 4 patitas, brazos, una sola cola larga y delgada, vincha con linterna y mochila de herramientas. Todo con primitivas Three.js low-poly y animaciones propias (idle, caminar, celebración, preocupación, derrota).
- [ ] Segunda sala con muebles distintos y selección de escenarios.
- [ ] Reto diario/semanal con semilla fija.
- [ ] Trampas combinables (arrastrar una trampa sobre otra para fusionarlas).
- [ ] Migración del guardado a IndexedDB (la interfaz ya está aislada en `storage.ts`).
