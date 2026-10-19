import { Check, ChevronRight, GraduationCap, Home, Play, SkipForward } from "lucide-react";
import { TUTORIAL_LAST, TUTORIAL_STEPS, tutorialStep, type InputKind } from "../game/tutorial";

interface TutorialCardProps {
  index: number;
  input: InputKind;
  /** Variante compacta para móvil: menos texto, misma información esencial. */
  compact?: boolean;
  onNext: () => void;
  onPlay: () => void;
  onMenu: () => void;
}

/*
 * Tarjeta de instrucciones del tutorial. Vive dentro del flujo del layout
 * (en el hueco del panel de Laboratorio), nunca flotando sobre la escena:
 * así no tapa el Canvas ni choca con los controles táctiles.
 */
export function TutorialCard({ index, input, compact = false, onNext, onPlay, onMenu }: TutorialCardProps) {
  const step = tutorialStep(index);
  const last = index === TUTORIAL_LAST;

  /* Compacta: cabecera única con título y acción, y barra de progreso fina.
     En pantallas de 640 px de alto cada fila cuenta: así la escena conserva
     altura jugable aunque la tarjeta ocupe su hueco. */
  if (compact) {
    return (
      <section
        className="rk-panel rk-panel-lit relative flex shrink-0 flex-col gap-1 overflow-hidden px-2 pb-1.5 pt-2"
        aria-label="Tutorial guiado"
        data-testid="tutorial-card"
        data-step={step.id}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-moss-700" aria-hidden>
          <div className="h-full bg-cheese-500 transition-[width]" style={{ width: `${((index + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="rk-label shrink-0 text-crt-400">
            {index + 1}/{TUTORIAL_STEPS.length}
          </span>
          <h2 className="min-w-0 flex-1 text-[13px] font-bold leading-tight text-parch-100" aria-live="polite">
            {step.title}
          </h2>
          {last ? null : step.manual ? (
            <button type="button" className="rk-btn shrink-0 !px-2 !py-1 text-[11px]" onClick={onNext}>
              <Check className="h-4 w-4" aria-hidden />
              Continuar
            </button>
          ) : (
            <button
              type="button"
              className="rk-btn rk-btn-ghost shrink-0 !px-2 !py-1 text-[11px]"
              onClick={onNext}
              aria-label="Saltar este paso del tutorial"
            >
              <SkipForward className="h-4 w-4" aria-hidden />
              Saltar
            </button>
          )}
        </div>
        <p className="text-[11px] leading-snug text-parch-300">{step.body[input]}</p>
        {last ? (
          <div className="flex gap-1.5">
            <button type="button" className="rk-btn flex-1 !px-2 !py-1 text-[11px]" onClick={onPlay}>
              <Play className="h-4 w-4" aria-hidden />
              Jugar Supervivencia
            </button>
            <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1 text-[11px]" onClick={onMenu}>
              <Home className="h-4 w-4" aria-hidden />
              Menú
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={`rk-panel rk-panel-lit flex shrink-0 flex-col ${compact ? "gap-1 p-2" : "gap-2 p-3"}`}
      aria-label="Tutorial guiado"
      data-testid="tutorial-card"
      data-step={step.id}
    >
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 shrink-0 text-cheese-400" aria-hidden />
        <span className="rk-label text-crt-400">
          Tutorial · {index + 1}/{TUTORIAL_STEPS.length}
        </span>
        {/* Progreso por segmentos: se lee sin depender sólo del color. */}
        <div className="ml-auto flex gap-[2px]" aria-hidden>
          {TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-2 ${compact ? "w-[5px]" : "w-[7px]"} ${
                i < index ? "bg-toxic-500" : i === index ? "bg-cheese-500" : "bg-moss-700"
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className={`font-bold leading-tight text-parch-100 ${compact ? "text-[13px]" : "text-[15px]"}`} aria-live="polite">
        {step.title}
      </h2>
      <p className={`leading-snug text-parch-300 ${compact ? "text-[11px]" : "text-[12px]"}`}>{step.body[input]}</p>
      {!compact ? (
        <p className="flex items-start gap-1 text-[11px] leading-snug text-moss-500">
          <ChevronRight className="mt-[1px] h-3.5 w-3.5 shrink-0 text-crt-400" aria-hidden />
          {step.why}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {last ? (
          <>
            <button type="button" className="rk-btn flex-1 !px-2 !py-1.5 text-[11px]" onClick={onPlay}>
              <Play className="h-4 w-4" aria-hidden />
              Jugar Supervivencia
            </button>
            <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1.5 text-[11px]" onClick={onMenu}>
              <Home className="h-4 w-4" aria-hidden />
              Menú
            </button>
          </>
        ) : step.manual ? (
          <button type="button" className="rk-btn flex-1 !px-2 !py-1.5 text-[11px]" onClick={onNext}>
            <Check className="h-4 w-4" aria-hidden />
            Continuar
          </button>
        ) : (
          <>
            <span className="flex-1 text-[10px] text-moss-500">Hazlo y el tutorial avanza solo.</span>
            <button
              type="button"
              className="rk-btn rk-btn-ghost !px-2 !py-1.5 text-[11px]"
              onClick={onNext}
              aria-label="Saltar este paso del tutorial"
            >
              <SkipForward className="h-4 w-4" aria-hidden />
              Saltar
            </button>
          </>
        )}
      </div>
    </section>
  );
}
