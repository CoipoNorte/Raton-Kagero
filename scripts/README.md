# 🐭 [Ratón: Zombie Cat Trap](https://coiponorte.github.io/Raton-Kagero/)

[![Jugar ahora](https://img.shields.io/badge/%F0%9F%95%B9%EF%B8%8F_Jugar_ahora-ffcf3f?style=for-the-badge&labelColor=0b1512)](https://coiponorte.github.io/Raton-Kagero/)
[![Plataforma](https://img.shields.io/badge/WebGL_3D-navegador-57e8d5?style=flat-square&labelColor=0b1512)](https://coiponorte.github.io/Raton-Kagero/)
[![Responsive](https://img.shields.io/badge/m%C3%B3vil_%C2%B7_tablet_%C2%B7_desktop-c6f96a?style=flat-square&labelColor=0b1512)](https://coiponorte.github.io/Raton-Kagero/)

> Un juego táctico de trampas con estética PS1 y vídeo VHS. Eres un ratoncito inventor y una manada de gatos zombi quiere tu quesera. No los mates: **resbálalos, pégalos, lánzalos y aplástalos** encadenando trampas para subir el combo a ×5.

---

## 📖 Historia

La **Mansión Kagerio** llevaba años tranquila hasta que alguien dejó la puerta de la cocina abierta. Ahora los gatos del barrio entran zombis por la **puerta**, la **ventana del pasillo** y hasta por el **conducto de ventilación**, y todos quieren lo mismo: el queso gigante del salón.

Tú eres **Ratón Kagero**, inventor con vincha, linterna y mochila de herramientas. Tu plan no es pelear: es ingeniería doméstica. Cáscaras en el pasillo, pegamento bajo la lámpara, un guante de boxeo en la pared y un yunque en el techo. Cuanto más larga la cadena, más puntos.

---

## 🎮 Modos de juego

### Tutorial guiado (recomendado la primera vez)
- **12 pasos cortos** que avanzan solos cuando haces la acción: no hay que leer y pulsar «siguiente».
- Aprendes a moverte, elegir trampas, colocar en **suelo, pared y techo**, atrapar un gato, encadenar un **combo**, disparar una **trampa manual**, retirar trampas y pausar.
- Los textos cambian según juegues con **teclado, pantalla táctil o mando**.
- Sin reloj ni daño: los gatos de práctica aparecen solos mientras los necesitas.
- Cualquier paso se puede **saltar**. Al terminar puedes ir directo a la Supervivencia.


### Supervivencia rápida
- **90 segundos** de partida con oleadas cada 12 s.
- **10 segundos de preparación** con queso inicial para armar la sala.
- La quesera tiene **100 de integridad** y tu inventor **3 de energía**.
- Dificultad creciente: gatos rápidos, saltarines, con casco, pesados y, en la oleada 7, el jefe **Bigotes Kagero**.
- Se guarda tu **récord histórico**, el **combo máximo** y el **queso acumulado** (que desbloquea trampas).

### Laboratorio de trampas
- **Sin reloj** y sin daño a la quesera: no toca tu récord.
- Genera gatos de prueba de cualquier tipo desde la entrada que elijas.
- Coloca las **16 trampas** libremente y reinicia la sala cuando quieras.
- Activa las **estelas de trayectoria** para ver hacia dónde empuja cada trampa.
- Ideal para aprender los controles en el móvil y practicar cadenas.

---

## 🕹️ Controles

### Teclado y ratón (escritorio)

| Acción | Control |
|---|---|
| Mover al inventor | `W A S D` o flechas |
| Correr | `Shift` |
| Cambiar categoría | `1` suelo · `2` pared · `3` techo |
| Rotar trampa | `E` siguiente · `Q` anterior |
| Apuntar casilla | Mover el ratón sobre la habitación |
| Colocar trampa | Clic izquierdo o `Enter` |
| Retirar trampa apuntada | `X` (devuelve el 85 % del queso en la preparación) |
| Activar la trampa manual más cercana | `Espacio` |
| Cancelar selección | `C` |
| Pausa | `P` o `Esc` |

### Táctil (móvil y tablet)
- En vertical, los controles viven en una **franja propia bajo la escena**: joystick a la izquierda, aviso de colocación en el centro y botones a la derecha. Nada tapa el Canvas ni la barra de trampas.
- **Joystick virtual**: mueve al inventor (con captura de puntero hasta soltar el dedo).
- **Toca la escena** para apuntar la casilla; el fantasma se pone verde o rojo.
- **Toca de nuevo la misma casilla** para confirmar la colocación.
- Botón grande **DISPARAR**: activa la trampa manual más cercana.
- Botón de **papelera**: retira la trampa apuntada.
- **Cancelar** aparece cuando hay una colocación pendiente.
- La barra de trampas se desliza con el dedo, con inercia y ajuste a casilla.

### Mando (Gamepad API estándar)
Conecta el mando en cualquier momento: aparece el aviso "Mando conectado" y una insignia MANDO en el HUD.
- **Stick izquierdo**: mueve al inventor (a fondo, corre).
- **Stick derecho o cruceta**: mueve el cursor de colocación por casillas (con retícula cian en la escena).
- **A**: colocar en el cursor · **B**: cancelar o retirar · **X**: rotar trampa · **Y**: disparar manual.
- **LB / RB**: cambiar de categoría (suelo, pared, techo) · **LT**: cambiar de pared · **RT**: centrar cursor.
- **Select**: estelas de trayectoria · **Start**: pausa.
- El mando convive con teclado y ratón: el cursor del mando tiene prioridad mientras está conectado.

---

## 🪤 Tipos de trampas

### Suelo (categoría 1)
| Trampa | Qué hace |
|---|---|
| 🍌 Cáscara de plátano | Hace resbalar y deslizar al gato hacia adelante |
| 🧪 Pegamento felino | Pega las patas al suelo: el gato queda quieto |
| 🧸 Trampa de oso de juguete | Muerde el tobillo, daña y aturde |
| 🪀 Muelle exprimidor | Lanza al gato hacia arriba |
| 🏗️ Tabla basculante | Cambia la dirección del gato |
| 🎁 Caja sorpresa | Temporizada: estalla sola y lanza todo lo cercano |

### Pared (categoría 2)
| Trampa | Qué hace |
|---|---|
| 🧀 Lanzador de dardos | Dispara dardos por todo el carril |
| 🥊 Guante de boxeo | Empujón lateral brutal: el mejor conector de cadenas |
| 🌬️ Ventilador gigante | Ráfaga a lo largo del carril, golpea a varios gatos |
| 🍾 Cañón de corchos | Manual: noquea y empuja en el momento exacto |
| 📚 Estantería | Manual: se desploma sobre el inicio del carril |

### Techo (categoría 3)
| Trampa | Qué hace |
|---|---|
| ⚒️ Yunque | Cae sobre la casilla y aturde en área |
| 🌱 Macetero pesado | Golpe vertical barato con tierra y estrellas |
| 🪣 Cubeta metálica | Cubazo de agua: aturde y hace resbalar |
| 🎳 Bola de boliche | Cae y rueda noqueando gatos de uno en uno |
| 💡 Lámpara de araña | Se dispara en cadena cuando otra trampa golpea cerca |

Cada trampa se distingue por **silueta, color, icono, tipo de instalación y dirección de empuje**, no sólo por el color. El icono de la esquina indica la superficie: `•` suelo, `→` carril de pared, `↓` techo.

---

## ⛓️ Guía de combos

1. El combo pertenece **al gato impactado**, no a la partida.
2. Cada impacto dentro de una ventana de **2,5 segundos** sube su combo: ×1, ×2, ×3 y, a partir del cuarto, ×5 como máximo.
3. **Bonus de variedad**: repetir la misma trampa sobre el mismo gato no suma variedad; mezcla superficies.
4. **Golpe ambiental**: si la trampa alcanza a dos o tres gatos a la vez, ganas puntos extra.
5. **CHEESE BONUS**: si el inventor está cerca del golpe, la jugada se multiplica ×1,25.
6. **Finisher**: rematar a un gato con una cadena de tres o más golpes suma +120 puntos.
7. La cadena se corta si pasa demasiado tiempo, el gato sale de la habitación o es derrotado.

**Cadena modelo:** cáscara de plátano → pegamento → guante de boxeo → yunque = combo ×4 con finisher.

---

## 💡 Consejos

- **No pongas todo junto**: reparte las trampas de suelo por el pasillo que usan los gatos y deja el techo para las casillas clave.
- **Usa el pegamento como imán**: un gato pegado es un blanco perfecto para el yunque o la lámpara.
- **El guante de boxeo es tu conector**: empuja al gato justo hacia la casilla con la trampa siguiente.
- **Guarda una estantería o la lámpara para el jefe**: Bigotes Kagero resiste casi todo y necesita cadenas largas.
- **Muévete cerca de la acción** para cobrar el CHEESE BONUS, pero cuidado: tres zarpazos y pierdes.
- **En la preparación puedes retirar trampas** y recuperar el 85 % del queso: prueba sin miedo.
- Si van varios gatos juntos, un ventilador o una caja sorpresa valen más que tres trampas de precisión.
- En el laboratorio, activa las **estelas** y observa hacia dónde empuja cada trampa antes de gastar queso en la Supervivencia.

---

## ⚙️ Ajustes de calidad

Se cambian desde el **menú de pausa** y se guardan en tu navegador.

| Nivel | DPR máx. | Sombras | Partículas | Gatos simultáneos | Trampas | VHS |
|---|---|---|---|---|---|---|
| Bajo | 1,0 | No | 42 | 7 | 9 | Reducido |
| Medio | 1,25 | No | 90 | 10 | 13 | Completo |
| Alto | 1,5 | Sí | 160 | 14 | 18 | Completo |

- **Ajuste automático**: si los FPS caen por debajo de ~42, el juego baja la calidad solo y te avisa.
- **Sacudida de cámara**: off, suave o completa.
- **Efectos VHS**: off, suave o completos (scanlines, ruido, línea de tracking).
- **Flash de daño** y **estelas de trayectoria** se pueden apagar por separado.
- Si tu sistema tiene activado `prefers-reduced-motion`, se reducen solos la sacudida, el ruido y los destellos.

---

## 📱 Compatibilidad

- **Navegadores:** Chrome, Edge, Firefox y Safari recientes (se necesita WebGL).
- **Pantallas probadas:** 390×844, 844×390, 768×1024, 1024×768, 1280×820, 1600×900 y monitores ultrapanorámicos.
- **Móvil:** joystick virtual, colocación en dos toques y barra de trampas deslizable respetando los márgenes seguros.
- **Sin instalación**: todo el juego se descarga en una sola página. Si se corta la conexión mientras está abierta, puedes seguir jugando; recargar sin conexión requiere que el navegador la tenga en caché.
- **Sin audio externo**: los maullidos, muelles, yunques y la música de mansión se sintetizan en tiempo real con WebAudio. El sonido se activa con el primer toque para respetar las políticas del navegador.

---

## ❓ Preguntas frecuentes

**¿Por qué no oigo nada al entrar?**
Los navegadores bloquean el audio hasta que interactúas. Pulsa cualquier botón (por ejemplo *Jugar ahora*) y el sonido se activa. Si sigue en silencio, revisiona el botón de volumen del HUD o el menú de pausa.

**¿Cómo desbloqueo más trampas?**
Con el **queso acumulado** entre partidas de Supervivencia. Cada trampa tiene un umbral que aparece en su tarjeta con un candado. El laboratorio permite probarlas todas sin gastar.

**Coloqué una trampa en un sitio y no aparece.**
Sólo se puede colocar en la superficie que corresponda: las de suelo en casillas libres sin muebles, las de pared en un carril (máximo tres por carril y sin repetir modelo) y las de techo en casillas sin nada colgando. El fantasma se pone **rojo** con el motivo.

**¿Puedo quitar una trampa en mitad de la partida?**
Sólo durante la preparación y en el Laboratorio. Ahí recuperas el 85 % del queso gastado.

**Se me queda corto el espacio para trampas.**
Cada nivel de calidad tiene un límite para no saturar el dispositivo. Sube la calidad en pausa si tu equipo va sobrado, o sustituye trampas pequeñas por las de área (lámpara, estantería, bola de boliche).

**¿Pierdo mi récord si borro los datos del navegador?**
Sí, se guarda localmente. En modo privado o con el almacenamiento bloqueado el juego te avisa en pausa: los récords sólo duran esa sesión.

**¿Hay sangre o violencia gráfica?**
No. Los gatos salen despedidos, aturdidos con estrellas o se deshacen en polígonos y humo, con un tono de dibujo animado.

**No sé por dónde empezar.**
Abre el **Tutorial guiado** desde el menú: en unos minutos recorre todos los controles y tipos de trampa. Después empieza por el Salón, la sala más equilibrada.

**¿Funciona con mando?**
Sí, con cualquier mando de mapeado estándar (Xbox, PlayStation, Switch Pro, genéricos) vía Gamepad API. Conéctalo y juega sin configurar nada: stick izquierdo para moverte, cruceta o stick derecho para el cursor, A para colocar. Funciona en escritorio y en Android TV con navegador Chromium.

---

## 🏆 Créditos

- **Diseño, código, modelos y sonido**: CoipoNorte.
- **Tecnología**: React 19, TypeScript, Vite, Tailwind CSS 4, Three.js y React Three Fiber.
- **Gráficos**: todos los modelos, texturas y animaciones son **procedurales y originales**, construidos con primitivas de baja resolución y texturas generadas en canvas.
- **Inspiración**: los juegos tácticos de trampas de finales de los noventa, como homenaje de género. No se reutilizan personajes, logotipos, músicas, niveles, modelos, interfaces ni texturas de otras franquicias.

---

<p align="center">
  <a href="https://coiponorte.github.io/Raton-Kagero/">
    <img src="public/icon.svg" width="88" alt="Ratón Kagero, el ratón inventor" />
  </a>
</p>
<p align="center"><em>«Que el queso quede intacto.»</em></p>
