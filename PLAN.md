# Plan de implementacion: Raton: Zombie Cat Trap

**Nombre tecnico:** Raton-Kagero  
**Repositorio:** `CoipoNorte/Raton-Kagero`  
**URL prevista:** https://coiponorte.github.io/Raton-Kagero/  
**Estado:** plan de trabajo; las fases de implementacion siguen pendientes.

## Objetivo

Construir por incrementos un juego web 3D completo, original y jugable. Cada fase debe dejar el proyecto en un estado que compile y pueda seguir desarrollandose. Primero se asegura un ciclo jugable sencillo; despues se amplian trampas, enemigos, modos, arte y opciones. No se esperaran modelos, musica, servicios o archivos externos: los recursos seran procedurales y el audio se sintetizara en el navegador.

## Como trabajar con este plan

- Completar las fases en orden, salvo las tareas de documentacion que puedan adelantarse sin cambiar la arquitectura.
- Al iniciar una fase, implementar solo su alcance y mantener funcional lo ya construido.
- Cerrar cada fase con `npx tsc --noEmit`, `npm run build` y las pruebas de salida indicadas.
- Si una dependencia opcional o un efecto visual bloquea el avance, reemplazarlo por una solucion sencilla con las primitivas ya disponibles y continuar.
- No dejar una pantalla vacia ante un problema de WebGL, audio, almacenamiento o permiso del navegador; cada sistema debe tener un fallback.
- Al entregar una fase, indicar archivos principales, verificaciones ejecutadas, limitaciones pendientes y la siguiente fase recomendada.
- No dar por validada una prueba manual que no se haya ejecutado realmente.

## Estado inicial del repositorio

- El proyecto ya usa React 19, TypeScript estricto, Vite 7 y Tailwind CSS 4.
- `src/App.tsx` todavia contiene la pantalla generica del starter.
- `src/main.tsx` monta la aplicacion dentro de `StrictMode`.
- `index.html` conserva el titulo y el idioma genericos.
- `vite.config.ts` incluye `vite-plugin-singlefile`; se revisara y se retirara si interfiere con la salida normal de Vite y GitHub Pages.
- Aun no existen el motor del juego, la escena 3D, las pruebas, el icono ni los archivos de despliegue.

## Criterio global de completitud

El proyecto se considera completo cuando cumple todos estos puntos:

- Se puede iniciar una partida, jugar, pausar, terminarla, ver el resumen y volver a jugar.
- Supervivencia dura 90 segundos como maximo y tambien termina si la guarida pierde toda su vida.
- Laboratorio permite practicar sin reloj ni efectos sobre el record.
- Las tres superficies aceptan trampas mediante una vista previa valida/invalida; las 16 trampas solicitadas tienen un comportamiento funcional, no solo un icono.
- Los gatos se mueven, reciben impactos, son empujados o aturdidos, pueden encadenar trampas y atacan la guarida si llegan a ella.
- La simulacion no depende de la frecuencia de renderizado ni avanza en segundo plano al cambiar de pestana.
- Controles de teclado, raton y tactiles tienen objetivos accesibles y no compiten por los mismos gestos.
- Se guardan record, maximo combo, quesos y preferencias con fallback si `localStorage` no esta disponible.
- Se informa claramente si el navegador no soporta WebGL.
- Se verifica la matriz responsive solicitada y no hay solapamientos criticos ni controles fuera de pantalla.
- `npx tsc --noEmit` y `npm run build` finalizan correctamente.
- La compilacion usa la base `/Raton-Kagero/` y puede publicarse en la URL de GitHub Pages indicada.

## Fases

### Fase 0 - Planificacion y cortes de alcance (completada)

**Objetivo:** dividir la solicitud grande en entregas pequenas y verificables.

- [x] Crear este plan con dependencias, criterios de salida y estrategia para resolver bloqueos.
- [x] Definir un primer corte jugable antes de implementar todos los contenidos: habitacion, movimiento, una trampa por superficie, un gato, dano a la guarida, puntuacion y reinicio.
- [x] Mantener los recursos visuales y de audio originales, sin modelos, nombres, musica ni interfaces protegidas de otras franquicias.

**Salida:** `PLAN.md` es el documento de seguimiento de las siguientes fases.

### Fase 1 - Base tecnica y compilacion continua

**Objetivo:** preparar el scaffold para el juego sin introducir errores de dependencias.

- [ ] Revisar las versiones instaladas y consultar la documentacion oficial de React Three Fiber y Drei para confirmar compatibilidad con React 19 y Vite 7 antes de instalar.
- [ ] Instalar `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion` y `lucide-react` mediante npm.
- [ ] Instalar `vitest` como herramienta de pruebas de logica. Agregar tipos de Three.js solo si el compilador los necesita.
- [ ] Cambiar el nombre del paquete a `raton-kagero`, conservar `private: true` y mantener TypeScript en modo estricto.
- [ ] Crear scripts de desarrollo, build, preview y pruebas sin borrar las dependencias utiles del scaffold.
- [ ] Revisar el plugin `vite-plugin-singlefile`; preferir una salida estandar de Vite si el plugin complica assets, `.nojekyll` o Pages.
- [ ] Comprobar que `npm run dev`, `npx tsc --noEmit` y `npm run build` funcionan antes de comenzar el juego.

**Criterio de salida:** el proyecto instala dependencias de forma reproducible y compila con el scaffold aun intacto.

### Fase 2 - Dominio, tipos y motor determinista

**Objetivo:** separar las reglas del juego de React y del render 3D para poder probarlas sin abrir el Canvas.

- [ ] Crear `src/game/types.ts` para modos, estados de partida, categorias/superficies, trampas, enemigos, casillas, eventos y ajustes.
- [ ] Crear `src/game/constants.ts` para duracion, vida, limites, velocidades, costes, cooldowns y valores de puntuacion.
- [ ] Crear `src/game/random.ts` con aleatoriedad controlable por semilla para oleadas y variaciones visuales reproducibles durante pruebas.
- [ ] Crear `src/game/traps.ts` y `src/game/enemies.ts` con definiciones de datos; no incluir reglas de React ni JSX.
- [ ] Crear `src/game/logic.ts` con funciones puras para validar colocacion, costes, puntuacion, combos y fin de partida.
- [ ] Crear `src/game/simulation.ts` con el avance fijo de la simulacion, acumulador, limite de pasos atrasados y eventos del juego.
- [ ] Definir identificadores estables para enemigos y trampas y registrar que trampa ya impacto a cada enemigo durante el impacto actual.
- [ ] Agregar pruebas unitarias para reglas puras desde el inicio, incluyendo posiciones invalidas, costes insuficientes, cooldowns y calculo de combo.

**Criterio de salida:** las reglas esenciales se pueden probar sin Three.js; no hay `any` para silenciar TypeScript.

### Fase 3 - Identidad, pantallas y layout base

**Objetivo:** reemplazar el starter por el flujo visual del juego y definir una estructura responsive desde el principio.

- [ ] Convertir el documento a `lang="es"`, establecer el titulo de pagina `Raton vs Zombie Cats 3D` y configurar el viewport para movil.
- [ ] Crear `src/hooks/useLayout.ts` para medir ancho/alto, orientacion, lado menor, safe areas, perfil mobile/tablet/desktop y landscape de poca altura.
- [ ] Clasificar como desktop una pantalla ancha (por ejemplo, ancho de 1200 px o mas con altura comoda), no un monitor 1600x900 como tablet por su lado menor.
- [ ] Crear la estructura de `App`, pantalla de inicio, seleccion de modo, preparacion, partida, pausa y resumen mediante estado interno, sin router innecesario.
- [ ] Diseñar la portada alrededor del nombre `Raton: Zombie Cat Trap`; el nombre y la silueta de la mascota deben identificar el juego sin depender de la navegacion.
- [ ] Definir paleta retro legible, tipografia, botones, estados de foco y estilos base; reservar tarjetas para controles que realmente necesiten un contenedor interactivo.
- [ ] Crear el splash inicial dentro de `#root` con el texto `Cargando poligonos PS1...` para evitar una pantalla blanca mientras monta React.
- [ ] Incorporar consultas de contenedor para adaptar nombres de trampas, HUD y paneles al espacio disponible.

**Criterio de salida:** se puede navegar por las pantallas iniciales y el layout responde a cambios de viewport, aunque la escena siga en construccion.

### Fase 4 - Canvas 3D, habitacion y mascota

**Objetivo:** tener una escena estable, legible y original que sirva de base al juego.

- [ ] Crear `src/game/components/Canvas3D.tsx` y montar un solo Canvas de React Three Fiber con camara casi fija isometrica/tactica.
- [ ] Adaptar el encuadre al rectangulo real del Canvas y a la orientacion; no usar dimensiones de `window` para raycasts ni asumir un aspect ratio fijo.
- [ ] Crear `Room.tsx` mediante primitivas: suelo cuadriculado sutil, paredes, puertas, ventanas, conductos, muebles, zonas de entrada y quesera/guarida.
- [ ] Crear `MouseInventor.tsx` con geometria low-poly propia: orejas, vincha, linterna, mochila, cola angular y una animacion idle sencilla.
- [ ] Aplicar colores limitados, materiales economicos y niebla ambiental; usar geometria y texturas procedurales en vez de archivos externos pesados.
- [ ] Configurar antialias y DPR adaptativos; empezar con sombras desactivadas o limitadas para no penalizar moviles.
- [ ] Detectar WebGL no disponible y perdida/restauracion de contexto; presentar un mensaje accionable en la UI, nunca dejar el Canvas negro sin explicacion.
- [ ] Limpiar listeners y recursos propios al desmontar; verificar el montaje doble de `StrictMode`.

**Criterio de salida:** la habitacion y el raton se ven en una escena interactiva y el Canvas se desmonta/remonta sin duplicar sistemas.

### Fase 5 - Bucle, movimiento, gatos y oleadas

**Objetivo:** construir el primer recorrido completo de un enemigo por la habitacion.

- [ ] Implementar `src/hooks/useGameEngine.ts` usando referencias para el estado de alta frecuencia y `useFrame` para avanzar/sincronizar entidades.
- [ ] Usar un timestep fijo, limitar el delta al regresar de una pestana y pausar por `visibilitychange`; no usar `setInterval` para mover entidades.
- [ ] Actualizar el HUD aproximadamente 5-10 veces por segundo, nunca desde cada frame.
- [ ] Implementar movimiento del raton con WASD/flechas y correr con Shift; impedir que el raton atraviese paredes o muebles importantes.
- [ ] Crear `ZombieCat.tsx` con un gato comun procedural, animacion torpe, ojos brillantes, impacto, empuje, aturdimiento y salida cartoon mediante humo/particulas.
- [ ] Hacer que los gatos entren por puertas, ventanas o conductos y sigan waypoints o una cuadrilla con busqueda ligera; evitar NavMesh si no aporta valor.
- [ ] Recalcular su objetivo tras un empuje y permitir que reanuden la ruta despues de un aturdimiento.
- [ ] Implementar objetivo de guarida, vida, ataque al llegar y dano visible.
- [ ] Crear el generador de oleadas para Supervivencia, con dificultad gradual y un limite de enemigos simultaneos adecuado a moviles.
- [ ] Probar pausa de simulacion al ocultar la pestana, sin acumulacion de oleadas al volver.

**Criterio de salida:** se inicia una partida de prueba, el gato recorre la habitacion, alcanza la guarida si no se le detiene y el HUD refleja tiempo y vida.

### Fase 6 - Seleccion y colocacion de trampas (primer corte jugable)

**Objetivo:** permitir seleccionar, previsualizar, colocar y cancelar trampas en las tres superficies.

- [ ] Crear `TrapBar.tsx` con tabs Suelo, Pared y Techo y una lista desplazable de opciones.
- [ ] Empezar con una trampa funcional por categoria: cascara de platano, guante de resorte y yunque; completar el resto del catalogo en la fase siguiente.
- [ ] Crear una cuadrilla logica invisible o semivisible y definir reglas distintas para anclas de suelo, pared y techo.
- [ ] Implementar `TrapPreview.tsx` con vista fantasma verde para una ubicacion valida y roja para una invalida; indicar alcance, direccion y vector de empuje.
- [ ] Hacer raycast solo sobre objetos de interaccion, convirtiendo el puntero a NDC con el `getBoundingClientRect()` del Canvas.
- [ ] Ignorar HUD y decoracion en el raycast. Los controles DOM deben parar propagacion de eventos y no bloquear la escena mediante overlays invisibles.
- [ ] Usar tap/clic para apuntar y confirmar, con segundo tap cuando corresponda; Escape/boton dedicado cancela la colocacion.
- [ ] Rechazar casillas bloqueadas, incompatibles o fuera de la superficie. No permitir mas de una trampa incompatible por casilla.
- [ ] Descontar queso/energia solo despues de confirmar; limitar trampas activas y establecer tiempo de armado/cooldown.
- [ ] Permitir eliminar o mover trampas durante preparacion, antes de cerrar las reglas de oleada.
- [ ] Hacer que el carrusel admita rueda, arrastre de raton, scroll tactil con inercia y scroll snap sin enviar esos gestos al Canvas.

**Criterio de salida:** se puede colocar una trampa de cada superficie, se rechazan ubicaciones incorrectas y al menos una trampa impacta al gato. Este es el primer corte realmente jugable.

### Fase 7 - Catalogo completo, activaciones y combos

**Objetivo:** convertir la colocacion basica en un sistema de cadenas legible y rejugable.

- [ ] Implementar las seis trampas de suelo: trampa de oso de juguete, cascara de platano, pegamento para gatos zombis, muelle exprimidor, tabla basculante y caja sorpresa con resorte.
- [ ] Implementar las cinco trampas de pared: lanzador de dardos de queso, ventilador gigante, guante de boxeo con resorte, estanteria que cae y canon de corchos.
- [ ] Implementar las cinco trampas de techo: yunque de hierro, macetero pesado, lampara de arana, bola de boliche y cubeta metalica.
- [ ] Dar a cada trampa silueta, icono, color, tipo de instalacion, coste, alcance, direccion, tiempo de armado, cooldown y efecto mecanico propios.
- [ ] Representar estados inactiva, armando, lista, activada, cooldown y agotada/destruida; admitir activaciones automaticas, temporizadas, manuales y encadenadas segun el diseño de cada trampa.
- [ ] Aplicar impulso, friccion, gravedad, masa, rebote y aturdimiento arcade con colisiones simples y resultado estable.
- [ ] Garantizar que una trampa no procese repetidamente el mismo impacto sobre el mismo enemigo en un mismo evento/frame.
- [ ] Asociar combo al identificador del enemigo: primer golpe x1, segundo x2, tercero x3 y cuarto o mas x5; ventana de encadenamiento aproximada de 2,5 segundos.
- [ ] Calcular puntos base, multiplicador, variedad, golpe ambiental, repeticion, finisher y bonus de proteccion mediante funciones puras.
- [ ] Mostrar armado, cooldown, radio, trayectoria, direccion y posibilidad de activacion manual sin depender solo del color.
- [ ] Probar cadenas reales, incluyendo cascara -> pegamento -> guante -> yunque y cadenas interrumpidas por tiempo o salida del area.

**Criterio de salida:** las 16 trampas producen un efecto jugable y una cadena sobre el mismo gato permite alcanzar x3 y x5 con puntuacion verificable.

### Fase 8 - Modos, estados de partida y resumen

**Objetivo:** cerrar el bucle de juego y hacer que cada modo tenga reglas y resultados propios.

- [ ] Completar Supervivencia rapida: preparacion breve, 90 segundos, oleadas continuas, dificultad creciente, limite de combo x5, vida de la guarida, puntos, quesos y fin por tiempo o vida cero.
- [ ] Completar Laboratorio: sin reloj ni oleadas obligatorias, generacion de uno o varios gatos, colocacion libre, reinicio de habitacion y visualizacion opcional de trayectorias.
- [ ] Asegurar que el Laboratorio no cambia el record, el maximo combo ni las recompensas de Supervivencia.
- [ ] Crear una maquina de estados explicita para menu, seleccion, preparacion, jugando, pausado y game over; ignorar acciones invalidas en cada estado.
- [ ] Crear `PauseMenu.tsx`: continuar, reiniciar, volver al menu, audio, calidad, screen shake y VHS.
- [ ] Conectar Escape/P a pausa/reanudacion, sin capturar teclas mientras el usuario escribe en un control de formulario.
- [ ] Crear `GameOverScreen.tsx` con puntos, combo maximo, queso obtenido, motivo de fin, record nuevo y botones de reintento/menu.
- [ ] Al reiniciar, borrar entidades, eventos y cooldowns anteriores sin duplicar oleadas, oyentes, RAF o timers.

**Criterio de salida:** ambos modos se pueden completar, pausar y reiniciar sin conservar estado incorrecto entre partidas.

### Fase 9 - Feedback, audio y estetica retro

**Objetivo:** dar presencia y humor a la accion sin ocultar el juego ni degradar rendimiento.

- [ ] Crear efectos ligeros para resorte, golpe, caida, rebote, humo, estrellas y poligonos cartoon, preferentemente con pool limitado.
- [ ] Mostrar textos breves integrados en la escena: `BOING!`, `CRUNCH!`, `WHAM!`, `COMBO x3!`, `CHEESE BONUS!` y `TRAP CHAIN!`; ubicarlos sin tapar enemigos ni HUD.
- [ ] Implementar screen shake moderado, flash de dano y marcadores de trayectoria; respetar `prefers-reduced-motion` y los ajustes del jugador.
- [ ] Aplicar scanlines, ruido VHS sutil y distorsion cromatica opcional en CSS, con `pointer-events: none`; reducirlos en calidad baja y bajo movimiento reducido.
- [ ] Usar niebla, iluminacion calida/verdosa, dithering visual si es economico y texturas pequenas/procedurales con `NearestFilter` cuando sean utiles.
- [ ] Crear `src/game/sound.ts` con un unico AudioContext compartido, creado/desbloqueado solo tras gesto real del usuario.
- [ ] Sintetizar con WebAudio los efectos solicitados: maullidos, resorte, ventilador, dardo, guante, metal, yunque, resbalon, explosion cartoon, dano a guarida, combo, fin y record.
- [ ] Implementar musica retro opcional con volumen separado de efectos, silencio total y limpieza/pausa al suspender el juego.
- [ ] Asegurar que la falta de permiso, AudioContext o salida de audio no detenga el juego.

**Criterio de salida:** las acciones importantes tienen feedback audible/visual, el sonido se inicia tras interaccion y no hay AudioContext ni efectos duplicados en `StrictMode`.

### Fase 10 - Persistencia, desbloqueos y ajustes

**Objetivo:** conservar progreso y preferencias de forma segura y versionable.

- [ ] Crear `src/game/storage.ts` como unico acceso de la aplicacion al almacenamiento del navegador.
- [ ] Guardar bajo claves versionadas: record, combo maximo, quesos acumulados, trampas desbloqueadas, sonido, musica, volumen, calidad, screen shake y efectos VHS.
- [ ] Capturar excepciones de lectura/escritura y usar fallback en memoria si `localStorage` falla o esta bloqueado.
- [ ] Validar y normalizar datos leidos; descartar valores corruptos y dejar una ruta clara para migrar a IndexedDB en el futuro.
- [ ] Actualizar el record unicamente tras una partida valida de Supervivencia; distinguir claramente monedas de queso de una puntuacion de laboratorio.
- [ ] Mostrar desbloqueos y opciones en pantallas compactas, guardando cambios sin interrumpir la simulacion.

**Criterio de salida:** preferencias y record sobreviven a recargar; modo privado/cuota/JSON corrupto no causa una excepcion visible ni bloquea el inicio.

### Fase 11 - Responsive, controles tactiles y accesibilidad

**Objetivo:** ajustar una misma experiencia a todos los formatos sin resolverlo con una unica regla de orientacion.

- [ ] Validar el layout en 390x844, 844x390, 768x1024, 1024x768, 1280x820 y 1600x900.
- [ ] En movil vertical, priorizar HUD flotante, Canvas superior/central, joystick separado y barra desplazable abajo; respetar `100dvh` y `env(safe-area-inset-bottom)`.
- [ ] En movil horizontal y landscape corto, conservar un Canvas amplio, paneles compactos y botones tactiles accesibles; ocultar solo informacion secundaria.
- [ ] En tablet vertical, usar Canvas amplio y panel inferior; en tablet horizontal, organizar estado, Canvas y trampas sin reducir la zona jugable.
- [ ] En escritorio, usar tres zonas tacticas (estado, Canvas, trampas), ancho maximo y Canvas sin deformacion en ultrawide.
- [ ] Crear joystick virtual con pointer capture y limpieza correcta; no permitir que su arrastre se convierta en raycast o scroll.
- [ ] Mantener botones manuales grandes y separados; respetar safe areas y evitar que joystick, barra o HUD se solapen.
- [ ] Revisar la barra en movil y desktop: tap, clic, scroll con inercia, arrastre, rueda, scroll snap, indicadores de contenido y scrollbar retro cuando corresponda.
- [ ] Usar nombres completos o tooltip; no truncar nombres de trampas con textos incompletos.
- [ ] Proporcionar `aria-label`, foco visible, contraste suficiente, formas/iconos ademas de color y controles de teclado.
- [ ] Asegurar que los overlays decorativos no reciban puntero y que ningun panel bloquee el raycast de casillas.
- [ ] Comprobar `prefers-reduced-motion`, reduccion de flashes, screen shake y VHS desde las opciones.

**Criterio de salida:** las seis resoluciones tienen Canvas util, controles visibles, sin desbordamientos ni solapamientos criticos; no se bloquea el scroll de menus ni la colocacion.

### Fase 12 - Calidad, limites y verificacion final

**Objetivo:** estabilizar rendimiento y demostrar las rutas principales antes de publicar.

- [ ] Implementar perfiles Bajo, Medio y Alto con DPR maximo aproximado 1, 1.25 y 1.5 respectivamente.
- [ ] En perfil bajo, desactivar sombras dinamicas y aberracion cromatica, reducir particulas y limitar enemigos; en medio/alto escalar moderadamente sombras y efectos.
- [ ] Agregar deteccion automatica inicial de calidad y permitir ajuste manual desde pausa; evitar cambios bruscos de calidad durante una partida.
- [ ] Reutilizar entidades/particulas frecuentes con pools; usar `InstancedMesh` para elementos repetidos cuando sea conveniente.
- [ ] Limitar materiales, luces, sombras, transparencias y geometria; revisar que los recursos creados se liberen al desmontar.
- [ ] Evitar `setState` en `useFrame`, timers sin cleanup, listeners duplicados, oleadas duplicadas y actualizaciones masivas por frame.
- [ ] Ejecutar pruebas unitarias de colocacion, costes, transiciones, cooldowns, oleadas, puntuacion, combos, fin por tiempo y fin por vida.
- [ ] Ejecutar pruebas manuales: colocar trampas de suelo/pared/techo; rechazar casilla invalida; activar manual y automaticamente; empujar un gato; encadenar dos trampas; llegar a x3; dañar guarida; terminar por reloj y por vida; pausar; cambiar de pestana; reiniciar; guardar record; recuperar ajustes.
- [ ] Inspeccionar consola y red: montaje del Canvas, ausencia de errores, ausencia de assets con rutas rotas y comportamiento de WebGL/contexto.
- [ ] Revisar las seis resoluciones de la matriz responsive, orientacion, safe areas, elementos fuera de viewport, textos, joystick, barra y raycasting.
- [ ] Ejecutar `npx tsc --noEmit` y `npm run build`; corregir todos los errores antes de considerar la fase cerrada.

**Criterio de salida:** todas las pruebas criticas tienen resultado registrado; cualquier limitacion residual esta descrita y no rompe el bucle principal.

### Fase 13 - Identidad final, README y GitHub Pages

**Objetivo:** dejar una entrega reconocible, documentada y publicable con rutas correctas en el subdirectorio de GitHub Pages.

- [ ] Crear `public/icon.svg` con una cabeza low-poly original del raton inventor y configurar el favicon.
- [ ] Confirmar el titulo exacto `Raton vs Zombie Cats 3D` y el splash `Cargando poligonos PS1...`.
- [ ] Usar `base: '/Raton-Kagero/'` en Vite; resolver assets propios con imports o `import.meta.env.BASE_URL`, nunca con rutas absolutas que empiecen por `/`.
- [ ] Crear `public/.nojekyll`.
- [ ] Asegurar en `package.json`: `name: "raton-kagero"`, `private: true`, `predeploy: "npm run build"` y `deploy: "gh-pages -d dist"`.
- [ ] Declarar React, ReactDOM, Three.js, React Three Fiber, Drei, Framer Motion y Lucide React en dependencias; declarar `gh-pages` en devDependencies.
- [ ] Crear `scripts/deploy-prepare.cjs` CommonJS usando `fs` y `path`, con acciones `package` y `vite`, y aceptar una raiz opcional para pruebas.
- [ ] Hacer que el helper sea idempotente, prepare/verifique `package.json`, `vite.config.ts` y `public/.nojekyll`, compruebe los resultados y termine con error claro y `process.exit(1)` ante fallos.
- [ ] Probar el helper contra una carpeta temporal de fixture, ejecutando cada accion mas de una vez y confirmando que no corrompe archivos.
- [ ] Crear `deploy.bat` para Windows con `setlocal DisableDelayedExpansion`; llamar al helper con `node scripts/deploy-prepare.cjs package` y `node scripts/deploy-prepare.cjs vite`.
- [ ] No generar JavaScript con `echo` dentro del BAT, no usar `node -e` para logica compleja y no activar delayed expansion.
- [ ] Incluir en el BAT comprobaciones defensivas de Node, npm y `gh-pages`, mostrar errores accionables y salir con codigo distinto de cero si falta algo.
- [ ] Sincronizar cambios de dependencias con npm y comprobar que `npm run predeploy` y `npm run deploy` usan el `dist` recien generado.
- [ ] Crear `README.md` orientado a jugadores con el encabezado exacto `# [🐭 Ratón: Zombie Cat Trap](https://coiponorte.github.io/Raton-Kagero/)`, badge "Jugar ahora", descripcion, historia, modos, controles, trampas, combos, consejos, calidad, compatibilidad, FAQ y creditos.
- [ ] Publicar `dist` en la rama `gh-pages` con acceso configurado al repositorio y activar GitHub Pages para esa rama.
- [ ] Abrir la URL publicada y verificar carga inicial, assets, icono, Canvas, controles, recarga y ausencia de errores por base path.

**Criterio de salida:** build reproducible, helper y BAT probados, y version publicada comprobada en `https://coiponorte.github.io/Raton-Kagero/`.

## Matriz minima de validacion visual

| Viewport | Perfil esperado | Elementos que deben comprobarse |
| --- | --- | --- |
| 390x844 | Movil vertical | Canvas protagonista, HUD, joystick, barra inferior y safe area |
| 844x390 | Movil horizontal / corto | Canvas amplio, paneles compactos y controles accesibles |
| 768x1024 | Tablet vertical | Canvas util y panel inferior sin tapar la accion |
| 1024x768 | Tablet horizontal | Estado, escena y trampas equilibrados |
| 1280x820 | Escritorio | Tres zonas y tamanos comodos |
| 1600x900 | Escritorio ultrawide | Ancho maximo, escena centrada y sin estirar geometria |

## Regla para declarar una fase terminada

Una fase solo se marca como completada si sus entregables existen, sus criterios de salida se han probado y la compilacion sigue funcionando. Si alguna verificacion no puede ejecutarse en el entorno disponible, debe anotarse como pendiente y no presentarse como aprobada. La falta de credenciales de GitHub puede impedir publicar, pero no debe impedir terminar, compilar y verificar localmente el juego; la publicacion queda entonces como el unico paso externo pendiente.