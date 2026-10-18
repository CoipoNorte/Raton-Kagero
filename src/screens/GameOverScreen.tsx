import { motion } from "framer-motion";
import { Coins, FlaskConical, Home, Play, Skull, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { TRAPS } from "../game/traps";
import type { EndReason, GameMode, Progress, RunResult, TrapId } from "../game/types";

const REASON: Record<EndReason, { title: string; text: string; tone: "good" | "bad" }> = {
  time: { title: "Tiempo cumplido", text: "Aguantaste los 90 segundos: la quesera sigue en pie y tú cobrando el bonus.", tone: "good" },
  lair: { title: "Quesera en el suelo", text: "Los gatos se llevaron el botín. Refuerza el carril de la puerta.", tone: "bad" },
  mouse: { title: "Inventor noqueado", text: "Tres zarpazos y al suelo. Muévete más: tu energía también es una trampa.", tone: "bad" },
  quit: { title: "Partida cerrada", text: "Cerraste antes de tiempo. El laboratorio es para eso.", tone: "bad" },
};

interface GameOverProps {
  result: RunResult;
  progress: Progress;
  unlocked: TrapId[];
  mode: GameMode;
  onRetry: () => void;
  onLab: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ result, progress, unlocked, mode, onRetry, onLab, onMenu }: GameOverProps) {
  const reason = REASON[result.reason];
  const next = Object.values(TRAPS)
    .filter((t) => !unlocked.includes(t.id))
    .sort((a, b) => a.unlock - b.unlock)[0];
  const survival = mode === "survival";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 grid place-items-center bg-moss-950/82 p-2"
      role="dialog"
      aria-modal="true"
      aria-label="Resumen de partida"
    >
      <motion.div
        initial={{ y: 18, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="rk-panel rk-panel-lit rk-scroll max-h-full w-full max-w-[680px] overflow-y-auto p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-moss-500">
              {reason.tone === "good" ? <Sparkles className="h-3.5 w-3.5 text-toxic-400" /> : <Skull className="h-3.5 w-3.5 text-vhs-500" />}
              {survival ? "Supervivencia rapida" : "Laboratorio (sin record)"}
            </p>
            <h1 className="rk-title mt-1 text-3xl sm:text-4xl">{reason.title}</h1>
            <p className="mt-1 max-w-[46ch] text-[12px] text-parch-300">{reason.text}</p>
          </div>
          <div className="border-2 border-brass-700 bg-moss-950 px-3 py-2 text-right">
            <span className="rk-label">Puntuacion</span>
            <p className="rk-pixel text-2xl text-cheese-400">{result.score.toLocaleString("es-CL")}</p>
            <p className="text-[10px] text-moss-500">{result.rankLabel}</p>
          </div>
        </div>

        {result.newRecord ? (
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="mt-3 border-2 border-cheese-500 bg-cheese-500/15 px-3 py-2 text-center rk-pixel text-[11px] text-cheese-400"
          >
            ¡NUEVO RECORD! antes {progress.highScore === result.score ? result.score.toLocaleString("es-CL") : progress.highScore.toLocaleString("es-CL")}
          </motion.p>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-moss-500">
            <Trophy className="h-3.5 w-3.5" /> Record historico: {progress.highScore.toLocaleString("es-CL")} puntos
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: "Combo max", v: `x${result.comboBest}`, icon: <Zap className="h-3.5 w-3.5" /> },
            { k: "Cadena max", v: `${result.chainBest} golpes`, icon: <Target className="h-3.5 w-3.5" /> },
            { k: "Gatos fuera", v: String(result.defeated), icon: <Skull className="h-3.5 w-3.5" /> },
            { k: "Oleadas", v: String(result.waves), icon: <Sparkles className="h-3.5 w-3.5" /> },
            { k: "Quesera", v: `${result.lairHp}/100`, icon: <Trophy className="h-3.5 w-3.5" /> },
            { k: "Queso final", v: String(result.cheese), icon: <Coins className="h-3.5 w-3.5" /> },
            { k: "Perfecto", v: result.perfect ? "SI (+bonus)" : "no", icon: <Sparkles className="h-3.5 w-3.5" /> },
            { k: "Queso total", v: progress.totalCheese.toLocaleString("es-CL"), icon: <Coins className="h-3.5 w-3.5" /> },
          ].map((s) => (
            <div key={s.k} className="border-2 border-moss-700 bg-moss-950/60 px-2 py-1.5">
              <p className="rk-label flex items-center gap-1">
                {s.icon}
                {s.k}
              </p>
              <p className="rk-pixel mt-1 text-[12px] text-parch-100">{s.v}</p>
            </div>
          ))}
        </div>

        {next ? (
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-moss-500">
            <Target className="mt-[1px] h-3.5 w-3.5 shrink-0 text-crt-400" />
            <span>
              Siguiente desbloqueo: <strong className="text-cheese-400">{next.name}</strong> con {next.unlock.toLocaleString("es-CL")} quesos acumulados (vas por{" "}
              {progress.totalCheese.toLocaleString("es-CL")}). Arsenal: {unlocked.length}/{Object.keys(TRAPS).length}.
            </span>
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-toxic-400">Arsenal completo: las 16 trampas desbloqueadas.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rk-btn flex-1 !py-3" onClick={onRetry} autoFocus>
            <Play className="h-5 w-5" />
            Otra ronda
          </button>
          <button type="button" className="rk-btn rk-btn-ghost" onClick={onLab}>
            <FlaskConical className="h-5 w-5" />
            Laboratorio
          </button>
          <button type="button" className="rk-btn rk-btn-ghost" onClick={onMenu}>
            <Home className="h-5 w-5" />
            Menu
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-moss-500">Enter reparte, Esc vuelve al menu</p>
      </motion.div>
    </motion.div>
  );
}
