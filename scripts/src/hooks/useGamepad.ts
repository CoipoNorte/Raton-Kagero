import { useCallback, useEffect, useRef, useState } from "react";
import { GRID_H, GRID_W } from "../game/constants";
import {
  PAD_CURSOR_REPEAT,
  PAD_STICK_CURSOR_SPEED,
  cycleWallSide,
  pressedIndexes,
  readPad,
  stepCursor,
  type PadAction,
  type PadLike,
} from "../game/gamepad";

export interface GamepadHandlers {
  /** Casilla donde nace el cursor: normalmente la guarida del mapa. */
  home?: { gx: number; gz: number };
  onAction: (action: PadAction) => void;
  onMove?: (x: number, y: number) => void;
  onCursor?: (gx: number, gz: number) => void;
  onWallSide?: (side: "back" | "left" | "right") => void;
  onConnectChange?: (connected: boolean, id: string) => void;
}

export interface GamepadState {
  connected: boolean;
  id: string;
  /** Cursor actual sobre la cuadrícula del suelo. */
  gx: number;
  gz: number;
  side: "back" | "left" | "right";
}

/** Centro de la rejilla, usado si nadie indica otra casilla de origen. */
const GRID_CENTER = { gx: Math.floor(GRID_W / 2), gz: Math.floor(GRID_H / 2) };
const EMPTY: GamepadState = { connected: false, id: "", gx: GRID_CENTER.gx, gz: GRID_CENTER.gz, side: "back" };

function listPads(): PadLike[] {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return [];
  const pads = navigator.getGamepads();
  const out: PadLike[] = [];
  for (const pad of pads) {
    if (!pad) continue;
    out.push({
      id: pad.id,
      connected: pad.connected,
      mapping: pad.mapping,
      axes: pad.axes,
      buttons: pad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
    });
  }
  return out;
}

/**
 * Sondea el mando con un único rAF, mueve el cursor por casillas y traduce
 * pulsaciones en acciones del juego. No usa estado de React por frame.
 */
export function useGamepad(handlers: GamepadHandlers): GamepadState {
  const [state, setState] = useState<GamepadState>(EMPTY);
  const stateRef = useRef<GamepadState>(EMPTY);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const buttonsRef = useRef<Set<number>>(new Set());
  const repeatRef = useRef(0);
  const stickRef = useRef<number>(0);

  // Parche contra el estado más reciente: en un mismo frame puede haber
  // varias publicaciones (conexión + cursor) y no deben pisarse entre sí.
  const publish = useCallback((patch: Partial<GamepadState>) => {
    const prev = stateRef.current;
    const next = { ...prev, ...patch };
    stateRef.current = next;
    if (prev.connected !== next.connected || prev.id !== next.id) {
      setState(next);
      handlersRef.current.onConnectChange?.(next.connected, next.id);
    } else if (prev.gx !== next.gx || prev.gz !== next.gz || prev.side !== next.side) {
      setState(next);
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let alive = true;

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const pads = listPads();
      const pad = pads.find((p) => p.connected) ?? null;
      const reading = readPad(pad, buttonsRef.current);
      buttonsRef.current = pressedIndexes(pad);

      const current = stateRef.current;

      // Sincroniza conexión/desconexión (dispara onConnectChange una sola vez).
      if (reading.connected !== current.connected || reading.id !== current.id) {
        publish({ connected: reading.connected, id: reading.id });
      }

      if (reading.connected) {
        handlersRef.current.onMove?.(reading.move.x, reading.move.y);

        for (const action of reading.pressed) {
          if (action === "wallSide") {
            const side = cycleWallSide(stateRef.current.side);
            publish({ side });
            handlersRef.current.onWallSide?.(side);
            continue;
          }
          if (action === "resetCursor") {
            const home = handlersRef.current.home ?? GRID_CENTER;
            publish({ gx: home.gx, gz: home.gz });
            handlersRef.current.onCursor?.(home.gx, home.gz);
            continue;
          }
          handlersRef.current.onAction(action);
        }

        // Cursor: stick derecho con repetición, cruceta con paso inmediato.
        const stickMag = Math.hypot(reading.cursor.x, reading.cursor.y);
        let dx = 0;
        let dz = 0;
        if (stickMag > 0.28) {
          repeatRef.current += dt;
          if (repeatRef.current >= PAD_CURSOR_REPEAT) {
            repeatRef.current = 0;
            dx = Math.sign(reading.cursor.x);
            dz = Math.sign(reading.cursor.y);
          }
        } else {
          repeatRef.current = 0;
        }
        if (reading.pressed.has("cursorLeft")) dx -= 1;
        if (reading.pressed.has("cursorRight")) dx += 1;
        if (reading.pressed.has("cursorUp")) dz -= 1;
        if (reading.pressed.has("cursorDown")) dz += 1;
        if (dx !== 0 || dz !== 0) {
          const from = stateRef.current;
          const step = stepCursor({ gx: from.gx, gz: from.gz }, dx, dz, GRID_W, GRID_H);
          if (step.changed) {
            publish({ gx: step.gx, gz: step.gz });
            handlersRef.current.onCursor?.(step.gx, step.gz);
          }
        }
        stickRef.current += dt * PAD_STICK_CURSOR_SPEED * stickMag;
      } else {
        handlersRef.current.onMove?.(0, 0);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      handlersRef.current.onMove?.(0, 0);
    };
  }, [publish]);

  return state;
}
