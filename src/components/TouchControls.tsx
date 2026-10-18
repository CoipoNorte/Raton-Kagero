import { useCallback, useEffect, useRef } from "react";
import { Ban, Hand, Trash2 } from "lucide-react";
import type { SafeArea } from "../hooks/useLayout";

/* Controles táctiles del modo móvil.
   - layout "rail": se montan sobre el Canvas (móvil apaisado) y se compactan.
   - layout "dock": ocupan una franja propia bajo el Canvas (móvil vertical),
     de modo que no pisan ni la escena ni la barra de trampas.
   Ninguno propaga eventos al raycast: detienen la propagación en el contenedor. */
interface TouchControlsProps {
  joy: React.RefObject<{ x: number; y: number; active: boolean }>;
  onFire: () => void;
  onRemove: () => void;
  onCancel: () => void;
  canCancel: boolean;
  compact: boolean;
  safe: SafeArea;
  layout: "rail" | "dock";
  hint?: string;
}

const RADIUS = 44;

export function TouchControls({
  joy,
  onFire,
  onRemove,
  onCancel,
  canCancel,
  compact,
  safe,
  layout,
  hint,
}: TouchControlsProps) {
  const knob = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  const apply = useCallback(
    (dx: number, dy: number) => {
      const len = Math.hypot(dx, dy);
      const k = len > RADIUS ? RADIUS / len : 1;
      const nx = dx * k;
      const ny = dy * k;
      if (knob.current) knob.current.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
      const j = joy.current;
      if (j) {
        j.x = Math.max(-1, Math.min(1, nx / RADIUS));
        j.y = Math.max(-1, Math.min(1, ny / RADIUS));
        j.active = true;
      }
    },
    [joy],
  );

  const reset = useCallback(() => {
    pointerId.current = null;
    if (knob.current) knob.current.style.transform = "translate3d(0px, 0px, 0)";
    const j = joy.current;
    if (j) {
      j.x = 0;
      j.y = 0;
      j.active = false;
    }
  }, [joy]);

  // Pausar o salir de la partida desmonta los controles: no dejar movimiento retenido.
  useEffect(
    () => () => {
      const j = joy.current;
      if (j) {
        j.x = 0;
        j.y = 0;
        j.active = false;
      }
    },
    [joy],
  );

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = pad.current?.getBoundingClientRect();
    if (!rect) return;
    pointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* captura no disponible: se sigue con los eventos del documento */
    }
    apply(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.stopPropagation();
    const rect = pad.current?.getBoundingClientRect();
    if (!rect) return;
    apply(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* captura ya liberada */
    }
    reset();
  };

  const size = compact ? 88 : 104;
  const fireSize = compact ? 56 : 64;
  const trashSize = compact ? 44 : 50;

  const joystick = (
    <div
      className="pointer-events-auto relative select-none touch-none"
      style={{ width: size, height: size }}
      ref={pad}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="application"
      aria-label="Joystick virtual para mover al ratón inventor"
    >
      <div
        className="absolute inset-0 rounded-full border-2 border-brass-700/80 bg-moss-950/70"
        style={{ boxShadow: "inset 0 0 22px rgba(87,232,213,0.18)" }}
      >
        <div className="absolute inset-0 grid place-items-center text-[10px] rk-pixel text-moss-500">MOVER</div>
      </div>
      <div
        ref={knob}
        className="absolute left-1/2 top-1/2 -ml-[20px] -mt-[20px] h-10 w-10 rounded-full border-2 border-moss-950 bg-cheese-500"
        style={{ boxShadow: "0 3px 0 #7c5410, 0 0 18px rgba(255,207,63,0.4)" }}
      />
    </div>
  );

  const actions = (
    <div className="flex items-end gap-2">
      <button
        type="button"
        className="rk-btn rk-btn-ghost pointer-events-auto grid place-items-center"
        style={{ width: trashSize, height: trashSize }}
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Retirar trampa bajo el cursor"
      >
        <Trash2 className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </button>
      <button
        type="button"
        className="rk-btn pointer-events-auto grid place-items-center !text-parch-100"
        style={{
          background: "linear-gradient(#ff4fa3, #a01e5d)",
          color: "#ffe9f4",
          boxShadow: "0 4px 0 #4d0d2c, 0 8px 14px rgba(0,0,0,0.4)",
          width: fireSize,
          height: fireSize,
        }}
        onClick={onFire}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Activar la trampa manual más cercana"
      >
        <Hand className={compact ? "h-6 w-6" : "h-7 w-7"} />
      </button>
    </div>
  );

  if (layout === "dock") {
    return (
      <div
        className="rk-panel flex shrink-0 items-center justify-between gap-2 px-2 py-1.5"
        style={{ paddingLeft: 2 + safe.left, paddingRight: 2 + safe.right }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {joystick}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
          {canCancel ? (
            <button
              type="button"
              className="rk-btn rk-btn-ghost pointer-events-auto !px-2 !py-1 text-[10px]"
              onClick={onCancel}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Cancelar colocación de trampa"
            >
              <Ban className="h-4 w-4" />
              Cancelar
            </button>
          ) : hint ? (
            <span role="status" aria-live="polite" className="rk-chip max-w-full px-1.5 py-1 text-center text-[10px] leading-tight text-crt-400">{hint}</span>
          ) : (
            <span className="rk-chip max-w-full px-1.5 py-1 text-center text-[10px] leading-tight text-moss-500">Toca la escena para colocar</span>
          )}
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ paddingLeft: safe.left, paddingRight: safe.right, paddingBottom: safe.bottom }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="absolute bottom-2 left-2">{joystick}</div>
      <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1.5">
        {canCancel ? (
          <button
            type="button"
            className="rk-btn rk-btn-ghost pointer-events-auto !px-2 !py-1 text-[10px]"
            onClick={onCancel}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Cancelar colocación de trampa"
          >
            <Ban className="h-4 w-4" />
            Cancelar
          </button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
