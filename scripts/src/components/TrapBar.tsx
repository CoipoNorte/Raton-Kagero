import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, Lock, Timer, Wand2, X } from "lucide-react";
import { SURFACE_TRAPS, TRAPS } from "../game/traps";
import type { SurfaceKind, TrapDef, TrapId } from "../game/types";

/* Barra de trabajo: tres categorías (suelo / pared / techo) y carrusel de
   trampas con scroll táctil, arrastre, rueda, snap, fundidos y autoscroll. */

const SURFACES: Array<{ id: SurfaceKind; label: string; key: string; note: string }> = [
  { id: "floor", label: "Suelo", key: "1", note: "Trampas que se pisan" },
  { id: "wall", label: "Pared", key: "2", note: "Cubren un carril entero" },
  { id: "ceiling", label: "Techo", key: "3", note: "Caen sobre la casilla apuntada" },
];

const TRIGGER_META: Record<TrapDef["trigger"], { label: string; glyph: "dot" | "half" | "tri" | "diamond" }> = {
  auto: { label: "Automatica", glyph: "dot" },
  timed: { label: "Temporizada", glyph: "half" },
  manual: { label: "Manual", glyph: "tri" },
  chain: { label: "En cadena", glyph: "diamond" },
};

export function TrapIcon({ shape, className = "h-6 w-6" }: { shape: TrapDef["shape"]; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (shape) {
    case "peel":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M4 15c3 3 12 4 16-3-2 6-9 8-14 6z" {...common} />
          <path d="M8 17l-3 3M14 19l1 3M18 15l3 1" {...common} />
        </svg>
      );
    case "blob":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M3 14c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5z" {...common} />
          <path d="M7 19v2M12 20v2M17 19v2" {...common} />
        </svg>
      );
    case "clamp":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M3 16h18M5 16l3-5 3 5 3-5 3 5" {...common} />
          <circle cx="12" cy="19" r="1.6" {...common} />
        </svg>
      );
    case "coil":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M5 20h14M5 8h14M6 11h12M6 14h12M6 17h12" {...common} />
          <path d="M9 5h6v3H9z" {...common} />
        </svg>
      );
    case "ramp":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M3 18h18M4 16l14-7" {...common} />
          <path d="M14 6l4 2-2 4" {...common} />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M4 11h16v9H4z" {...common} />
          <path d="M4 11l3-3h10l3 3" {...common} />
          <path d="M12 11V6M10 4.5l2-1.5 2 1.5" {...common} />
        </svg>
      );
    case "rack":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M4 5v14M8 8h5M8 12h7M8 16h5" {...common} />
          <path d="M14 8l3-1.5L14 5M16 12l4-1.5-4-1.5M14 16l3-1.5-3-1.5" {...common} />
        </svg>
      );
    case "fan":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle cx="12" cy="12" r="2" {...common} />
          <path d="M12 10c0-4 6-5 6-1s-4 1-6 1zM14 12c4 0 5 6 1 6s-1-4-1-6zM12 14c0 4-6 5-6 1s4-1 6-1zM10 12c-4 0-5-6-1-6s1 4 1 6z" {...common} />
        </svg>
      );
    case "glove":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M8 6h7a4 4 0 0 1 0 8H9a3 3 0 0 1-3-3V9" {...common} />
          <path d="M6 14l-3 5h6" {...common} />
        </svg>
      );
    case "shelf":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M6 3l12 4-9 14-3-1z" {...common} />
          <path d="M8 8l9 3M7 13l9 3" {...common} />
        </svg>
      );
    case "cannon":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M4 15h11l4-6 2 2-3 7H6z" {...common} />
          <circle cx="8" cy="19" r="2" {...common} />
        </svg>
      );
    case "anvil":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M3 8h13l4-2v4h-3l-2 3H8l1 4h6v3H5v-3h3l1-4H4z" {...common} />
        </svg>
      );
    case "pot":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M6 12h12l-1.5 8h-9z" {...common} />
          <path d="M12 12c-3-2-3-6 0-8 3 2 3 6 0 8z" {...common} />
        </svg>
      );
    case "lamp":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M12 2v5M5 12h14l-3 5H8z" {...common} />
          <path d="M8 20v2M12 20v2M16 20v2" {...common} />
        </svg>
      );
    case "ball":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle cx="12" cy="13" r="8" {...common} />
          <path d="M9 10h.01M13 9h.01M11 13h.01" {...common} strokeWidth={2.4} />
        </svg>
      );
    case "bucket":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M5 9h14l-2 11H7z" {...common} />
          <path d="M8 9a4 4 0 0 1 8 0" {...common} />
          <path d="M19 4l1 2-2 .5" {...common} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="2" {...common} />
        </svg>
      );
  }
}

function Glyph({ kind }: { kind: "dot" | "half" | "tri" | "diamond" }) {
  if (kind === "dot") return <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden />;
  if (kind === "half") return <span className="inline-block h-2.5 w-2.5 rounded-full border border-current" aria-hidden />;
  if (kind === "tri") return <span className="inline-block h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-current" aria-hidden />;
  return <span className="inline-block h-2 w-2 rotate-45 bg-current" aria-hidden />;
}

interface TrapBarProps {
  surface: SurfaceKind;
  onSurface: (s: SurfaceKind) => void;
  selected: TrapId | null;
  onSelect: (id: TrapId | null) => void;
  unlocked: TrapId[];
  cheese: number;
  totalCheese: number;
  orientation?: "row" | "column";
  reduced?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function TrapBar({
  surface,
  onSurface,
  selected,
  onSelect,
  unlocked,
  cheese,
  totalCheese,
  orientation = "row",
  reduced = false,
  onCancel,
  className = "",
}: TrapBarProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const idleUntil = useRef(0);
  const drift = useRef(1);
  const dragging = useRef<{ id: number; x: number; left: number } | null>(null);
  const moved = useRef(false);
  const [edges, setEdges] = useState({ left: false, right: true });
  const list = SURFACE_TRAPS[surface];
  const unlockedSet = new Set(unlocked);

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 8, right: el.scrollLeft < max - 8 });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (orientation !== "row") return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 2) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        idleUntil.current = Date.now() + 3500;
      }
    };
    el.addEventListener("scroll", updateEdges, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", updateEdges);
      el.removeEventListener("wheel", onWheel);
    };
  }, [orientation, surface, updateEdges]);

  useEffect(() => {
    if (reduced || orientation !== "row") return;
    let raf = 0;
    const tick = () => {
      const el = scroller.current;
      if (el && Date.now() > idleUntil.current) {
        const max = el.scrollWidth - el.clientWidth;
        if (max > 48) {
          el.scrollLeft += 0.26 * drift.current;
          if (el.scrollLeft >= max - 1) drift.current = -1;
          else if (el.scrollLeft <= 1) drift.current = 1;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [orientation, reduced, surface]);

  const pause = () => {
    idleUntil.current = Date.now() + 4000;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pause();
    if (orientation !== "row" || e.pointerType !== "mouse") return;
    const el = scroller.current;
    if (!el) return;
    dragging.current = { id: e.pointerId, x: e.clientX, left: el.scrollLeft };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scroller.current;
    const d = dragging.current;
    if (!el || !d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) moved.current = true;
    el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    dragging.current = null;
  };

  const active = selected ? TRAPS[selected] : null;

  return (
    <div
      className={`@container flex min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        {SURFACES.map((s) => {
          const isOn = surface === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSurface(s.id);
                pause();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-pressed={isOn}
              className={`rk-btn flex-1 !px-1.5 !py-2 text-[12px] leading-none transition-transform ${
                isOn ? "" : "rk-btn-ghost !shadow-none"
              }`}
            >
              <span className="flex flex-col items-center gap-0.5">
                <span>{s.label}</span>
                <span className="rk-pixel text-[10px] opacity-85">
                  {s.key} · {SURFACE_TRAPS[s.id].length}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 min-w-0">
        {orientation === "row" && edges.left ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-moss-950 to-transparent" aria-hidden />
        ) : null}
        {orientation === "row" && edges.right ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-moss-950 to-transparent" aria-hidden />
        ) : null}
        <div
          ref={scroller}
          role="listbox"
          aria-label={`Trampas de ${surface}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerEnter={pause}
          className={`rk-scroll min-w-0 max-w-full ${orientation === "row" ? "rk-nosb flex snap-x gap-1.5 overflow-x-auto pb-1" : "flex max-h-full snap-y flex-col gap-1.5 overflow-y-auto pr-1"}`}
        >
          {list.map((t) => {
            const isUnlocked = unlockedSet.has(t.id) || totalCheese >= t.unlock;
            const isSel = selected === t.id;
            const afford = cheese >= t.cost;
            const meta = TRIGGER_META[t.trigger];
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={isSel}
                disabled={!isUnlocked}
                title={isUnlocked ? t.blurb : `Se desbloquea con ${t.unlock} quesos acumulados`}
                onClick={() => {
                  if (moved.current) return;
                  if (!isUnlocked) return;
                  onSelect(isSel ? null : t.id);
                  pause();
                }}
                className={`group relative flex snap-start items-center gap-2 border-2 px-2 py-1.5 text-left transition-all ${
                  orientation === "row" ? "w-[136px] shrink-0 flex-col items-start @[190px]:!w-[184px] @[190px]:!flex-row" : "w-full"
                } ${
                  isSel
                    ? "border-cheese-500 bg-cheese-500/15 shadow-[0_0_18px_rgba(255,207,63,0.25),0_3px_0_#7c5410]"
                    : "border-moss-700 bg-moss-800/85 shadow-[0_3px_0_#07100d] hover:border-brass-500"
                } ${isUnlocked ? "" : "opacity-45"}`}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center border-2 border-moss-950"
                  style={{ background: t.color, color: "#0b1512", boxShadow: `inset 0 0 0 2px ${t.accent}` }}
                >
                  <TrapIcon shape={t.shape} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-tight text-parch-100 rk-truncate-none">{t.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-moss-500">
                    <span className="flex items-center gap-1">
                      <Glyph kind={meta.glyph} />
                      {meta.label}
                    </span>
                    <span className="flex items-center gap-0.5 text-cheese-500">
                      <Coins className="h-3 w-3" />
                      {t.cost}
                    </span>
                    <span className="hidden items-center gap-0.5 @[240px]:flex">
                      <Timer className="h-3 w-3" />
                      {t.armTime.toFixed(1)}s
                    </span>
                  </span>
                </span>
                {orientation === "column" ? (
                  <span className="ml-auto hidden w-[130px] text-[10px] leading-tight text-moss-500 @[420px]:block">{t.blurb}</span>
                ) : null}
                {!isUnlocked ? (
                  <span className="absolute right-1 top-1 flex items-center gap-1 border border-brass-700 bg-moss-950 px-1 py-0.5 rk-pixel text-[10px] text-cheese-400">
                    <Lock className="h-2.5 w-2.5" />
                    {t.unlock}
                  </span>
                ) : null}
                {!afford && isUnlocked ? (
                  <span className="absolute right-1 top-1 rk-pixel text-[10px] text-vhs-500">FALTA</span>
                ) : null}
                {t.lane || t.surface === "wall" ? (
                  <span className="absolute bottom-1 right-1 text-[10px] rk-pixel text-crt-500" aria-hidden>
                    {t.surface === "wall" ? "→" : t.surface === "ceiling" ? "↓" : "•"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-moss-500">
          {active ? (
            <>
              <span className="text-toxic-400">{active.name}:</span> {active.hint}
            </>
          ) : (
            <>
              <span className="text-crt-400">{SURFACES.find((s) => s.id === surface)?.note}.</span> Elige una trampa y toca la casilla.
            </>
          )}
        </p>
        {selected && onCancel ? (
          <button type="button" className="rk-btn rk-btn-ghost shrink-0 !px-2 !py-1 text-[10px]" onClick={onCancel} aria-label="Cancelar selección de trampa">
            <X className="h-4 w-4" />
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TrapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-moss-500">
      {(Object.keys(TRIGGER_META) as Array<keyof typeof TRIGGER_META>).map((k) => (
        <span key={k} className="flex items-center gap-1">
          <Glyph kind={TRIGGER_META[k].glyph} />
          {TRIGGER_META[k].label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <Wand2 className="h-3 w-3" />
        Encadenadas
      </span>
    </div>
  );
}
