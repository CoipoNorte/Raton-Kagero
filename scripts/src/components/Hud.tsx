import { motion } from "framer-motion";
import { Coins, Gamepad, Mouse, Music, Pause, Skull, Timer, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import type { GameMode, HudSnapshot, Phase } from "../game/types";

interface HudProps {
  hud: HudSnapshot;
  mode: GameMode;
  phase: Phase;
  paused: boolean;
  sound: boolean;
  music: boolean;
  highScore: number;
  variant: "float" | "strip" | "compact";
  placeNote: { text: string; ok: boolean } | null;
  onPause: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  padConnected?: boolean;
}

const SEGMENTS = 12;

function Bar({ ratio, tone }: { ratio: number; tone: "good" | "warn" | "bad" }) {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * SEGMENTS);
  const color = tone === "good" ? "bg-toxic-500" : tone === "warn" ? "bg-cheese-500" : "bg-vhs-500";
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className={`h-2.5 w-[5px] sm:w-[7px] ${i < filled ? color : "bg-moss-700"} ${i < filled ? "" : "opacity-60"}`} />
      ))}
    </div>
  );
}

function fmt(t: number): string {
  if (!Number.isFinite(t)) return "--:--";
  const s = Math.max(0, Math.ceil(t));
  return `${String(Math.floor(s / 60)).padStart(1, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Etiqueta de grupo: da jerarquía sin gastar apenas espacio. */
function ClusterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="rk-label hidden shrink-0 self-center pr-0.5 text-[7px] leading-none text-moss-500 @[900px]:block" aria-hidden>
      {children}
    </span>
  );
}

function Divider() {
  return <span className="hidden h-8 w-px shrink-0 self-center bg-moss-700/80 @[900px]:block" aria-hidden />;
}

/*
 * Estructura del HUD en dos zonas con comportamiento independiente:
 *
 *   ┌───────────────────────────────────────────────────┬────────────┐
 *   │ ZONA ESTADO                                       │ ZONA       │
 *   │  MISIÓN   quesera · tiempo · oleada · inventor     │ SISTEMA    │
 *   │  MARCADOR puntos · combo                           │ anclada    │
 *   │  TALLER   queso · trampas                          │ arriba-dcha│
 *   └───────────────────────────────────────────────────┴────────────┘
 *
 * La zona de sistema es `shrink-0 self-start`: nunca entra en el `flex-wrap`
 * de las fichas, así que pausa/audio/música quedan siempre arriba a la derecha,
 * en el mismo orden. Antes compartían flujo con los indicadores y los saltos de
 * línea los arrastraban al centro de la pantalla.
 *
 * Los indicadores se agrupan por función (misión / marcador / taller) en vez de
 * una fila plana de fichas iguales: el ojo sabe dónde mirar para cada decisión.
 */
export function Hud({
  hud,
  mode,
  phase,
  paused,
  sound,
  music,
  highScore,
  variant,
  placeNote,
  onPause,
  onToggleSound,
  onToggleMusic,
  padConnected = false,
}: HudProps) {
  const lairRatio = hud.lairHp / Math.max(1, hud.lairMax);
  const lairTone = lairRatio > 0.6 ? "good" : lairRatio > 0.3 ? "warn" : "bad";
  const timeRatio = mode === "lab" ? 1 : hud.timeLeft / 90;
  const urgent = mode === "survival" && hud.timeLeft < 15;
  const dense = variant !== "float";
  const trapsFull = hud.trapsLive >= hud.trapCap;

  const sysBtn =
    "pointer-events-auto grid place-items-center border-2 border-moss-950 bg-moss-800 text-parch-100 shadow-[0_3px_0_#07100d] transition-colors hover:bg-moss-700 hover:text-toxic-400 active:translate-y-[2px] active:shadow-none";
  const sysSize = variant === "compact" ? "h-9 w-9" : variant === "strip" ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12";
  const sysIcon = variant === "compact" ? "h-4 w-4" : variant === "strip" ? "h-[22px] w-[22px]" : "h-6 w-6";

  /* Consola de sistema: un solo bloque, siempre arriba a la derecha. */
  const systemDock = (
    <div
      className="rk-panel flex shrink-0 self-start items-center gap-1 px-1 py-1 sm:gap-1.5 sm:px-1.5"
      role="group"
      aria-label="Controles de sistema"
    >
      {/* Al pausar, el diálogo modal cubre el HUD y es quien reanuda: aquí no se
          pone un botón de reanudar que quedaría inaccesible bajo el modal. */}
      <button
        type="button"
        className={`${sysBtn} ${sysSize} ${paused ? "opacity-50" : ""}`}
        onClick={onPause}
        aria-label="Pausar partida"
        aria-disabled={paused}
      >
        <Pause className={sysIcon} />
      </button>
      <span className="h-6 w-px shrink-0 bg-moss-700" aria-hidden />
      <button
        type="button"
        className={`${sysBtn} ${sysSize}`}
        onClick={onToggleSound}
        aria-label={sound ? "Silenciar efectos" : "Activar efectos"}
        aria-pressed={sound}
      >
        {sound ? <Volume2 className={sysIcon} /> : <VolumeX className={`${sysIcon} opacity-60`} />}
      </button>
      <button
        type="button"
        className={`${sysBtn} ${sysSize} ${music ? "" : "opacity-70"}`}
        onClick={onToggleMusic}
        aria-label={music ? "Silenciar música" : "Activar música"}
        aria-pressed={music}
      >
        <Music className={sysIcon} />
      </button>
      {padConnected ? (
        <>
          <span className="h-6 w-px shrink-0 bg-moss-700" aria-hidden />
          <span className="flex shrink-0 items-center gap-1 px-0.5 text-crt-400">
            <Gamepad className="h-3.5 w-3.5" aria-hidden />
            <span className="rk-pixel hidden text-[9px] @[240px]:inline">MANDO</span>
          </span>
        </>
      ) : null}
    </div>
  );

  const clockText = phase === "prep" ? `${Math.ceil(hud.prepLeft)}s` : mode === "lab" ? "LIBRE" : fmt(hud.timeLeft);

  /* ------------------------- Variante densa (móvil) ------------------------- */
  if (dense) {
    return (
      <div className="@container w-full select-none" onPointerDown={(e) => e.stopPropagation()}>
        <div className={`flex items-start gap-1.5 ${variant === "strip" ? "px-1.5 py-1" : "px-1.5 py-1.5"}`}>
          {/* Zona estado: la única que puede saltar de línea. Orden por grupo. */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {/* MISIÓN */}
            <div className="rk-panel rk-panel-lit flex min-w-[62px] items-center gap-1 px-1.5 py-1">
              <Skull className="h-3.5 w-3.5 shrink-0 text-toxic-400" />
              <Bar ratio={lairRatio} tone={lairTone} />
            </div>
            <div className={`rk-panel flex shrink-0 items-center gap-1 px-1.5 py-1 ${urgent ? "animate-pulse !border-vhs-500" : ""}`}>
              <Timer className={`h-3.5 w-3.5 ${urgent ? "text-vhs-500" : "text-crt-500"}`} />
              <span className={`rk-pixel text-[11px] ${urgent ? "text-vhs-500" : "text-cheese-400"}`}>{clockText}</span>
            </div>
            <div className="rk-panel hidden shrink-0 items-center gap-1 px-1.5 py-1 @[360px]:flex">
              <span className="rk-pixel text-[10px] text-parch-100">{String(hud.wave).padStart(2, "0")}</span>
              <span className="h-1.5 w-8 bg-moss-700" aria-hidden>
                <span className="block h-full bg-toxic-500" style={{ width: `${hud.waveProgress * 100}%` }} />
              </span>
            </div>

            {/* MARCADOR */}
            <div className="rk-panel flex shrink-0 items-center gap-1 px-1.5 py-1">
              <Trophy className="h-3.5 w-3.5 text-cheese-500" />
              <span className="rk-pixel text-[11px] text-parch-100">{hud.score.toLocaleString("es-CL")}</span>
            </div>
            <div className={`rk-panel flex shrink-0 items-center gap-1 px-1.5 py-1 ${hud.combo > 1 ? "!border-cheese-500" : ""}`}>
              <Zap className={`h-3.5 w-3.5 ${hud.combo > 1 ? "text-cheese-400" : "text-moss-500"}`} />
              <span className={`rk-pixel text-[11px] ${hud.combo > 1 ? "text-cheese-400" : "text-moss-500"}`}>x{Math.max(1, hud.combo)}</span>
            </div>

            {/* TALLER */}
            <div className="rk-panel flex shrink-0 items-center gap-1 px-1.5 py-1">
              <Coins className="h-3.5 w-3.5 text-cheese-500" />
              <span className="rk-pixel text-[11px] text-cheese-400">{hud.cheese}</span>
            </div>

            {/* Avisos: siempre al final de la zona de estado. */}
            {hud.incoming > 0 ? (
              <div className="rk-panel flex shrink-0 animate-pulse items-center px-1.5 py-1 !border-vhs-500">
                <span className="rk-pixel text-[9px] text-vhs-500">{hud.incoming} CERCA</span>
              </div>
            ) : null}
            {trapsFull ? (
              <div className="rk-panel hidden shrink-0 items-center px-1.5 py-1 !border-cheese-500 @[420px]:flex">
                <span className="rk-pixel text-[9px] text-cheese-500">LLENAS</span>
              </div>
            ) : null}
          </div>

          {systemDock}
        </div>

        {placeNote ? (
          <div className="flex px-1.5 pb-1">
            <span
              className={`rk-chip max-w-full truncate px-1.5 py-1 text-[11px] leading-tight ${placeNote.ok ? "text-toxic-400" : "text-vhs-500"}`}
              role="status"
              aria-live="polite"
            >
              {placeNote.text}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  /* ------------------- Variante completa (escritorio/tablet) ------------------- */
  return (
    <div className="@container pointer-events-none w-full select-none" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-2 px-2 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-1.5">
          {/* ── MISIÓN: qué defiendes y cuánto queda ── */}
          <ClusterLabel>Misión</ClusterLabel>
          <div className="rk-panel rk-panel-lit flex items-center gap-2 px-2 py-1.5">
            <Skull className="h-4 w-4 shrink-0 text-toxic-400" />
            <div className="flex flex-col leading-none">
              <span className="rk-label">Quesera</span>
              <div className="mt-1 flex items-center gap-1.5">
                <Bar ratio={lairRatio} tone={lairTone} />
                <span className="rk-pixel text-[10px] text-parch-100">{Math.round(lairRatio * 100)}%</span>
              </div>
            </div>
          </div>

          <div className={`rk-panel flex items-center gap-2 px-2 py-1.5 ${urgent ? "animate-pulse !border-vhs-500" : ""}`}>
            <Timer className={`h-4 w-4 ${urgent ? "text-vhs-500" : "text-crt-500"}`} />
            <div className="flex flex-col leading-none">
              <span className="rk-label">{phase === "prep" ? "Preparación" : mode === "lab" ? "Laboratorio" : "Tiempo"}</span>
              <span className={`rk-pixel mt-1 text-[13px] ${urgent ? "text-vhs-500" : "text-cheese-400"}`}>{clockText}</span>
            </div>
            {mode === "survival" ? (
              <div className="hidden h-1.5 w-10 bg-moss-700 @[380px]:block" aria-hidden>
                <div className="h-full bg-crt-500 transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(1, timeRatio)) * 100}%` }} />
              </div>
            ) : null}
          </div>

          <div className="rk-panel hidden items-center gap-2 px-2 py-1.5 @[560px]:flex">
            <div className="flex flex-col leading-none">
              <span className="rk-label">Oleada</span>
              <span className="rk-pixel mt-1 text-[12px] text-parch-100">{String(hud.wave).padStart(2, "0")}</span>
            </div>
            <div className="h-1.5 w-12 bg-moss-700" aria-hidden>
              <div className="h-full bg-toxic-500 transition-[width] duration-200" style={{ width: `${hud.waveProgress * 100}%` }} />
            </div>
          </div>

          <div
            className="rk-panel hidden items-center gap-1.5 px-2 py-1.5 @[620px]:flex"
            aria-label={`Energía del inventor: ${hud.lives} de 3`}
          >
            <span className="rk-label">Inventor</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 3 }, (_, i) => (
                <Mouse key={i} className={`h-4 w-4 ${i < hud.lives ? "text-crt-400" : "text-moss-700"}`} />
              ))}
            </div>
          </div>

          <Divider />

          {/* ── MARCADOR: cómo va la partida ── */}
          <ClusterLabel>Marcador</ClusterLabel>
          <div className="rk-panel flex items-center gap-2 px-2 py-1.5">
            <Trophy className="h-4 w-4 text-cheese-500" />
            <div className="flex flex-col leading-none">
              <span className="rk-label">Puntos</span>
              <span className="rk-pixel mt-1 text-[13px] text-parch-100">{hud.score.toLocaleString("es-CL")}</span>
            </div>
            <div className="ml-1 hidden flex-col leading-tight @[460px]:flex">
              <span className="rk-label">Récord</span>
              <span className="rk-pixel text-[10px] text-moss-500">{highScore.toLocaleString("es-CL")}</span>
            </div>
          </div>

          <motion.div
            key={hud.combo}
            initial={{ scale: 0.72, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
            className={`rk-panel flex items-center gap-1.5 px-2 py-1.5 ${hud.combo > 1 ? "!border-cheese-500" : ""}`}
          >
            <Zap className={`h-4 w-4 ${hud.combo > 1 ? "text-cheese-400" : "text-moss-500"}`} />
            <div className="flex flex-col leading-none">
              <span className="rk-label">Combo</span>
              <span className={`rk-pixel mt-1 text-[13px] ${hud.combo > 1 ? "text-cheese-400" : "text-moss-500"}`}>x{Math.max(1, hud.combo)}</span>
            </div>
            {hud.chainBest > 0 ? <span className="rk-pixel ml-1 hidden text-[8px] text-moss-500 @[520px]:inline">máx {hud.chainBest}</span> : null}
          </motion.div>

          <Divider />

          {/* ── TALLER: qué puedes gastar ahora ── */}
          <ClusterLabel>Taller</ClusterLabel>
          <div className="rk-panel flex items-center gap-1.5 px-2 py-1.5">
            <Coins className="h-4 w-4 text-cheese-500" />
            <div className="flex flex-col leading-none">
              <span className="rk-label">Queso</span>
              <span className="rk-pixel mt-1 text-[13px] text-cheese-400">{hud.cheese}</span>
            </div>
          </div>

          <div
            className={`rk-panel hidden items-center gap-1.5 px-2 py-1.5 @[700px]:flex ${trapsFull ? "!border-cheese-500" : ""}`}
            aria-label={`Trampas activas: ${hud.trapsLive} de ${hud.trapCap}`}
          >
            <div className="flex flex-col leading-none">
              <span className="rk-label">Trampas</span>
              <span className={`rk-pixel mt-1 text-[12px] ${trapsFull ? "text-cheese-500" : "text-parch-100"}`}>
                {hud.trapsLive}/{hud.trapCap}
              </span>
            </div>
          </div>

          {/* Avisos transitorios, al final de la zona de estado. */}
          {hud.incoming > 0 ? (
            <div className="rk-panel flex animate-pulse items-center gap-1 px-2 py-1.5 !border-vhs-500">
              <span className="rk-pixel text-[10px] text-vhs-500">
                {hud.incoming} GATO{hud.incoming > 1 ? "S" : ""} CERCA
              </span>
            </div>
          ) : null}
        </div>

        {systemDock}
      </div>

      {placeNote ? (
        <div className="mt-1 flex px-2">
          <span
            className={`rk-chip max-w-full truncate px-2 py-1 text-[11px] leading-tight ${placeNote.ok ? "text-toxic-400" : "text-vhs-500"}`}
            role="status"
            aria-live="polite"
          >
            {placeNote.text}
          </span>
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">
        Puntos {hud.score}. Quesera al {Math.round(lairRatio * 100)} por ciento. Oleada {hud.wave}. Queso {hud.cheese}.
      </div>
    </div>
  );
}
