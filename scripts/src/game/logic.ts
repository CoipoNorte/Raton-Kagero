import {
  AMBIENT_BONUS,
  BOSS_WAVE,
  CELL,
  COMBO_MULTIPLIERS,
  FINISHER_BONUS,
  GRID_H,
  GRID_W,
  NEAR_BONUS_MULT,
  RANKS,
  SPAWN_MIN,
  SPAWN_START,
  VARIETY_BONUS,
  WAVE_SECONDS,
  WAVE_TABLE,
} from "./constants";
import { CATS } from "./enemies";
import { TRAPS } from "./traps";
import type { CatTypeId, SurfaceKind, TrapId, TrapSlot, WallSide } from "./types";
import type { GameMap } from "./maps";
import type { Rng } from "./random";

/* ------------------------------------------------------------------ */
/* Matemática de la cuadrícula (pura, sin Three.js)                   */
/* ------------------------------------------------------------------ */

export const CELL_COUNT = GRID_W * GRID_H;

export function cellToWorldX(gx: number): number {
  return (gx - (GRID_W - 1) / 2) * CELL;
}

export function cellToWorldZ(gz: number): number {
  return (gz - (GRID_H - 1) / 2) * CELL;
}

export function worldToCellGX(x: number): number {
  return clampInt(Math.round(x / CELL + (GRID_W - 1) / 2), 0, GRID_W - 1);
}

export function worldToCellGZ(z: number): number {
  return clampInt(Math.round(z / CELL + (GRID_H - 1) / 2), 0, GRID_H - 1);
}

export function clampInt(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : Math.round(v);
}

export function inBounds(gx: number, gz: number): boolean {
  return gx >= 0 && gz >= 0 && gx < GRID_W && gz < GRID_H;
}

export function cellIndex(gx: number, gz: number): number {
  return gz * GRID_W + gx;
}

export function indexToCell(index: number): { gx: number; gz: number } {
  return { gx: index % GRID_W, gz: Math.floor(index / GRID_W) };
}

export function isLairCell(map: GameMap, gx: number, gz: number): boolean {
  return gx === map.lair.gx && gz === map.lair.gz;
}

export function isFurnitureCell(map: GameMap, gx: number, gz: number): boolean {
  if (!inBounds(gx, gz)) return true;
  for (const f of map.furniture) if (f.gx === gx && f.gz === gz) return true;
  return false;
}

/**
 * Máscara por casilla. Se usa Uint8Array en vez de bits: la rejilla tiene 63
 * casillas y los enteros de JS sólo desplazan 32 bits.
 */
export type CellMask = Uint8Array;

export const EMPTY_MASK = (): CellMask => new Uint8Array(CELL_COUNT);

export function maskHas(mask: CellMask, gx: number, gz: number): boolean {
  if (!inBounds(gx, gz)) return true;
  return mask[cellIndex(gx, gz)] === 1;
}

/** Máscara de celdas donde ningún gato puede pisar (muebles + quesera). */
export function blockedWalkMask(map: GameMap): CellMask {
  const mask = EMPTY_MASK();
  for (let gz = 0; gz < GRID_H; gz++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      if (isFurnitureCell(map, gx, gz) || isLairCell(map, gx, gz)) mask[cellIndex(gx, gz)] = 1;
    }
  }
  return mask;
}

/** Anillo de celdas contiguas a la quesera desde las que los gatos la atacan. */
export function lairGoalMask(map: GameMap): CellMask {
  const mask = EMPTY_MASK();
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = map.lair.gx + dx;
      const gz = map.lair.gz + dz;
      if (!inBounds(gx, gz)) continue;
      if (isFurnitureCell(map, gx, gz)) continue;
      mask[cellIndex(gx, gz)] = 1;
    }
  }
  return mask;
}

/** Campo de flujo BFS: distancia más corta a la quesera para cada casilla. */
export function buildFlowField(blocked: CellMask, goals: CellMask): Int16Array {
  const dist = new Int16Array(CELL_COUNT).fill(32767);
  const queue: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (goals[i] === 1 && blocked[i] === 0) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    const { gx, gz } = indexToCell(cur);
    const nd = dist[cur] + 1;
    const neighbours: number[] = [];
    if (gx + 1 < GRID_W) neighbours.push(cur + 1);
    if (gx - 1 >= 0) neighbours.push(cur - 1);
    if (gz + 1 < GRID_H) neighbours.push(cur + GRID_W);
    if (gz - 1 >= 0) neighbours.push(cur - GRID_W);
    for (const n of neighbours) {
      if (blocked[n] === 1) continue;
      if (dist[n] > nd) {
        dist[n] = nd;
        queue.push(n);
      }
    }
  }
  return dist;
}

/** Siguiente casilla siguiendo el gradiente del campo de flujo. */
export function flowStep(dist: Int16Array, gx: number, gz: number): { gx: number; gz: number } | null {
  if (!inBounds(gx, gz)) return null;
  const cur = dist[cellIndex(gx, gz)];
  let best: { gx: number; gz: number } | null = null;
  let bestVal = cur;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx !== 0 && dz !== 0) continue;
      const nx = gx + dx;
      const nz = gz + dz;
      if (!inBounds(nx, nz)) continue;
      const v = dist[cellIndex(nx, nz)];
      if (v < bestVal) {
        bestVal = v;
        best = { gx: nx, gz: nz };
      }
    }
  }
  return best;
}

/** Distancia en casillas hasta la quesera (para decisiones de IA y avisos). */
export function distanceToLair(dist: Int16Array, gx: number, gz: number): number {
  if (!inBounds(gx, gz)) return 99;
  const v = dist[cellIndex(gx, gz)];
  return v === 32767 ? 99 : v;
}

/* ------------------------------------------------------------------ */
/* Superficies y validación de colocación                              */
/* ------------------------------------------------------------------ */

export interface Target {
  surface: SurfaceKind;
  side: WallSide;
  index: number;
}

export function cellTarget(gx: number, gz: number, surface: SurfaceKind): Target {
  return { surface, side: "back", index: cellIndex(gx, gz) };
}

export function wallTarget(side: WallSide, index: number): Target {
  return { surface: "wall", side, index };
}

export function targetCell(t: Target): { gx: number; gz: number } {
  if (t.surface !== "wall") return indexToCell(t.index);
  if (t.side === "back") return { gx: clampInt(t.index, 0, GRID_W - 1), gz: 0 };
  return { gx: t.side === "left" ? 0 : GRID_W - 1, gz: clampInt(t.index, 0, GRID_H - 1) };
}

export function wallLaneCount(side: WallSide): number {
  return side === "back" ? GRID_W : GRID_H;
}

/** Punto del mundo donde se ancla una trampa de pared y hacia dónde empuja. */
export function wallAnchor(side: WallSide, index: number): { x: number; z: number; dir: number } {
  if (side === "back") {
    return { x: cellToWorldX(index), z: cellToWorldZ(0) - CELL * 0.92, dir: 0 };
  }
  if (side === "left") {
    return { x: cellToWorldX(0) - CELL * 0.92, z: cellToWorldZ(index), dir: 1 };
  }
  return { x: cellToWorldX(GRID_W - 1) + CELL * 0.92, z: cellToWorldZ(index), dir: 3 };
}

/** Dirección de empuje de una trampa de pared como vector (dx, dz). */
export function pushVector(side: WallSide): { dx: number; dz: number } {
  if (side === "back") return { dx: 0, dz: 1 };
  if (side === "left") return { dx: 1, dz: 0 };
  return { dx: -1, dz: 0 };
}

export interface PlacementVerdict {
  ok: boolean;
  reason: string;
  conflictUid: number | null;
}

export interface PlacementContext {
  traps: readonly TrapSlot[];
  cheese: number;
  cap: number;
  editable: boolean;
  blocked: CellMask;
  /** Sala activa: determina qué casilla es la guarida. */
  map: GameMap;
}

/** Reglas puras: superficie correcta, casilla libre, coste, límite y compatibilidad. */
export function validatePlacement(target: Target, trapId: TrapId, ctx: PlacementContext): PlacementVerdict {
  const def = TRAPS[trapId];
  if (!def) return { ok: false, reason: "Trampa desconocida", conflictUid: null };
  if (target.surface !== def.surface) {
    return { ok: false, reason: `Necesita superficie de ${def.surface === "floor" ? "suelo" : def.surface === "wall" ? "pared" : "techo"}`, conflictUid: null };
  }

  if (ctx.traps.filter((t) => t.live).length >= ctx.cap) {
    return { ok: false, reason: `Limite de ${ctx.cap} trampas activas`, conflictUid: null };
  }
  if (ctx.cheese < def.cost) {
    return { ok: false, reason: `Faltan quesos: ${def.cost}`, conflictUid: null };
  }

  if (target.surface === "wall") {
    if (target.index < 0 || target.index >= wallLaneCount(target.side)) {
      return { ok: false, reason: "Fuera de la pared", conflictUid: null };
    }
    const sameLane = ctx.traps.filter(
      (t) => t.live && t.surface === "wall" && t.side === target.side && t.laneIndex === target.index,
    );
    const duplicates = sameLane.filter((t) => t.def === trapId).length;
    if (duplicates > 0) {
      return { ok: false, reason: "Ese carril ya tiene esa trampa", conflictUid: sameLane[0].uid };
    }
    if (sameLane.length >= 3) {
      return { ok: false, reason: "Carril saturado", conflictUid: sameLane[sameLane.length - 1].uid };
    }
    return { ok: true, reason: "Carril libre", conflictUid: null };
  }

  if (!Number.isInteger(target.index) || target.index < 0 || target.index >= CELL_COUNT) {
    return { ok: false, reason: "Fuera de la habitacion", conflictUid: null };
  }
  const { gx, gz } = indexToCell(target.index);

  if (target.surface === "floor") {
    if (isLairCell(ctx.map, gx, gz)) return { ok: false, reason: "No sobre la quesera", conflictUid: null };
    if (ctx.blocked[cellIndex(gx, gz)] === 1) {
      return { ok: false, reason: "Mueble encima", conflictUid: null };
    }
    const clash = ctx.traps.find((t) => t.live && t.surface === "floor" && t.gx === gx && t.gz === gz);
    if (clash) {
      return { ok: false, reason: "Casilla de suelo ocupada", conflictUid: clash.uid };
    }
  } else {
    const clash = ctx.traps.find((t) => t.live && t.surface === "ceiling" && t.gx === gx && t.gz === gz);
    if (clash) {
      return { ok: false, reason: "Ya hay algo colgando aqui", conflictUid: clash.uid };
    }
    if (trapId === "chandelier") {
      const lamps = ctx.traps.filter((t) => t.live && t.def === "chandelier").length;
      if (lamps >= 1) return { ok: false, reason: "Solo una lampara a la vez", conflictUid: null };
    }
  }

  return { ok: true, reason: "Casilla libre", conflictUid: null };
}

/** ¿Se puede retirar? Sólo durante la preparación y en el Laboratorio. */
export function canRemove(phase: string, labMode: boolean): boolean {
  return labMode || phase === "prep";
}

/* ------------------------------------------------------------------ */
/* Combos y puntuación                                                 */
/* ------------------------------------------------------------------ */

export function comboMultiplier(hitIndex: number): number {
  const i = clampInt(Math.min(hitIndex, COMBO_MULTIPLIERS.length - 1), 0, COMBO_MULTIPLIERS.length - 1);
  return COMBO_MULTIPLIERS[i];
}

export interface HitScoreInput {
  base: number;
  hitIndex: number;
  variety: boolean;
  nearInventor: boolean;
  kill: boolean;
  multi: number;
  chainLength: number;
}

export interface HitScore {
  points: number;
  multiplier: number;
  finisher: boolean;
  cheeseBonus: boolean;
}

export function scoreForHit(input: HitScoreInput): HitScore {
  const multiplier = comboMultiplier(input.hitIndex);
  let points = input.base * multiplier;
  if (input.variety) points += VARIETY_BONUS;
  if (input.multi > 1) points += AMBIENT_BONUS * Math.min(3, input.multi - 1);
  const cheeseBonus = input.nearInventor;
  if (cheeseBonus) points *= NEAR_BONUS_MULT;
  const finisher = input.kill && input.chainLength >= 3;
  if (finisher) points += FINISHER_BONUS;
  return {
    points: Math.max(5, Math.round(points)),
    multiplier,
    finisher,
    cheeseBonus,
  };
}

export function cheeseForHit(def: TrapId, kill: boolean, catType: CatTypeId): number {
  const trap = TRAPS[def];
  const cat = CATS[catType];
  if (!trap || !cat) return 1;
  if (kill) return Math.max(2, Math.round(cat.cheese * 0.75));
  return trap.cost <= 10 ? 2 : 3;
}

export function endBonus(lairHp: number, perfect: boolean): number {
  return Math.max(0, Math.round(lairHp * (perfect ? PERFECT_BONUS_FACTOR : 1)));
}

const PERFECT_BONUS_FACTOR = 14;

export function rankLabel(score: number): string {
  let label = RANKS[0][1];
  for (const [min, text] of RANKS) if (score >= min) label = text;
  return label;
}

/* ------------------------------------------------------------------ */
/* Oleadas                                                             */
/* ------------------------------------------------------------------ */

export function waveForTime(elapsed: number): number {
  return Math.floor(elapsed / WAVE_SECONDS) + 1;
}

export function waveProgress(elapsed: number): number {
  return (elapsed % WAVE_SECONDS) / WAVE_SECONDS;
}

export function spawnDelay(wave: number): number {
  const d = SPAWN_START - (wave - 1) * 0.22;
  return Math.max(SPAWN_MIN, d);
}

export function pickCatType(rng: Rng, wave: number): CatTypeId {
  const row = WAVE_TABLE[Math.min(wave - 1, WAVE_TABLE.length - 1)] ?? WAVE_TABLE[0];
  const usable = row.filter(([type, w]) => w > 0 && CATS[type].minWave <= wave && (type !== "boss" || wave >= BOSS_WAVE));
  const list: Array<readonly [CatTypeId, number]> = usable.length > 0 ? usable : [["common", 1]];
  const picked = rng.weighted(list, (entry) => entry[1]);
  return picked[0];
}

export function waveLabel(wave: number): string {
  return `Oleada ${String(wave).padStart(2, "0")}`;
}
