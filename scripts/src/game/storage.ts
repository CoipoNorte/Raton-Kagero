import { STORAGE_KEYS } from "./constants";
import type { Progress, QualityId, Settings, ShakeId, TrapId, VhsId } from "./types";
import { DEFAULT_MAP_ID, MAPS, type MapId } from "./maps";

/* Único acceso de la app al almacenamiento. Claves versionadas, validación
   defensiva y fallback en memoria para modo incógnito o cuota agotada. */

const memory = new Map<string, string>();
let volatile = false;

function raw(): Storage | null {
  if (volatile) return null;
  try {
    const s = window.localStorage;
    if (!s) {
      volatile = true;
      return null;
    }
    return s;
  } catch {
    volatile = true;
    return null;
  }
}

function read(key: string): string | null {
  const store = raw();
  if (store) {
    try {
      const v = store.getItem(key);
      if (v !== null) return v;
    } catch {
      volatile = true;
    }
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  memory.set(key, value);
  const store = raw();
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    volatile = true;
  }
}

export const DEFAULT_SETTINGS: Settings = {
  mapId: DEFAULT_MAP_ID,
  sound: true,
  music: true,
  volume: 0.7,
  quality: "medium",
  autoQuality: true,
  shake: "full",
  vhs: "full",
  flashes: true,
  trails: false,
};

export const BASE_UNLOCKED: TrapId[] = ["banana_peel", "glue_patch", "bear_clamp", "spring_coil", "dart_rack", "anvil", "flower_pot"];

export const DEFAULT_PROGRESS: Progress = {
  highScore: 0,
  bestCombo: 0,
  bestChain: 0,
  totalCheese: 0,
  runs: 0,
  catsOut: 0,
  unlocked: BASE_UNLOCKED,
  tutorialDone: false,
};

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "1" || v === "0") return v === "1";
  return fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

interface LooseRecord {
  [key: string]: unknown;
}

function parse(json: string | null): LooseRecord | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as unknown;
    if (data && typeof data === "object" && !Array.isArray(data)) return data as LooseRecord;
  } catch {
    return null;
  }
  return null;
}

export function loadSettings(): Settings {
  const data = parse(read(STORAGE_KEYS.settings));
  if (!data) return { ...DEFAULT_SETTINGS };
  const savedMap = data.mapId;
  return {
    // Si el mapa guardado ya no existe, se vuelve al clásico en vez de romper.
    mapId: typeof savedMap === "string" && savedMap in MAPS ? (savedMap as MapId) : DEFAULT_MAP_ID,
    sound: bool(data.sound, DEFAULT_SETTINGS.sound),
    music: bool(data.music, DEFAULT_SETTINGS.music),
    volume: num(data.volume, 0, 1, DEFAULT_SETTINGS.volume),
    quality: oneOf<QualityId>(data.quality, ["low", "medium", "high"], DEFAULT_SETTINGS.quality),
    autoQuality: bool(data.autoQuality, DEFAULT_SETTINGS.autoQuality),
    shake: oneOf<ShakeId>(data.shake, ["off", "low", "full"], DEFAULT_SETTINGS.shake),
    vhs: oneOf<VhsId>(data.vhs, ["off", "low", "full"], DEFAULT_SETTINGS.vhs),
    flashes: bool(data.flashes, DEFAULT_SETTINGS.flashes),
    trails: bool(data.trails, DEFAULT_SETTINGS.trails),
  };
}

export function saveSettings(settings: Settings): void {
  write(STORAGE_KEYS.settings, JSON.stringify({ v: 1, ...settings }));
}

export function loadProgress(): Progress {
  const data = parse(read(STORAGE_KEYS.progress));
  if (!data) return { ...DEFAULT_PROGRESS };
  const unlockedRaw = Array.isArray(data.unlocked) ? (data.unlocked as unknown[]) : [];
  const unlocked = Array.from(new Set([...BASE_UNLOCKED, ...unlockedRaw.filter((x): x is TrapId => typeof x === "string")]));
  return {
    highScore: Math.floor(num(data.highScore, 0, 9_999_999, 0)),
    bestCombo: Math.floor(num(data.bestCombo, 0, 99, 0)),
    bestChain: Math.floor(num(data.bestChain, 0, 99, 0)),
    totalCheese: Math.floor(num(data.totalCheese, 0, 99_999_999, 0)),
    runs: Math.floor(num(data.runs, 0, 999_999, 0)),
    catsOut: Math.floor(num(data.catsOut, 0, 9_999_999, 0)),
    unlocked,
    tutorialDone: bool(data.tutorialDone, false),
  };
}

export function saveProgress(progress: Progress): void {
  write(STORAGE_KEYS.progress, JSON.stringify({ v: 1, ...progress }));
}

export function storageIsVolatile(): boolean {
  return volatile;
}

/** Desbloqueos: los guardados a mano más los alcanzados por queso histórico. */
export function unlockedFor(progress: Progress, thresholds: Record<TrapId, number>): TrapId[] {
  const set = new Set(progress.unlocked);
  for (const [id, need] of Object.entries(thresholds) as Array<[TrapId, number]>) {
    if (progress.totalCheese >= need) set.add(id);
  }
  return Array.from(set);
}

/* Preparado para migrar a IndexedDB: sólo hay que sustituir read/write. */
export async function migrateToIndexedDB(): Promise<boolean> {
  return Promise.resolve(false);
}
