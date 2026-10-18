import type { CatTypeId, PopWord, QualityId, TrapId } from "./types";

/* ---------- Cuadrícula de la habitación ---------- */
export const GRID_W = 11;
export const GRID_H = 9;
export const CELL = 1.2;
export const WALL_HEIGHT = 3.4;

export const ROOM_W = GRID_W * CELL;
export const ROOM_D = GRID_H * CELL;

/** Margen de suelo visible más allá de la zona jugable. */
export const FLOOR_MARGIN = CELL;

/* ---------- Escala de texturas ----------
   Los tamaños de baldosa se expresan en unidades de mundo, no en
   repeticiones fijas: así el patrón conserva su proporción aunque la sala
   cambie de tamaño, y es idéntico en las tres paredes. */
/**
 * Una celda por tabla: las juntas del suelo caen justo sobre la rejilla de
 * juego, así se ve a simple vista qué casilla se está apuntando.
 */
export const FLOOR_TILE = CELL;
/** Baldosa cuadrada de papel pintado (media altura de pared). */
export const WALL_TILE = WALL_HEIGHT / 2;

/*
 * Extensión de la sala proyectada en isométrica. La planta ocupa
 * (ancho + fondo) · cos 45° de ancho en pantalla, y la mitad de eso más la
 * altura de pared de alto. Sirve para encuadrar la cámara sin números
 * mágicos: si la sala cambia de tamaño, el encuadre la sigue.
 */
export const ROOM_ISO_W = (ROOM_W + ROOM_D) * Math.SQRT1_2;
export const ROOM_ISO_H = ROOM_ISO_W * 0.5 + WALL_HEIGHT;


/*
 * El reparto concreto de muebles, entradas y guarida vive en `maps.ts`:
 * aquí sólo queda lo que comparten todas las salas (rejilla y escalas).
 */

/* ---------- Reglas de partida ---------- */
export const ROUND_TIME = 90;
export const PREP_TIME = 10;
export const LAIR_HP = 100;
export const MOUSE_LIVES = 3;
export const START_CHEESE = 65;
export const CHEESE_PER_HIT = 2;
export const NEAR_BONUS_RADIUS = 3.1;
export const NEAR_BONUS_MULT = 1.25;
export const PERFECT_LAIR_BONUS = 14;

export const COMBO_WINDOW = 2.5;
export const COMBO_MULTIPLIERS: readonly number[] = [1, 2, 3, 5];
export const VARIETY_BONUS = 45;
export const FINISHER_BONUS = 120;
export const AMBIENT_BONUS = 30;

export const MOUSE_SPEED = 4.1;
export const MOUSE_RUN = 6.0;

export const CAT_CAP_BY_QUALITY: Record<QualityId, number> = { low: 7, medium: 10, high: 14 };
export const TRAP_CAP_BY_QUALITY: Record<QualityId, number> = { low: 9, medium: 13, high: 18 };
export const PARTICLE_CAP_BY_QUALITY: Record<QualityId, number> = { low: 42, medium: 90, high: 160 };
export const DPR_CAP_BY_QUALITY: Record<QualityId, number> = { low: 1, medium: 1.25, high: 1.5 };
export const RENDER_SCALE = 0.78;
export const SHADOWS_BY_QUALITY: Record<QualityId, boolean> = { low: false, medium: false, high: true };

export const POOL_CATS = 16;
export const POOL_TRAPS = 22;
export const POOL_SHOTS = 20;
export const POOL_POPUPS = 16;

export const FIXED_DT = 1 / 60;
export const MAX_STEPS = 5;
export const HUD_INTERVAL = 0.12;

/* ---------- Oleadas ---------- */
export const WAVE_SECONDS = 12;
export const SPAWN_START = 2.3;
export const SPAWN_MIN = 0.75;
export const BOSS_WAVE = 6;

export const WAVE_TABLE: ReadonlyArray<ReadonlyArray<readonly [CatTypeId, number]>> = [
  [["common", 8], ["quick", 2]],
  [["common", 7], ["quick", 3]],
  [["common", 6], ["quick", 4], ["jumper", 2]],
  [["common", 5], ["quick", 4], ["jumper", 3], ["helmet", 2]],
  [["common", 4], ["quick", 4], ["jumper", 3], ["helmet", 3], ["heavy", 2]],
  [["quick", 4], ["jumper", 4], ["helmet", 4], ["heavy", 3]],
  [["quick", 3], ["jumper", 3], ["helmet", 4], ["heavy", 4], ["boss", 1]],
];

/* ---------- Palabras flotantes ---------- */
export const POP_WORDS: Record<PopWord, string> = {
  WHAM: "WHAM!",
  BOING: "BOING!",
  CRUNCH: "CRUNCH!",
  SLIP: "SLIP!",
  STICK: "STICKY!",
  POW: "POW!",
  DING: "DING!",
  SPLAT: "SPLAT!",
  X2: "COMBO x2!",
  X3: "COMBO x3!",
  X4: "COMBO x4!",
  X5: "COMBO x5!",
  CHAIN: "TRAP CHAIN!",
  CHEESE: "CHEESE BONUS!",
  HURT: "MI QUESO!",
  ARMED: "LISTA",
};

export const COMBO_WORD_BY_INDEX: readonly PopWord[] = ["DING", "X2", "X3", "X4", "X5"];

/* ---------- Puntuación ---------- */
export const RANKS: ReadonlyArray<readonly [number, string]> = [
  [0, "Raton de despecho"],
  [900, "Aprendiz de muelle"],
  [2200, "Ingeniero de caceria"],
  [4200, "Maestro de la trampa"],
  [7000, "Kagero: gato fantasma"],
  [11000, "Leyenda de la quesera"],
];

export const TRAP_ORDER: TrapId[] = [
  "banana_peel",
  "glue_patch",
  "bear_clamp",
  "spring_coil",
  "tilt_board",
  "jack_in_box",
  "dart_rack",
  "boxing_glove",
  "mega_fan",
  "cork_cannon",
  "shelf_tip",
  "anvil",
  "flower_pot",
  "ice_bucket",
  "bowling_ball",
  "chandelier",
];

export const STORAGE_KEYS = {
  progress: "raton-kagero:v1:progress",
  settings: "raton-kagero:v1:settings",
} as const;
