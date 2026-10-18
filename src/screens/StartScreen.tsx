import { Fragment } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Coins, FlaskConical, Gamepad, GraduationCap, Info, Keyboard, Mouse, Play, Smartphone, Target, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import { CATS } from "../game/enemies";
import { SURFACE_TRAPS, TRAPS } from "../game/traps";
import { TrapIcon } from "../components/TrapBar";
import { PAD_LEGEND } from "../game/gamepad";
import { MAP_LIST, type GameMap, type MapId } from "../game/maps";
import { GRID_H, GRID_W } from "../game/constants";
import type { GameMode, Progress, Settings, TrapId } from "../game/types";
import type { LayoutInfo } from "../hooks/useLayout";

const TICKER =
  "MANSION KAGERIO · 16 TRAMPAS · 6 GATOS ZOMBI · 90 SEGUNDOS · COMBO x5 · GUARDA TU QUESERA · " ;

interface StartScreenProps {
  progress: Progress;
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  onMode: (m: GameMode) => void;
  layout: LayoutInfo;
  unlocked: TrapId[];
  storageVolatile: boolean;
  mapId: MapId;
  onPickMap: (id: MapId) => void;
  onTutorial: () => void;
}

/** Plano en miniatura: muebles, entradas y guarida de la sala. */
function MapPreview({ map }: { map: GameMap }) {
  const solid = new Set(map.furniture.map((f) => `${f.gx},${f.gz}`));
  const entries = new Set(map.entries.map((e) => `${e.gx},${e.gz}`));
  const cells = [];
  for (let gz = 0; gz < GRID_H; gz++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const key = `${gx},${gz}`;
      const isLair = gx === map.lair.gx && gz === map.lair.gz;
      const color = isLair
        ? "#ffcf3f"
        : solid.has(key)
          ? "#5c6f63"
          : entries.has(key)
            ? "#ff4fa3"
            : "#16261e";
      cells.push(<rect key={key} x={gx} y={gz} width={0.92} height={0.92} fill={color} />);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      className="h-10 w-12 shrink-0 border border-moss-950 bg-moss-950"
      role="img"
      aria-label={`Plano de ${map.name}`}
    >
      {cells}
    </svg>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rk-chip px-1.5 py-1 text-[10px] text-toxic-400">{children}</kbd>;
}

export function StartScreen({ progress, settings, patch, onMode, layout, unlocked, storageVolatile, mapId, onPickMap, onTutorial }: StartScreenProps) {
  const unlockedSet = new Set(unlocked);
  const totalTraps = Object.keys(TRAPS).length;
  const touch = layout.coarse;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rk-mansion">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,224,122,0.35) 0 2px, transparent 2px 9px)" }} />

      {/* Cinta superior: el formato es una cassette VHS */}
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b-2 border-brass-700 bg-moss-950/85 px-3 py-1.5">
        <span className="rk-blink flex items-center gap-1 text-[10px] text-vhs-500 rk-pixel">
          <span className="h-2 w-2 rounded-full bg-vhs-500" /> REC
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="rk-marquee flex w-max gap-8 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-moss-500">
            <span>{TICKER}</span>
            <span>{TICKER}</span>
          </div>
        </div>
        <span className="hidden shrink-0 text-[10px] text-moss-500 rk-pixel sm:inline">SP 0:00</span>
      </div>

      <div className="rk-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-start lg:gap-6 lg:py-6">
        <div className="lg:pt-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-toxic-400">Raton-Kagero · motor PS1</p>
          <h1 className="rk-title mt-2 text-[15vw] leading-[0.86] sm:text-[10vw] lg:text-[6.4vw]">
            Raton
            <span className="mt-1 block bg-vhs-700/85 px-2 py-1 text-[7.2vw] text-cheese-400 shadow-[6px_6px_0_rgba(0,0,0,0.5)] sm:text-[4.4vw] lg:text-[2.7vw]">
              Zombie Cat Trap
            </span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-parch-300">
            Eres <strong className="text-cheese-400">Raton Kagero</strong>, inventor de oficio. Una manada de gatos zombi entró por la puerta, la ventana y el
            conducto, y quieren tu quesera. No los matas: los <strong className="text-crt-400">resbalas, pegas, lanzas y aplastas</strong> con trampas
            caseras, encadenándolas para que el combo suba x2, x3 y x5.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => onMode("survival")}
              className="rk-btn group relative overflow-hidden px-4 py-4 text-left !shadow-[0_6px_0_#7c5410,0_14px_26px_rgba(0,0,0,0.45)]"
            >
              <span className="flex items-start gap-3">
                <Play className="mt-0.5 h-8 w-8 shrink-0 transition-transform group-hover:scale-110" />
                <span className="min-w-0">
                  <span className="block text-xl leading-tight">Jugar ahora</span>
                  <span className="mt-1 block font-body text-[11px] font-normal normal-case tracking-normal text-[#4a3007]">
                    Supervivencia 90 s · oleadas crecientes · record historico
                  </span>
                </span>
              </span>
            </button>
            <button type="button" onClick={() => onMode("lab")} className="rk-btn rk-btn-ghost flex flex-col items-start gap-1 px-3 py-4 text-left">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-crt-400" />
                <span className="text-base leading-tight">Laboratorio</span>
              </span>
              <span className="font-body text-[11px] font-normal normal-case leading-snug text-moss-500">
                Sin reloj ni record: genera gatos de prueba y practica cadenas
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onTutorial}
            className={`mt-3 flex w-full items-center gap-3 border-2 px-3 py-2.5 text-left transition-colors ${
              progress.tutorialDone
                ? "border-moss-700 bg-moss-950/60 hover:border-brass-500"
                : "border-crt-500 bg-crt-500/10 hover:bg-crt-500/20"
            }`}
          >
            <GraduationCap className={`h-7 w-7 shrink-0 ${progress.tutorialDone ? "text-moss-500" : "text-crt-400"}`} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-bold leading-tight text-parch-100">Tutorial guiado</span>
                {progress.tutorialDone ? (
                  <span className="rk-chip px-1.5 py-0.5 text-[10px] text-toxic-400">Completado</span>
                ) : (
                  <span className="rk-chip px-1.5 py-0.5 text-[10px] text-cheese-400">Recomendado</span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-moss-500">
                12 pasos en unos minutos: movimiento, suelo, pared, techo, combos y disparo manual.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-moss-500" aria-hidden />
          </button>

          <section className="mt-5">
            <div className="flex items-end justify-between gap-2">
              <h2 className="rk-title text-sm text-crt-400">Elige sala</h2>
              <span className="text-[10px] text-moss-500">Cambia el recorrido de los gatos</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Sala donde jugar">
              {MAP_LIST.map((m) => {
                const active = m.id === mapId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onPickMap(m.id)}
                    className={`flex flex-col items-start gap-1 border-2 p-2 text-left transition-colors ${
                      active
                        ? "border-cheese-500 bg-cheese-500/12"
                        : "border-moss-700 bg-moss-950/60 hover:border-brass-500"
                    }`}
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <MapPreview map={m} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[12px] font-bold leading-tight ${active ? "text-cheese-400" : "text-parch-100"}`}>
                          {m.name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1" aria-label={`Dificultad ${m.difficulty} de 3`}>
                          {[1, 2, 3].map((n) => (
                            <span
                              key={n}
                              aria-hidden
                              className={`h-1.5 w-3 ${n <= m.difficulty ? "bg-toxic-500" : "bg-moss-700"}`}
                            />
                          ))}
                        </span>
                      </span>
                    </span>
                    <span className="text-[10px] leading-snug text-moss-500 rk-truncate-none">{m.blurb}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-moss-500">
            <button
              type="button"
              onClick={() => patch({ sound: !settings.sound })}
              className="rk-chip flex items-center gap-1 px-2 py-1 hover:text-parch-100"
              aria-pressed={settings.sound}
            >
              {settings.sound ? <Volume2 className="h-3.5 w-3.5 text-toxic-400" /> : <VolumeX className="h-3.5 w-3.5" />}
              Efectos {settings.sound ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={() => patch({ music: !settings.music })}
              className="rk-chip flex items-center gap-1 px-2 py-1 hover:text-parch-100"
              aria-pressed={settings.music}
            >
              <Zap className={`h-3.5 w-3.5 ${settings.music ? "text-cheese-500" : "opacity-40"}`} />
              Musica {settings.music ? "on" : "off"}
            </button>
            <span className="rk-chip px-2 py-1">Calidad: {settings.autoQuality ? "auto" : settings.quality}</span>
            <span className={`rk-chip px-2 py-1 ${touch ? "text-crt-400" : "text-moss-500"}`}>{touch ? "Tactil" : "Teclado"}</span>
          </div>
          <p className="mt-2 text-[10px] text-moss-500">
            Pulsa <Kbd>Enter</Kbd> para abrir la Supervivencia. {storageVolatile ? "Almacenamiento bloqueado: el record vive solo en esta sesion." : ""}
          </p>
        </div>

        {/* Panel de estado: cinta trasera del cassette */}
        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rk-panel rk-panel-lit mt-6 p-3 lg:mt-0"
        >
          <div className="flex items-center justify-between gap-2 border-b-2 border-moss-700 pb-2">
            <h2 className="rk-title text-sm text-crt-400">Ficha del jugador</h2>
            <Trophy className="h-5 w-5 text-cheese-500" />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2">
            {[
              { k: "Record", v: progress.highScore.toLocaleString("es-CL"), icon: <Trophy className="h-3.5 w-3.5" /> },
              { k: "Combo max", v: `x${progress.bestCombo}`, icon: <Zap className="h-3.5 w-3.5" /> },
              { k: "Queso acumulado", v: progress.totalCheese.toLocaleString("es-CL"), icon: <Coins className="h-3.5 w-3.5" /> },
              { k: "Gatos expulsados", v: progress.catsOut.toLocaleString("es-CL"), icon: <Target className="h-3.5 w-3.5" /> },
            ].map((row) => (
              <div key={row.k} className="border-2 border-moss-700 bg-moss-950/60 p-2">
                <dt className="rk-label flex items-center gap-1">
                  {row.icon}
                  {row.k}
                </dt>
                <dd className="rk-pixel mt-1 text-[13px] text-cheese-400">{row.v}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-moss-500">
            {touch ? <Smartphone className="h-3.5 w-3.5" /> : <Keyboard className="h-3.5 w-3.5" />}
            Controles
          </h3>
          <ul className="mt-1.5 space-y-1 text-[12px] text-parch-300">
            {touch ? (
              <>
                <li>Joystick virtual: mueve al inventor. Toca la escena para apuntar la casilla y vuelve a tocar para confirmar.</li>
                <li>Disparar (boton grande): activa la trampa manual mas cercana. Cancelar devuelve el queso en la preparacion.</li>
              </>
            ) : (
              <>
                <li>
                  <Kbd>W A S D</Kbd> o flechas para moverte · <Kbd>Shift</Kbd> corre
                </li>
                <li>
                  <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> cambian de categoria · <Kbd>E</Kbd>/<Kbd>Q</Kbd> rotan trampa · clic coloca
                </li>
                <li>
                  <Kbd>Espacio</Kbd> dispara la manual mas cercana · <Kbd>X</Kbd> retira · <Kbd>Enter</Kbd> confirma en la casilla apuntada
                </li>
                <li>
                  <Kbd>P</Kbd> o <Kbd>Esc</Kbd> pausa
                </li>
              </>
            )}
          </ul>

          <details className="mt-2 border-2 border-moss-700 bg-moss-950/50 p-2">
            <summary className="flex cursor-pointer items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-moss-500">
              <Gamepad className="h-3.5 w-3.5" />
              Mando compatible
            </summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]">
              {PAD_LEGEND.map(([control, action]) => (
                <Fragment key={control}>
                  <dt className="rk-chip whitespace-nowrap px-1.5 py-0.5 text-[8px] text-crt-400">{control}</dt>
                  <dd className="text-parch-300">{action}</dd>
                </Fragment>
              ))}
            </dl>
            <p className="mt-1.5 text-[10px] text-moss-500">Conecta el mando y pulsa un boton: se detecta solo.</p>
          </details>

          <div className="mt-3 border-t-2 border-moss-700 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-moss-500">Arsenal</h3>
              <span className="rk-pixel text-[9px] text-toxic-400">
                {unlockedSet.size}/{totalTraps}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-8 gap-1">
              {Object.values(TRAPS).map((t) => {
                const has = unlockedSet.has(t.id);
                return (
                  <span
                    key={t.id}
                    title={`${t.name}${has ? "" : ` · se desbloquea con ${t.unlock} quesos`}`}
                    className={`grid aspect-square place-items-center border-2 ${
                      has ? "border-brass-500 bg-moss-800 text-cheese-400" : "border-moss-700 bg-moss-950 text-moss-700"
                    }`}
                    style={has ? { boxShadow: `inset 0 0 10px ${t.color}33` } : undefined}
                  >
                    <TrapIcon shape={t.shape} className="h-5 w-5" />
                  </span>
                );
              })}
            </div>
          </div>
        </motion.aside>

        {/* Bestiario */}
        <section className="mt-7 lg:col-span-2">
          <div className="flex items-end justify-between gap-2">
            <h2 className="rk-title text-lg text-parch-100">Bestiario: los seis gatos</h2>
            <span className="text-[10px] text-moss-500">Cada uno con silueta, masa y sonido propios</span>
          </div>
          <div className="rk-scroll -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
            {Object.values(CATS).map((c, i) => (
              <motion.article
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.04, duration: 0.28 }}
                whileHover={{ y: -4 }}
                className="rk-panel w-[190px] shrink-0 snap-start p-2.5"
                style={{ borderColor: `${c.accent}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center border-2 border-moss-950" style={{ background: c.color, color: "#0b1512" }}>
                    <Mouse className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[12px] font-bold leading-tight text-parch-100">{c.name}</h3>
                    <p className="rk-pixel text-[8px] text-moss-500">
                      HP {c.hp} · V {c.speed.toFixed(1)} · M {c.mass.toFixed(1)}
                    </p>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-moss-500">{c.blurb}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Guía rápida de trampas */}
        <section className="mt-4 grid gap-3 pb-6 lg:grid-cols-3">
          {(["floor", "wall", "ceiling"] as const).map((s) => (
            <article key={s} className="rk-panel p-3">
              <h3 className="rk-title text-sm text-toxic-400">{s === "floor" ? "Suelo" : s === "wall" ? "Pared" : "Techo"}</h3>
              <p className="mt-0.5 text-[11px] text-moss-500">{SURFACE_TRAPS[s].length} modelos · {s === "wall" ? "cubren carriles" : s === "ceiling" ? "impacto en area" : "preparan al gato"}</p>
              <ul className="mt-2 space-y-1">
                {SURFACE_TRAPS[s].map((t) => (
                  <li key={t.id} className="flex items-center gap-1.5 text-[11px] text-parch-300">
                    <span className="grid h-5 w-5 shrink-0 place-items-center border border-moss-950" style={{ background: t.color, color: "#0b1512" }}>
                      <TrapIcon shape={t.shape} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 rk-truncate-none">{t.name}</span>
                    <span className="ml-auto shrink-0 text-cheese-500">{t.cost}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>

      <footer className="relative z-10 flex shrink-0 items-center gap-2 border-t-2 border-moss-700 bg-moss-950/85 px-3 py-1.5 text-[10px] text-moss-500">
        <Info className="h-3.5 w-3.5" />
        <span>Diseno original, sin assets de otras franquicias · WebGL 2 recomendado · funciona con gamepad de pulgares: joystick tactil incluido</span>
        <ChevronRight className="ml-auto h-4 w-4" />
      </footer>
    </div>
  );
}

interface BriefingProps {
  mode: GameMode;
  map: GameMap;
  onBack: () => void;
  onStart: () => void;
  layout: LayoutInfo;
}

const CHAIN: TrapId[] = ["banana_peel", "glue_patch", "boxing_glove", "anvil"];

export function BriefingScreen({ mode, map, onBack, onStart, layout }: BriefingProps) {
  return (
    <div className="rk-mansion relative flex h-full min-h-0 flex-col">
      <div className="rk-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        <div className="mx-auto max-w-[900px]">
          <p className="text-[10px] uppercase tracking-[0.35em] text-crt-400">{mode === "survival" ? "Mision 01" : "Mision libre"}</p>
          <h1 className="rk-title mt-1 text-3xl sm:text-5xl">{mode === "survival" ? "Supervivencia rapida" : "Laboratorio de trampas"}</h1>

          {/* Sala elegida: plano, nombre y pista táctica propia. */}
          <div className="mt-3 flex items-center gap-3 border-2 border-moss-700 bg-moss-950/60 p-2">
            <MapPreview map={map} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-cheese-400">{map.name}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-parch-300 rk-truncate-none">{map.hint}</p>
            </div>
          </div>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-parch-300">
            {mode === "survival"
              ? "90 segundos. La quesera tiene 100 de integridad y tu inventor 3 de energia. Si se acaba el tiempo, ganas puntos por lo que defendiste; si cae la quesera, se acabó."
              : "Sin reloj, sin dano a la quesera y sin tocar tu record. Genera gatos de prueba, coloca las 16 trampas y estudia las trayectorias."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <section className="rk-panel p-3">
              <h2 className="rk-title text-sm text-cheese-400">Objetivos</h2>
              <ol className="mt-2 space-y-1.5 text-[12px] text-parch-300">
                {(mode === "survival"
                  ? ["Prepara la habitacion 10 s con queso inicial", "Deten a los gatos antes de que toquen la quesera", "Encadena trampas distintas sobre el mismo gato", "Suma queso para desbloquear el arsenal", "Supera tu record historico"]
                  : ["Genera uno o varios gatos de prueba", "Coloca trampas libremente, sin coste de tiempo", "Activa manuales para cronometrar el golpe", "Reinicia la habitacion cuando quieras", "Activa las estelas para ver las trayectorias"]
                ).map((t, i) => (
                  <li key={t} className="flex gap-2">
                    <span className="rk-pixel text-[10px] text-toxic-400">{String(i + 1).padStart(2, "0")}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rk-panel p-3">
              <h2 className="rk-title text-sm text-toxic-400">La cadena modelo</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {CHAIN.map((id, i) => {
                  const t = TRAPS[id];
                  return (
                    <span key={id} className="flex items-center gap-1.5">
                      <span className="flex flex-col items-center border-2 border-moss-700 bg-moss-950/70 px-2 py-1">
                        <span className="grid h-7 w-7 place-items-center border border-moss-950" style={{ background: t.color, color: "#0b1512" }}>
                          <TrapIcon shape={t.shape} className="h-4 w-4" />
                        </span>
                        <span className="mt-1 text-[10px] text-parch-300">{t.name}</span>
                      </span>
                      {i < CHAIN.length - 1 ? <ChevronRight className="h-4 w-4 text-crt-500" /> : null}
                    </span>
                  );
                })}
                <span className="rk-pixel ml-1 border-2 border-cheese-500 px-1.5 py-1 text-[10px] text-cheese-400">x4 + FINISHER</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-moss-500">
                Cada impacto dentro de 2,5 s sube el combo de <em>ese</em> gato. Repetir la misma trampa no suma variedad: mezcla superficies.
              </p>
            </section>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" className="rk-btn px-5 py-3 text-lg" onClick={onStart}>
              <Play className="h-6 w-6" />
              {mode === "survival" ? "Preparar habitacion" : "Entrar al laboratorio"}
            </button>
            <button type="button" className="rk-btn rk-btn-ghost" onClick={onBack}>
              Volver
            </button>
            <span className="text-[11px] text-moss-500">
              {layout.coarse ? "Consejo: en la preparacion puedes retirar trampas y recuperas el 85% del queso." : "Consejo: cambia de categoria con 1, 2 y 3."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
