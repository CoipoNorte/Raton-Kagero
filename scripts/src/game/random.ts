/* Generador pseudoaleatorio con semilla (mulberry32). Determinista para pruebas. */

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T;
  chance(probability: number): boolean;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length) % items.length];
    },
    weighted(items, weightOf) {
      let total = 0;
      for (const item of items) total += Math.max(0, weightOf(item));
      if (total <= 0) return items[0];
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, weightOf(item));
        if (roll <= 0) return item;
      }
      return items[items.length - 1];
    },
    chance(probability) {
      return next() < probability;
    },
  };
}

export function hashSeed(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h ^= Math.imul(p | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
  }
  return h >>> 0;
}
