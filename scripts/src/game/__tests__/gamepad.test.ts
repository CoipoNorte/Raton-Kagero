import { describe, expect, it } from "vitest";
import {
  PAD_BUTTONS,
  PAD_DEADZONE,
  cycleWallSide,
  pressedIndexes,
  readPad,
  stepCursor,
  type PadLike,
} from "../gamepad";

interface PadSpec {
  id?: string;
  connected?: boolean;
  axes?: readonly number[];
  buttons?: number[];
}

function pad(over: PadSpec = {}): PadLike {
  const pressed = new Set(over.buttons ?? []);
  return {
    id: over.id ?? "Test Pad",
    connected: over.connected ?? true,
    mapping: "standard",
    axes: over.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.has(i), value: pressed.has(i) ? 1 : 0 })),
  };
}

describe("mapeo de mando", () => {
  it("detecta flancos de botón sin repetir mientras se mantiene", () => {
    const p = pad({ buttons: [0] });
    const first = readPad(p, new Set());
    expect(first.pressed.has("place")).toBe(true);
    expect(first.held.has("place")).toBe(true);
    const second = readPad(p, pressedIndexes(p));
    expect(second.pressed.has("place")).toBe(false);
    expect(second.held.has("place")).toBe(true);
  });

  it("asigna cada acción a su botón físico", () => {
    const p = pad({ buttons: PAD_BUTTONS.map(([i]) => i) });
    const reading = readPad(p, new Set());
    for (const [, action] of PAD_BUTTONS) {
      expect(reading.pressed.has(action)).toBe(true);
    }
  });

  it("aplica zona muerta y normaliza el stick", () => {
    const small = readPad(pad({ axes: [PAD_DEADZONE * 0.5, 0, 0, 0] }));
    expect(small.move.x).toBe(0);
    const full = readPad(pad({ axes: [1, -1, 0, 0] }));
    expect(full.move.x).toBeCloseTo(1, 5);
    expect(full.move.y).toBeCloseTo(-1, 5);
    const half = readPad(pad({ axes: [0.5, 0, 0, 0] }));
    expect(half.move.x).toBeGreaterThan(0);
    expect(half.move.x).toBeLessThan(1);
  });

  it("suma la cruceta al stick izquierdo", () => {
    const reading = readPad(pad({ buttons: [15] }));
    expect(reading.move.x).toBe(1);
  });

  it("mantiene el cursor dentro de la cuadrícula", () => {
    expect(stepCursor({ gx: 0, gz: 0 }, -1, 0, 9, 7)).toEqual({ gx: 0, gz: 0, changed: false });
    expect(stepCursor({ gx: 8, gz: 6 }, 1, 1, 9, 7)).toEqual({ gx: 8, gz: 6, changed: false });
    expect(stepCursor({ gx: 4, gz: 3 }, 1, -1, 9, 7)).toEqual({ gx: 5, gz: 2, changed: true });
  });

  it("cicla las tres paredes sin repetir", () => {
    const seen = new Set<string>();
    let side: "back" | "left" | "right" = "back";
    for (let i = 0; i < 3; i++) {
      side = cycleWallSide(side);
      seen.add(side);
    }
    expect(seen.size).toBe(3);
  });

  it("devuelve estado vacío si el mando está desconectado", () => {
    const reading = readPad(null);
    expect(reading.connected).toBe(false);
    expect(reading.move.x).toBe(0);
    expect(reading.pressed.size).toBe(0);
    const off = readPad({ ...pad(), connected: false });
    expect(off.connected).toBe(false);
  });
});
