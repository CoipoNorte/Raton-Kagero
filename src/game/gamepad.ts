/* Mapeo puro de Gamepad API. Sin DOM ni React: se puede testear con objetos
   falsos y no depende del navegador concreto. */

export const PAD_DEADZONE = 0.24;
export const PAD_CURSOR_REPEAT = 0.16;
export const PAD_STICK_CURSOR_SPEED = 3.4; // casillas por segundo

export type PadAction =
  | "place"
  | "cancel"
  | "cycle"
  | "cycleBack"
  | "fire"
  | "surfaceNext"
  | "surfacePrev"
  | "pause"
  | "trails"
  | "wallSide"
  | "resetCursor"
  | "cursorUp"
  | "cursorDown"
  | "cursorLeft"
  | "cursorRight";

/** Botón físico (índice estándar) -> acción del juego. */
export const PAD_BUTTONS: ReadonlyArray<readonly [number, PadAction]> = [
  [0, "place"], // A / cruz
  [1, "cancel"], // B / círculo
  [2, "cycle"], // X / cuadrado
  [3, "fire"], // Y / triángulo
  [4, "surfacePrev"], // LB
  [5, "surfaceNext"], // RB
  [6, "wallSide"], // LT
  [7, "resetCursor"], // RT
  [8, "trails"], // Select / Back
  [9, "pause"], // Start
  [10, "cycleBack"], // L3
  [12, "cursorUp"],
  [13, "cursorDown"],
  [14, "cursorLeft"],
  [15, "cursorRight"],
] as const;

export interface PadLike {
  readonly id: string;
  readonly connected: boolean;
  readonly mapping: string;
  readonly axes: readonly number[];
  readonly buttons: ReadonlyArray<{ pressed: boolean; value: number }>;
}

export interface PadAxis {
  x: number;
  y: number;
}

export interface PadReading {
  connected: boolean;
  id: string;
  /** Stick izquierdo: mueve al inventor. */
  move: PadAxis;
  /** Stick derecho: mueve el cursor de colocación. */
  cursor: PadAxis;
  /** Acciones que acaban de pulsarse en este frame. */
  pressed: ReadonlySet<PadAction>;
  /** Acciones mantenidas. */
  held: ReadonlySet<PadAction>;
}

function axis(pad: PadLike, index: number): number {
  const raw = pad.axes[index] ?? 0;
  if (!Number.isFinite(raw)) return 0;
  if (Math.abs(raw) < PAD_DEADZONE) return 0;
  const scaled = (raw - Math.sign(raw) * PAD_DEADZONE) / (1 - PAD_DEADZONE);
  return Math.max(-1, Math.min(1, scaled));
}

function buttonDown(pad: PadLike, index: number): boolean {
  const b = pad.buttons[index];
  if (!b) return false;
  return b.pressed || b.value > 0.5;
}

/** Lee un mando y devuelve el estado del frame, detectando flancos de botón. */
export function readPad(pad: PadLike | null | undefined, previous: ReadonlySet<number> = new Set()): PadReading {
  const pressed = new Set<PadAction>();
  const held = new Set<PadAction>();
  if (!pad || !pad.connected) {
    return { connected: false, id: "", move: { x: 0, y: 0 }, cursor: { x: 0, y: 0 }, pressed, held };
  }

  for (const [index, action] of PAD_BUTTONS) {
    const down = buttonDown(pad, index);
    if (!down) continue;
    held.add(action);
    if (!previous.has(index)) pressed.add(action);
  }

  const dpadX = (buttonDown(pad, 15) ? 1 : 0) - (buttonDown(pad, 14) ? 1 : 0);
  const dpadY = (buttonDown(pad, 13) ? 1 : 0) - (buttonDown(pad, 12) ? 1 : 0);

  return {
    connected: true,
    id: pad.id,
    move: { x: axis(pad, 0) + dpadX, y: axis(pad, 1) + dpadY },
    cursor: { x: axis(pad, 2), y: axis(pad, 3) },
    pressed,
    held,
  };
}

/** Índices de botón que están pulsados (para detectar flancos en el frame siguiente). */
export function pressedIndexes(pad: PadLike | null | undefined): Set<number> {
  const out = new Set<number>();
  if (!pad || !pad.connected) return out;
  for (let i = 0; i < pad.buttons.length; i++) if (buttonDown(pad, i)) out.add(i);
  return out;
}

export interface CursorCell {
  gx: number;
  gz: number;
}

export interface CursorStep {
  gx: number;
  gz: number;
  changed: boolean;
}

/** Mueve el cursor una celda, respetando los límites de la cuadrícula. */
export function stepCursor(current: CursorCell, dx: number, dz: number, cols: number, rows: number): CursorStep {
  const gx = Math.max(0, Math.min(cols - 1, current.gx + dx));
  const gz = Math.max(0, Math.min(rows - 1, current.gz + dz));
  return { gx, gz, changed: gx !== current.gx || gz !== current.gz };
}

/** Cicla la pared elegida: fondo -> izquierda -> derecha -> fondo. */
export function cycleWallSide(side: "back" | "left" | "right"): "back" | "left" | "right" {
  if (side === "back") return "left";
  if (side === "left") return "right";
  return "back";
}

/** Leyenda de controles para la interfaz. */
export const PAD_LEGEND: ReadonlyArray<readonly [string, string]> = [
  ["Stick izq.", "Mover al inventor"],
  ["Stick der. / cruceta", "Cursor de colocación"],
  ["A", "Colocar"],
  ["B", "Cancelar / retirar"],
  ["X", "Rotar trampa"],
  ["Y", "Disparar manual"],
  ["LB / RB", "Categoría de trampa"],
  ["LT", "Cambiar de pared"],
  ["Start", "Pausa"],
];
