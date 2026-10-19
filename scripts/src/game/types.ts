/* Tipos compartidos del juego. Ningún módulo de lógica importa React ni Three.js aquí. */

export type SurfaceKind = "floor" | "wall" | "ceiling";
export type WallSide = "back" | "left" | "right";

export type TrapId =
  | "bear_clamp"
  | "banana_peel"
  | "glue_patch"
  | "spring_coil"
  | "tilt_board"
  | "jack_in_box"
  | "dart_rack"
  | "mega_fan"
  | "boxing_glove"
  | "shelf_tip"
  | "cork_cannon"
  | "anvil"
  | "flower_pot"
  | "chandelier"
  | "bowling_ball"
  | "ice_bucket";

export type TrapTrigger = "auto" | "timed" | "manual" | "chain";

export type EffectKind =
  | "snap"
  | "slip"
  | "glue"
  | "launch"
  | "flip"
  | "pop"
  | "shoot"
  | "gust"
  | "punch"
  | "topple"
  | "crush"
  | "roll"
  | "soak"
  | "swing";

export type CatTypeId = "common" | "quick" | "heavy" | "jumper" | "helmet" | "boss";
export type CatState = "walk" | "slip" | "stun" | "air" | "glue" | "attack" | "flee" | "dying";
export type TrapState = "arming" | "ready" | "fired" | "cooldown" | "broken";
export type PopWord =
  | "WHAM"
  | "BOING"
  | "CRUNCH"
  | "SLIP"
  | "STICK"
  | "POW"
  | "DING"
  | "SPLAT"
  | "X2"
  | "X3"
  | "X4"
  | "X5"
  | "CHAIN"
  | "CHEESE"
  | "HURT"
  | "ARMED";

import type { MapId } from "./maps";

export type GameMode = "survival" | "lab";
export type Phase = "menu" | "briefing" | "prep" | "playing" | "paused" | "over";
export type QualityId = "low" | "medium" | "high";
export type ShakeId = "off" | "low" | "full";
export type VhsId = "off" | "low" | "full";
export type EndReason = "time" | "lair" | "mouse" | "quit";

export interface TrapDef {
  id: TrapId;
  name: string;
  surface: SurfaceKind;
  shape: "clamp" | "peel" | "blob" | "coil" | "ramp" | "box" | "rack" | "fan" | "glove" | "shelf" | "cannon" | "anvil" | "pot" | "lamp" | "ball" | "bucket";
  cost: number;
  points: number;
  trigger: TrapTrigger;
  armTime: number;
  cooldown: number;
  radius: number;
  damage: number;
  impulse: number;
  lift: number;
  stun: number;
  slow: number;
  fall: number;
  hold: number;
  uses: number;
  lane: boolean;
  effect: EffectKind;
  word: PopWord;
  color: string;
  accent: string;
  blurb: string;
  hint: string;
  unlock: number;
  chainTags: TrapId[];
}

export interface CatDef {
  id: CatTypeId;
  name: string;
  hp: number;
  speed: number;
  mass: number;
  resist: number;
  damage: number;
  cheese: number;
  points: number;
  scale: number;
  color: string;
  accent: string;
  blurb: string;
  shape: "slim" | "sprint" | "chunk" | "spring" | "dut" | "big";
  minWave: number;
  weight: number;
}

export interface CatSlot {
  live: boolean;
  id: number;
  type: CatTypeId;
  gx: number;
  gz: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  face: number;
  hp: number;
  maxHp: number;
  state: CatState;
  stateT: number;
  animT: number;
  combo: number;
  comboT: number;
  chain: TrapId[];
  hitLock: number;
  hitBy: TrapId | null;
  hitByUid: number | null;
  flash: number;
  stars: number;
  variant: number;
  slide: number;
  spawnT: number;
  lastCellX: number;
  lastCellZ: number;
  route: number[];
  routeT: number;
}

export interface TrapSlot {
  live: boolean;
  uid: number;
  def: TrapId;
  surface: SurfaceKind;
  side: WallSide | null;
  laneIndex: number;
  gx: number;
  gz: number;
  x: number;
  y: number;
  z: number;
  dir: number;
  state: TrapState;
  t: number;
  anim: number;
  uses: number;
  hits: number;
  ownerCell: number;
}

export interface ShotSlot {
  live: boolean;
  id: number;
  trapUid: number;
  def: TrapId;
  kind: "dart" | "cork" | "bowl";
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  t: number;
  hitIds: number[];
}

export interface ParticleSlot {
  live: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  t: number;
  life: number;
  size: number;
  spin: number;
  kind: 0 | 1 | 2;
  color: number;
}

export interface PopupSlot {
  live: boolean;
  word: PopWord;
  x: number;
  y: number;
  z: number;
  t: number;
  life: number;
  rise: number;
  tone: 0 | 1 | 2;
}

export interface GhostCell {
  surface: SurfaceKind;
  side: WallSide | null;
  gx: number;
  gz: number;
  ok: boolean;
  reason: string;
  trapUid: number | null;
}

export interface CellPos {
  gx: number;
  gz: number;
}

export interface HudSnapshot {
  timeLeft: number;
  prepLeft: number;
  score: number;
  cheese: number;
  combo: number;
  comboBest: number;
  chainBest: number;
  lairHp: number;
  lairMax: number;
  lives: number;
  wave: number;
  waveProgress: number;
  defeated: number;
  trapsLive: number;
  trapCap: number;
  fps: number;
  lastPlay: { points: number; label: string; chain: number } | null;
  incoming: number;
}

export interface RunResult {
  mode: GameMode;
  score: number;
  comboBest: number;
  chainBest: number;
  cheese: number;
  defeated: number;
  waves: number;
  reason: EndReason;
  lairHp: number;
  perfect: boolean;
  newRecord: boolean;
  rankLabel: string;
}

export interface Settings {
  /** Última sala elegida en el menú. */
  mapId: MapId;
  sound: boolean;
  music: boolean;
  volume: number;
  quality: QualityId;
  autoQuality: boolean;
  shake: ShakeId;
  vhs: VhsId;
  flashes: boolean;
  trails: boolean;
}

export interface Progress {
  highScore: number;
  bestCombo: number;
  bestChain: number;
  totalCheese: number;
  runs: number;
  catsOut: number;
  unlocked: TrapId[];
  /** El tutorial guiado se terminó al menos una vez. */
  tutorialDone: boolean;
}

export type WorldEvent =
  | { type: "sfx"; name: string; param?: number }
  | { type: "shake"; power: number }
  | { type: "banner"; text: string; tone: "good" | "bad" | "gold" }
  | { type: "end"; reason: EndReason };

export interface WorldOptions {
  mode: GameMode;
  quality: QualityId;
  reducedMotion: boolean;
  emit: (ev: WorldEvent) => void;
  /** Sala donde se juega la ronda. Si falta, se usa la clásica. */
  mapId?: MapId;
}
