Hola amigo, soy fan de los juegos casuales, adictivos y de la estética retro de videojuegos. Hoy vamos a diseñar y programar un juego web en 3D ultra adictivo y divertido, jugable en cualquier dispositivo (celular vertical/horizontal, tablet y escritorio).

El juego es una reimaginación humorística y retro estilo PS1 (Low-Poly / VHS Nostalgic) de la saga "Deception / Kagero", titulado "Raton: Zombie Cat Trap" (o Raton-Kagero). Encarnas a un intrépido Ratoncito que debe defender su casa de una invasión de Gatos Zombis colocando e hiper-encadenando trampas caseras mortales en tiempo real.

🎮 JUGABILIDAD Y MECÁNICAS (Kagero Style Adaptado)
El juego ocurre en una sala 3D interactiva de la casa (vista isométrica/tercera persona táctica con cámara adaptable).

1. Sistema de Trampas (Colocación y Activa):
   Las trampas se dividen en 3 categorías accesibles mediante pestañas o barra inferior:
   - Suelo (S): Trampas de oso de juguete, cáscara de plátano, pega para ratones, muelle exprimidor.
   - Pared (P): Lanzador de dardos de queso, ventilador gigante, guante de boxeo con resorte.
   - Techo (T): Yunque de hierro, macetero pesado, lámpara de araña, bola de boliche.

2. Flujo de Juego y Combos:
   - Los Gatos Zombis entran por puertas/ventanas y caminan por la habitación con IA simple buscando al ratón o la quesera principal.
   - El jugador toca o hace clic en el mapa para colocar trampas. Al activarse (o pisarse), las trampas aplican físicas o empujones a los gatos (ej. la cáscara de plátano hace resbalar al gato zombi hasta el punto donde cae el yunque del techo).
   - Multiplicador de Combo Encadenado: Si una trampa empuja a un gato hacia otra trampa consecutiva, el combo aumenta (×2, ×3, ×5) otorgando multiplicadores de Puntos y Yenes/Quesos.
   - Feedback: Vértices de texto retro saltando ("BOING!", "CRUNCH!", "COMBO x3!"), vibración de pantalla (Screen Shake), y salpicaduras de partículas cómicas/cartoon.

3. Oleadas y Tiempo:
   - Modo Supervivencia por Oleadas de ~90 segundos o hordas continuas donde debes resistir y hacer la mayor cantidad de puntos antes de que se destruya tu guarida.

🎨 ESTÉTICA RETRO PS1 / LOW-POLY
- Gráficos 3D Low-Poly construidos con Three.js procedimentalmente (modelos mediante primitivas geométricos 3D estilizados, mapas de texturas pixeladas con filtro NearestFilter para ese aspecto 'crunchy' de 1998, sin necesidad de cargar assets GLTF externos pesados).
- Iluminación tenue de mansión con efectos retro (dithered shading / sombras pixeladas).
- Mascota y Enemigos:
  * Protagonista: Ratoncito chef/inventor Low-Poly con linterna y vincha.
  * Enemigos: Gatos zombis torpes con ojos brillantes y caminata cómica.
- Audio ASMR / SFX 8-bit / 16-bit sintetizado con WebAudio API: Maullidos zombis retro, resortes mecánicos, impacto de metal, explosiones cartoon y fanfarria de Game Over. Botón de silencio persistente.

📱 DISEÑO RESPONSIVE Y CONTROLES
- HUD flotante y mínimo:
  * Barra de vida de la casa/ratón y tiempo en la parte superior.
  * Pastilla de puntos y contador de combos flotante.
- Responsive Adaptativo (hook useIsPortrait):
  * Horizontal / Escritorio: Vista 3D amplia al centro, panel de trampas lateral derecho, mapa táctico/status a la izquierda.
  * Celular Vertical: Render 3D ocupando la mitad superior, barra de selección de trampas en carrusel/filas táctiles en la mitad inferior.
  * Soporte para toque directo en pantalla 3D (Raycasting con Three.js) para seleccionar casilla y colocar trampa.

💾 PROGRESION Y PERSISTENCIA
- Módulo `src/game/storage.ts` que guarda en `localStorage` (con fallback seguro a memoria):
  * Récord de puntuación máxima y combo más alto.
  * Preferencias de sonido/música.
  * Monedas de Queso acumuladas para desbloquear trampas más locas.

⚙️ STACK TÉCNICO
- React 19 + TypeScript (estricto) + Vite 7 + Tailwind CSS 4 + Three.js (`@react-three/fiber` y `@react-three/drei`) + Framer Motion (para UI/HUD) + Lucide Icons.
- Código modular en `/src`:
  * `/game/components/Canvas3D.tsx` (Escena, Luces, Cámara, Render PS1)
  * `/game/components/Traps.tsx` (Lógica de colocación y collision detection 3D)
  * `/game/entities/` (Raton, GatosZombies, Trampas)
  * `/game/sound.ts` (Audio sintetizado WebAudio)
  * `/game/storage.ts` (Persistencia segura)

🚀 REQUERIMIENTOS DE DESPLIEGUE (GitHub Pages)
El proyecto se llamará `Raton-Kagero` y debe quedar listo para desplegar en:
- Repositorio: https://github.com/CoipoNorte/Raton-Kagero
- Web: https://coiponorte.github.io/Raton-Kagero/

Archivos obligatorios de despliegue:
1. `vite.config.ts` con `base: '/Raton-Kagero/'`.
2. `deploy.bat` avanzado de 11 pasos en Windows:
   - REGLA DE ORO: Todas las llamadas a `npm`, `npx`, `git` y `node` dentro de scripts .bat deben usar `call` obligatoriamente para evitar interrupciones.
   - Definir variables `REPO_URL=https://github.com/CoipoNorte/Raton-Kagero.git` y `WEB_URL=https://coiponorte.github.io/Raton-Kagero/`.
   - Paso [1/11] Comprobar Node.js y npm.
   - Paso [2/11] Verificar Git, `git init` si aplica, e imponer remoto `origin` a `%REPO_URL%` y rama `main`.
   - Paso [3/11] Auto-crear `.gitignore` completo si no existe.
   - Paso [4/11] Insertar `p.name='raton-kagero'`, `predeploy='npm run build'` y `deploy='gh-pages -d dist'` en `package.json` mediante Node.js.
   - Paso [5/11] Insertar/verificar `base: '/Raton-Kagero/'` en `vite.config.ts` mediante Node.js.
   - Paso [6/11] `call npm install` e instalación asegurada de `gh-pages` (`npm ls gh-pages` + `npm install -D gh-pages`).
   - Paso [7/11] `call npm run build` y validación de `dist\index.html`.
   - Paso [8/11] `call git add -A` y `git commit -m "chore: despliegue Raton Kagero PS1"`.
   - Paso [9/11] `call git push -u origin main`.
   - Paso [10/11] `call npm run deploy` o fallback `call npx gh-pages -d dist`.
   - Paso [11/11] Verificación final de la rama remota `origin/gh-pages` e instrucciones claras para activar GitHub Pages en Settings.
3. `.gitignore` completo.
4. `README.md` profesional con badges, controles y guía de combos.
5. `public/.nojekyll` e `index.html` con pantalla de carga splash retro ("Cargando polígonos PS1...").
6. Favicon `icon.svg` (cabeza de ratón low-poly) y `<title>Raton vs Zombie Cats 3D</title>`.

Entrégame el código estructurado, limpio, comentado en español y completamente ejecutable para montar la demo jugable.
