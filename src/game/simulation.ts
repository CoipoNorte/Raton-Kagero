import {
  CAT_CAP_BY_QUALITY,
  CELL,
  CHEESE_PER_HIT,
  GRID_H,
  GRID_W,
  COMBO_WINDOW,
  COMBO_WORD_BY_INDEX,
  FIXED_DT,
  HUD_INTERVAL,
  LAIR_HP,
  MAX_STEPS,
  MOUSE_LIVES,
  MOUSE_RUN,
  MOUSE_SPEED,
  PARTICLE_CAP_BY_QUALITY,
  POOL_CATS,
  POOL_POPUPS,
  POOL_SHOTS,
  POOL_TRAPS,
  PREP_TIME,
  RENDER_SCALE,
  ROUND_TIME,
  START_CHEESE,
  TRAP_CAP_BY_QUALITY,
  ROOM_D,
  ROOM_W,
  WALL_HEIGHT,
} from "./constants";
import { CATS } from "./enemies";
import { getMap, type GameMap, type MapId } from "./maps";
import {
  blockedWalkMask,
  buildFlowField,
  cellToWorldX,
  cellToWorldZ,
  cheeseForHit,
  type CellMask,
  clampInt,
  distanceToLair,
  flowStep,
  indexToCell,
  isLairCell,
  lairGoalMask,
  scoreForHit,
  spawnDelay,
  targetCell,
  validatePlacement,
  wallAnchor,
  waveForTime,
  waveProgress,
  pickCatType,
  worldToCellGX,
  worldToCellGZ,
  type Target,
} from "./logic";
import { createRng, hashSeed } from "./random";
import type { Rng } from "./random";
import { TRAPS } from "./traps";
import type {
  CatSlot,
  CatTypeId,
  GameMode,
  ParticleSlot,
  PopupSlot,
  PopWord,
  ShotSlot,
  TrapId,
  TrapSlot,
  WallSide,
  WorldEvent,
  WorldOptions,
  HudSnapshot,
  RunResult,
  EndReason,
  QualityId,
} from "./types";
import { rankLabel } from "./logic";

const GRAVITY = 22;
const FLOOR_LIMIT_X = ROOM_W / 2 - 0.18;
const FLOOR_LIMIT_Z = ROOM_D / 2 - 0.18;
const WALL_HIT_LIMIT = ROOM_W / 2;

const SFX_BY_EFFECT: Record<string, string> = {
  slip: "slip",
  glue: "pop",
  snap: "clang",
  launch: "boing",
  flip: "boing",
  pop: "pop",
  shoot: "dart",
  gust: "fan",
  punch: "punch",
  topple: "clang",
  crush: "anvil",
  roll: "clang",
  soak: "splash",
  swing: "anvil",
};

function emptyCat(id: number): CatSlot {
  return {
    live: false,
    id,
    type: "common",
    gx: 0,
    gz: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    face: 0,
    hp: 1,
    maxHp: 1,
    state: "walk",
    stateT: 0,
    animT: 0,
    combo: 0,
    comboT: 0,
    chain: [],
    hitLock: 0,
    hitBy: null,
    hitByUid: null,
    flash: 0,
    stars: 0,
    variant: 0,
    slide: 0,
    spawnT: 0,
    lastCellX: 0,
    lastCellZ: 0,
    route: [],
    routeT: 0,
  };
}

function emptyTrap(uid: number): TrapSlot {
  return {
    live: false,
    uid,
    def: "banana_peel",
    surface: "floor",
    side: null,
    laneIndex: 0,
    gx: 0,
    gz: 0,
    x: 0,
    y: 0,
    z: 0,
    dir: 0,
    state: "arming",
    t: 0,
    anim: 0,
    uses: 0,
    hits: 0,
    ownerCell: 0,
  };
}

function emptyShot(id: number): ShotSlot {
  return { live: false, id, trapUid: -1, def: "dart_rack", kind: "dart", x: 0, y: 1, z: 0, vx: 0, vz: 0, t: 0, hitIds: [] };
}

function emptyParticle(id: number): ParticleSlot {
  return { live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, size: 0.12, spin: 0, kind: 0, color: id };
}

function emptyPopup(): PopupSlot {
  return { live: false, word: "WHAM", x: 0, y: 1.4, z: 0, t: 0, life: 1, rise: 0.9, tone: 0 };
}

export interface PlaceOutcome {
  ok: boolean;
  reason: string;
}

let runCounter = 0;

/** Mundo de simulación: entidades, física arcade, oleadas y puntuación. */
export class World {
  mode: GameMode;
  quality: QualityId;
  /** Sala activa: muebles, entradas, guarida y paleta. */
  map: GameMap;
  phase: "prep" | "playing" | "over" = "prep";
  paused = false;
  runStamp = ++runCounter;
  reducedMotion: boolean;

  cats: CatSlot[] = [];
  traps: TrapSlot[] = [];
  shots: ShotSlot[] = [];
  particles: ParticleSlot[] = [];
  popups: PopupSlot[] = [];

  mouse = { x: 0, z: 1.6, face: Math.PI, animT: 0, state: "idle" as "idle" | "walk" | "cheer" | "sad", invuln: 0, beam: 0 };
  lair = { hp: LAIR_HP, max: LAIR_HP, flash: 0, pulse: 0 };
  lives = MOUSE_LIVES;

  time = ROUND_TIME;
  prepLeft = PREP_TIME;
  elapsed = 0;
  score = 0;
  cheese = START_CHEESE;
  earnedCheese = 0;
  comboBest = 0;
  chainBest = 0;
  defeated = 0;
  wave = 1;
  stolenCheese = 0;
  damageTaken = 0;
  lastPlay: { points: number; label: string; chain: number } | null = null;
  fps = 60;

  input = { mx: 0, mz: 0, run: false };

  private emit: (ev: WorldEvent) => void;
  private rng: Rng;
  private acc = 0;
  private hudT = 0;
  private spawnT = 1.2;
  private blocked: CellMask;
  private flow: Int16Array;
  /** Cajas de colisión de muebles y quesera, en coordenadas de mundo. */
  private obstacles: ObstacleBox[] = [];
  private endReason: EndReason = "time";
  private fpsAvg = 60;
  private catCap: number;
  private trapCap: number;
  private particleCap: number;

  constructor(opts: WorldOptions) {
    this.mode = opts.mode;
    this.quality = opts.quality;
    this.map = getMap(opts.mapId);
    this.reducedMotion = opts.reducedMotion;
    this.emit = opts.emit;
    this.rng = createRng(hashSeed(Date.now() & 0xffff, opts.mode === "lab" ? 7 : 13));
    for (let i = 0; i < POOL_CATS; i++) this.cats.push(emptyCat(i));
    for (let i = 0; i < POOL_TRAPS; i++) this.traps.push(emptyTrap(i));
    for (let i = 0; i < POOL_SHOTS; i++) this.shots.push(emptyShot(i));
    for (let i = 0; i < 200; i++) this.particles.push(emptyParticle(i));
    for (let i = 0; i < POOL_POPUPS; i++) this.popups.push(emptyPopup());
    this.blocked = blockedWalkMask(this.map);
    this.obstacles = buildObstacles(this.map);
    // El inventor nace junto a su guarida, en una casilla libre de este mapa.
    // Antes era una posición fija de la sala antigua y podía quedar pegado a
    // un mueble o lejos de la quesera en otras salas.
    const home = mouseSpawnCell(this.map, this.blocked);
    this.mouse.x = cellToWorldX(home.gx);
    this.mouse.z = cellToWorldZ(home.gz);
    this.flow = buildFlowField(this.blocked, lairGoalMask(this.map));
    this.catCap = CAT_CAP_BY_QUALITY[this.quality];
    this.trapCap = TRAP_CAP_BY_QUALITY[this.quality];
    this.particleCap = PARTICLE_CAP_BY_QUALITY[this.quality];
    if (this.mode === "lab") {
      this.phase = "playing";
      this.time = Infinity;
      this.prepLeft = 0;
    }
  }

  setQuality(quality: QualityId): void {
    this.quality = quality;
    this.catCap = CAT_CAP_BY_QUALITY[quality];
    this.trapCap = TRAP_CAP_BY_QUALITY[quality];
    this.particleCap = PARTICLE_CAP_BY_QUALITY[quality];
    this.cullTrapsToCap();
  }

  setEmit(fn: (ev: WorldEvent) => void): void {
    this.emit = fn;
  }

  private cullTrapsToCap(): void {
    let live = this.traps.filter((t) => t.live);
    while (live.length > this.trapCap) {
      const victim = live[live.length - 1];
      victim.live = false;
      live = this.traps.filter((t) => t.live);
    }
  }

  /* --------------------------- consultas --------------------------- */

  get liveCats(): CatSlot[] {
    return this.cats.filter((c) => c.live);
  }

  get liveTraps(): TrapSlot[] {
    return this.traps.filter((t) => t.live);
  }

  trapsAt(gx: number, gz: number, surface: "floor" | "ceiling" | "wall", side: WallSide | null, lane: number): TrapSlot | null {
    for (const t of this.traps) {
      if (!t.live) continue;
      if (t.surface !== surface) continue;
      if (surface === "wall") {
        if (t.side === side && t.laneIndex === lane) return t;
      } else if (t.gx === gx && t.gz === gz) return t;
    }
    return null;
  }

  trapAtPoint(gx: number, gz: number): TrapSlot | null {
    let best: TrapSlot | null = null;
    let bestDist = Infinity;
    for (const t of this.traps) {
      if (!t.live) continue;
      const d = Math.abs(t.x - cellToWorldX(gx)) + Math.abs(t.z - cellToWorldZ(gz));
      if (d < 1.3 && d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  validate(target: Target): PlaceOutcome {
    const selected = this.pendingDef;
    if (!selected) return { ok: false, reason: "Elige una trampa" };
    const v = validatePlacement(target, selected, {
      traps: this.traps,
      cheese: this.mode === "lab" ? Infinity : this.cheese,
      cap: this.trapCap,
      editable: this.mode === "lab" || this.phase === "prep",
      blocked: this.blocked,
      map: this.map,
    });
    return { ok: v.ok, reason: v.reason };
  }

  pendingDef: TrapId | null = null;

  /* -------------------------- colocación --------------------------- */

  place(target: Target, def: TrapId): PlaceOutcome {
    if (this.paused || this.phase === "over") return { ok: false, reason: "Partida en pausa" };
    const v = validatePlacement(target, def, {
      traps: this.traps,
      cheese: this.mode === "lab" ? Infinity : this.cheese,
      cap: this.trapCap,
      editable: this.mode === "lab" || this.phase === "prep",
      blocked: this.blocked,
      map: this.map,
    });
    if (!v.ok) {
      this.emit({ type: "sfx", name: "deny" });
      return { ok: false, reason: v.reason };
    }
    const slot = this.traps.find((t) => !t.live);
    if (!slot) return { ok: false, reason: "Sin espacio de trampas" };
    const def0 = TRAPS[def];
    const cell = targetCell(target);
    const anchor = target.surface === "wall" && target.side ? wallAnchor(target.side, target.index) : null;

    slot.live = true;
    slot.def = def;
    slot.surface = def0.surface;
    slot.side = target.surface === "wall" ? (target.side as WallSide) : null;
    slot.laneIndex = target.surface === "wall" ? target.index : 0;
    slot.gx = cell.gx;
    slot.gz = cell.gz;
    slot.x = anchor ? anchor.x : cellToWorldX(cell.gx);
    slot.z = anchor ? anchor.z : cellToWorldZ(cell.gz);
    slot.dir = anchor ? anchor.dir : 0;
    slot.y = def0.surface === "ceiling" ? WALL_HEIGHT - 0.35 : def0.surface === "wall" ? 1.32 : 0.06;
    slot.state = "arming";
    slot.t = 0;
    slot.anim = 0;
    slot.uses = def0.uses;
    slot.hits = 0;
    slot.ownerCell = cell.gz * 9 + cell.gx;

    if (this.mode !== "lab") this.cheese -= def0.cost;
    this.emit({ type: "sfx", name: "place" });
    this.burst(slot.x, slot.y + 0.1, slot.z, 6, 0.55, 0);
    return { ok: true, reason: def0.name };
  }

  remove(target: Target): PlaceOutcome {
    if (this.paused || this.phase === "over" || (this.mode !== "lab" && this.phase !== "prep")) {
      return { ok: false, reason: "Solo puedes retirar en la preparacion" };
    }
    const cell = targetCell(target);
    const slot = this.traps.find((t) => {
      if (!t.live) return false;
      if (target.surface === "wall") return t.surface === "wall" && t.side === target.side && t.laneIndex === target.index;
      return t.surface === target.surface && t.gx === cell.gx && t.gz === cell.gz;
    });
    if (!slot) return { ok: false, reason: "Nada que retirar" };
    const def = TRAPS[slot.def];
    const refundable = this.mode !== "lab" && this.phase === "prep";
    if (refundable) this.cheese += Math.round(def.cost * 0.85);
    slot.live = false;
    this.burst(slot.x, slot.y + 0.1, slot.z, 5, 0.4, 1);
    this.emit({ type: "sfx", name: "ui" });
    return { ok: true, reason: refundable ? `Retirada (+${Math.round(def.cost * 0.85)})` : "Retirada" };
  }

  /* --------------------------- trampas ----------------------------- */

  fireNearest(): PlaceOutcome {
    if (this.paused || this.phase !== "playing") return { ok: false, reason: "Partida en pausa" };
    const mouse = this.mouse;
    let best: TrapSlot | null = null;
    let bestD = Infinity;
    for (const t of this.traps) {
      if (!t.live || t.state !== "ready") continue;
      const def = TRAPS[t.def];
      if (def.trigger !== "manual") continue;
      const d = Math.hypot(t.x - mouse.x, t.z - mouse.z);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    // Sin límite de alcance: el botón dispara la manual lista más cercana esté
    // donde esté. El tope fijo de 9 u dejaba fuera la pared del fondo cuando
    // la sala creció, con un mensaje engañoso de «ninguna lista».
    if (!best) {
      const arming = this.traps.some((t) => t.live && TRAPS[t.def].trigger === "manual" && t.state !== "ready");
      return { ok: false, reason: arming ? "Tu trampa manual aún se está recargando" : "Coloca primero una trampa manual (cañón o estantería)" };
    }
    this.fire(best);
    return { ok: true, reason: TRAPS[best.def].name };
  }

  fireTrap(uid: number): PlaceOutcome {
    if (this.paused || this.phase !== "playing") return { ok: false, reason: "Partida en pausa" };
    const t = this.traps.find((x) => x.live && x.uid === uid);
    if (!t) return { ok: false, reason: "Trampa inactiva" };
    if (t.state !== "ready") return { ok: false, reason: "Todavia se esta armando" };
    if (TRAPS[t.def].trigger !== "manual") return { ok: false, reason: "Solo las trampas manuales se pueden disparar" };
    this.fire(t);
    return { ok: true, reason: TRAPS[t.def].name };
  }

  private fire(trap: TrapSlot): void {
    const def = TRAPS[trap.def];
    trap.state = "fired";
    trap.t = 0;
    trap.anim = 1;
    trap.uses -= 1;

    // A ceiling trap deals damage only on landing, never on release.
    // Floor and wall traps resolve at activation time.
    const targets = def.surface === "ceiling" ? [] : this.collectTargets(trap, def.radius, def.lane);
    if (def.effect === "shoot") {
      this.spawnShot(trap, trap.def === "cork_cannon" ? "cork" : "dart");
    }
    if (def.effect !== "shoot" && def.surface !== "ceiling") this.applyTrapImpact(trap, targets);

    this.emit({ type: "sfx", name: SFX_BY_EFFECT[def.effect] ?? "pop", param: 0.4 });
    this.emit({ type: "shake", power: def.damage > 100 ? 0.85 : def.damage > 60 ? 0.5 : 0.25 });

    // Efecto en cadena: lámparas y trampas "chain" se disparan si algo golpea cerca.
    for (const other of this.traps) {
      if (!other.live || other === trap || other.state !== "ready") continue;
      const od = TRAPS[other.def];
      if (od.trigger !== "chain") continue;
      const d = Math.hypot(other.x - trap.x, other.z - trap.z);
      if (d < 3.2) this.fire(other);
    }
  }

  private collectTargets(trap: TrapSlot, radius: number, lane: boolean): CatSlot[] {
    const out: CatSlot[] = [];
    for (const c of this.cats) {
      if (!c.live || c.state === "dying") continue;
      if (trap.surface === "wall" && lane) {
        const idx = trap.side === "back" ? worldToCellGX(c.x) : worldToCellGZ(c.z);
        if (idx !== trap.laneIndex) continue;
        const along = trap.side === "back" ? c.z : Math.abs(c.x - trap.x);
        if (trap.side === "back" && along < -0.4) continue;
        out.push(c);
      } else if (trap.surface === "wall") {
        if (Math.hypot(c.x - trap.x, c.z - trap.z) < radius + 0.9) out.push(c);
      } else {
        if (Math.hypot(c.x - trap.x, c.z - trap.z) < radius + 0.25) out.push(c);
      }
    }
    return out;
  }

  private applyTrapImpact(trap: TrapSlot, targets: CatSlot[]): void {
    const def = TRAPS[trap.def];
    if (targets.length === 0) return;
    for (const c of targets) {
      this.hit(c, trap, def, trap.x, trap.z, targets.length);
    }
  }

  private hit(cat: CatSlot, trap: TrapSlot | null, def: (typeof TRAPS)[TrapId], ox: number, oz: number, multi: number): void {
    if (trap && cat.hitLock > 0 && cat.hitByUid === trap.uid) return;

    const catDef = CATS[cat.type];
    cat.hitLock = 0.42;
    cat.hitBy = def.id;
    cat.hitByUid = trap?.uid ?? null;

    const inWindow = cat.comboT > 0;
    cat.combo = inWindow ? Math.min(cat.combo + 1, 5) : 1;
    cat.comboT = COMBO_WINDOW;
    const hitIndex = cat.combo - 1;
    const variety = inWindow && !cat.chain.includes(def.id);
    if (variety) cat.chain.push(def.id);
    if (cat.chain.length > 6) cat.chain.shift();
    if (cat.combo > this.comboBest) this.comboBest = cat.combo;
    if (cat.combo > this.chainBest) this.chainBest = cat.combo;

    const near = Math.hypot(this.mouse.x - ox, this.mouse.z - oz) < 3.1;
    const hurtCat = def.effect === "shoot" && catDef.id === "helmet" ? def.damage * 0.4 : def.damage;
    const resist = catDef.resist;
    cat.hp -= hurtCat;

    const power = (def.impulse / resist) * CELL;
    const lift = def.lift / Math.sqrt(resist);
    const dx = cat.x - ox;
    const dz = cat.z - oz;
    const len = Math.max(0.001, Math.hypot(dx, dz));

    switch (def.effect) {
      case "slip": {
        cat.vx += Math.sin(cat.face) * 0 + Math.cos(cat.face) * power;
        cat.vz += Math.sin(cat.face) * power;
        cat.state = "slip";
        cat.slide = def.slow;
        cat.stateT = def.slow;
        break;
      }
      case "flip": {
        cat.vx = -cat.vx * 0.4 - Math.cos(cat.face) * power;
        cat.vz = -cat.vz * 0.4 - Math.sin(cat.face) * power;
        cat.vy = Math.max(cat.vy, lift);
        cat.state = "slip";
        cat.slide = def.slow;
        cat.stateT = def.slow;
        break;
      }
      case "glue": {
        cat.vx = 0;
        cat.vz = 0;
        cat.state = "glue";
        cat.stateT = def.hold;
        break;
      }
      case "launch":
      case "pop": {
        cat.vy = lift;
        cat.vx += (dx / len) * power * 0.4;
        cat.vz += (dz / len) * power * 0.4;
        cat.state = "air";
        cat.stateT = 0;
        break;
      }
      case "punch":
      case "gust":
      case "topple": {
        const push = pushFrom(trap);
        cat.vx += push.x * power;
        cat.vz += push.z * power;
        cat.vy = Math.max(cat.vy, lift);
        if (def.slow > 0) {
          cat.state = "slip";
          cat.slide = def.slow;
          cat.stateT = def.slow;
        } else if (def.stun > 0) {
          cat.state = "stun";
          cat.stateT = def.stun;
          cat.stars = 3;
        } else if (cat.y > 0.02) {
          cat.state = "air";
        }
        break;
      }
      case "crush":
      case "swing":
      case "soak":
      case "roll":
      case "snap": {
        cat.vx += (dx / len) * power * 0.8;
        cat.vz += (dz / len) * power * 0.8;
        cat.vy = Math.max(cat.vy, lift);
        if (def.stun > 0) {
          cat.state = "stun";
          cat.stateT = def.stun;
          cat.stars = Math.min(4, 1 + Math.round(def.stun * 2));
        }
        if (def.slow > 0) {
          cat.slide = Math.max(cat.slide, def.slow);
          cat.stateT = Math.max(cat.stateT, def.stun + def.slow * 0.4);
        }
        break;
      }
      case "shoot": {
        cat.vx += (dx / len) * power;
        cat.vz += (dz / len) * power;
        if (def.stun > 0 && cat.y < 0.05) {
          cat.state = "stun";
          cat.stateT = def.stun;
          cat.stars = 2;
        }
        break;
      }
      default:
        break;
    }

    cat.flash = 1;

    const kill = cat.hp <= 0;
    const sc = scoreForHit({
      base: def.points + (kill ? catDef.points : 0),
      hitIndex,
      variety,
      nearInventor: near,
      kill,
      multi,
      chainLength: cat.combo,
    });
    this.score += sc.points;
    const gain = cheeseForHit(def.id, kill, cat.type) + (sc.cheeseBonus ? CHEESE_PER_HIT : 0);
    this.cheese += gain;
    if (this.mode === "survival") this.earnedCheese += gain;
    this.lastPlay = {
      points: sc.points,
      label: `${def.name}${sc.cheeseBonus ? " + inventor cerca" : ""}`,
      chain: cat.combo,
    };

    let word: PopWord = hitIndex >= 1 ? COMBO_WORD_BY_INDEX[Math.min(hitIndex, COMBO_WORD_BY_INDEX.length - 1)] : def.word;
    if (sc.finisher) word = "CHAIN";
    else if (sc.cheeseBonus) word = "CHEESE";
    this.popup(word, cat.x, 1.15 + cat.y, cat.z, hitIndex >= 2 ? 2 : 0);

    this.burst(cat.x, 0.45 + cat.y, cat.z, kill ? 12 : 6, def.damage > 90 ? 1 : 0.6, 0);
    // Cada capa de recompensa tiene su propio sonido: cadena rematada,
    // bonus de cercanía y, si no, la escala de combo.
    if (sc.finisher) this.emit({ type: "sfx", name: "chain", param: 1 });
    else this.emit({ type: "sfx", name: "combo", param: Math.min(1, hitIndex / 4) });
    if (sc.cheeseBonus) this.emit({ type: "sfx", name: "coin", param: 0.6 });
    if (hitIndex >= 2) this.emit({ type: "banner", text: `COMBO x${Math.min(5, hitIndex + 1)}  +${sc.points}`, tone: "gold" });

    if (trap) trap.hits += 1;

    if (kill) this.defeat(cat, catDef.cheese);
  }

  private defeat(cat: CatSlot, cheeseValue: number): void {
    cat.state = "dying";
    cat.stateT = 0.34;
    cat.combo = 0;
    cat.comboT = 0;
    this.defeated += 1;
    this.cheese += Math.round(cheeseValue * 0.5);
    if (this.mode === "survival") this.earnedCheese += Math.round(cheeseValue * 0.5);
    this.burst(cat.x, 0.5, cat.z, 14, 0.8, 2);
    this.emit({ type: "sfx", name: cat.type === "boss" ? "meowBig" : "pop", param: 1 });
    if (cat.type === "boss") this.emit({ type: "banner", text: "¡JEFE DERROTADO!", tone: "good" });
  }

  private spawnShot(trap: TrapSlot, kind: ShotSlot["kind"] = "dart"): void {
    const def = TRAPS[trap.def];
    const slot = this.shots.find((s) => !s.live);
    if (!slot) return;
    const push = pushFrom(trap);
    slot.live = true;
    slot.trapUid = trap.uid;
    slot.def = def.id;
    slot.kind = kind;
    slot.x = trap.x + push.x * 0.35;
    slot.z = trap.z + push.z * 0.35;
    slot.y = kind === "bowl" ? 1.2 : 0.95;
    const speed = (kind === "bowl" ? 5.4 : kind === "cork" ? 8.4 : 9.2) * 1.0;
    slot.vx = push.x * speed * CELL;
    slot.vz = push.z * speed * CELL;
    slot.t = 0;
    slot.hitIds = [];
    this.emit({ type: "sfx", name: kind === "bowl" ? "clang" : "dart", param: 0.5 });
  }

  /* ---------------------------- efectos ---------------------------- */

  private freeSlot<T extends { live: boolean }>(pool: T[]): T | null {
    for (const item of pool) if (!item.live) return item;
    return null;
  }

  burst(x: number, y: number, z: number, count: number, power: number, kind: 0 | 1 | 2): void {
    if (this.reducedMotion) count = Math.ceil(count * 0.5);
    const budget = this.particleCap;
    let made = 0;
    for (const p of this.particles) {
      if (made >= count) break;
      if (p.live) continue;
      if (made >= budget / 4) break;
      p.live = true;
      p.x = x + (this.rng.next() - 0.5) * 0.3;
      p.y = y + this.rng.next() * 0.2;
      p.z = z + (this.rng.next() - 0.5) * 0.3;
      const a = this.rng.next() * Math.PI * 2;
      const s = 1.1 + this.rng.next() * 2.6 * power;
      p.vx = Math.cos(a) * s;
      p.vz = Math.sin(a) * s;
      p.vy = 1.6 + this.rng.next() * 3.4 * power;
      p.t = 0;
      p.life = 0.45 + this.rng.next() * 0.5;
      p.size = 0.08 + this.rng.next() * 0.1;
      p.spin = this.rng.range(-8, 8);
      p.kind = kind;
      p.color = this.rng.int(0, 3);
      made += 1;
    }
  }

  popup(word: PopWord, x: number, y: number, z: number, tone: 0 | 1 | 2): void {
    const slot = this.freeSlot(this.popups);
    if (!slot) return;
    slot.live = true;
    slot.word = word;
    slot.x = x;
    slot.y = Math.min(WALL_HEIGHT - 0.3, Math.max(0.9, y));
    slot.z = z;
    slot.t = 0;
    slot.life = 1.1;
    slot.rise = 0.85;
    slot.tone = tone;
  }

  /* ---------------------------- enemigos --------------------------- */

  spawnCat(type: CatTypeId, entryIndex: number): boolean {
    const alive = this.cats.reduce((n, c) => n + (c.live ? 1 : 0), 0);
    if (alive >= this.catCap) return false;
    const slot = this.cats.find((c) => !c.live);
    if (!slot) return false;
    const entry = this.map.entries[Math.max(0, Math.min(this.map.entries.length - 1, entryIndex))];
    const def = CATS[type];
    const variation = this.rng.range(0.92, 1.1);
    slot.live = true;
    slot.type = type;
    slot.x = cellToWorldX(entry.gx);
    slot.z = cellToWorldZ(entry.gz);
    slot.y = entry.kind === "window" ? 0.9 : 0;
    slot.vx = 0;
    slot.vy = 0;
    slot.vz = 0;
    slot.gx = entry.gx;
    slot.gz = entry.gz;
    slot.hp = Math.round(def.hp * variation);
    slot.maxHp = slot.hp;
    slot.state = "walk";
    slot.stateT = 0;
    slot.animT = this.rng.next() * 6;
    slot.combo = 0;
    slot.comboT = 0;
    slot.chain = [];
    slot.hitLock = 0;
    slot.hitBy = null;
    slot.hitByUid = null;
    slot.flash = 0;
    slot.stars = 0;
    slot.variant = this.rng.int(0, 3);
    slot.slide = 0;
    slot.spawnT = 0.55;
    slot.face = Math.atan2(cellToWorldX(this.map.lair.gx) - slot.x, cellToWorldZ(this.map.lair.gz) - slot.z);
    slot.lastCellX = entry.gx;
    slot.lastCellZ = entry.gz;
    slot.route = [];
    slot.routeT = 0;
    this.emit({ type: "sfx", name: type === "boss" ? "meowBig" : "meow", param: type === "quick" ? 0.8 : 0.2 });
    if (type === "boss") this.emit({ type: "banner", text: "¡Llega Bigotes Kagero!", tone: "bad" });
    return true;
  }

  spawnTest(type: CatTypeId, entryIndex = 0): void {
    if (this.mode === "lab" && !this.paused && this.phase === "playing") this.spawnCat(type, entryIndex);
  }

  resetRoom(): void {
    for (const t of this.traps) {
      if (!t.live) continue;
      t.live = false;
      this.burst(t.x, t.y + 0.1, t.z, 4, 0.3, 1);
    }
    for (const c of this.cats) c.live = false;
    for (const s of this.shots) s.live = false;
    this.lair.hp = this.lair.max;
    this.cheese = START_CHEESE;
    this.emit({ type: "sfx", name: "ui" });
  }

  clearCats(): void {
    for (const c of this.cats) c.live = false;
  }

  /* ----------------------------- bucle ----------------------------- */

  advance(realDt: number): void {
    const dt = Math.min(0.05, Math.max(0, realDt));
    this.fpsAvg = this.fpsAvg * 0.9 + (dt > 0 ? 1 / dt : 60) * 0.1;
    this.fps = Math.round(this.fpsAvg);
    if (this.paused || this.phase === "over") {
      this.hudT += dt;
      return;
    }
    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < MAX_STEPS) {
      this.step(FIXED_DT);
      this.acc -= FIXED_DT;
      steps += 1;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.hudT += dt;
  }

  hudReady(): boolean {
    return this.hudT >= HUD_INTERVAL;
  }

  consumeHudClock(): void {
    this.hudT = 0;
  }

  private step(dt: number): void {
    if (this.phase === "prep") {
      this.prepLeft -= dt;
      this.updateCats(dt);
      this.updateTraps(dt, true);
      this.updateEffects(dt);
      this.updateMouse(dt);
      if (this.prepLeft <= 0) this.startWave();
      return;
    }

    if (this.mode === "survival") {
      this.time = Math.max(0, this.time - dt);
      this.elapsed += dt;
      const wave = waveForTime(this.elapsed);
      if (wave !== this.wave) {
        this.wave = wave;
        this.emit({ type: "banner", text: `Oleada ${wave} — ¡vienen más!`, tone: "bad" });
        this.emit({ type: "sfx", name: "start", param: 0.6 });
      }
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const type = pickCatType(this.rng, this.wave);
        const entry = this.rng.int(0, this.map.entries.length - 1);
        this.spawnCat(type, entry);
        this.spawnT = spawnDelay(this.wave) * this.rng.range(0.8, 1.25);
      }
      if (this.time <= 0) {
        this.finish("time");
        return;
      }
    } else {
      this.elapsed += dt;
    }

    this.updateCats(dt);
    this.updateTraps(dt, false);
    this.updateShots(dt);
    this.updateEffects(dt);
    this.updateMouse(dt);

    if (this.lair.hp <= 0) this.finish("lair");
    else if (this.lives <= 0) this.finish("mouse");
  }

  private startWave(): void {
    this.phase = "playing";
    this.prepLeft = 0;
    this.elapsed = 0;
    this.time = ROUND_TIME;
    this.spawnT = 0.9;
    this.emit({ type: "sfx", name: "start" });
    this.emit({ type: "banner", text: "¡SUELTAN A LOS GATOS!", tone: "bad" });
  }

  beginNow(): void {
    if (this.phase === "prep") {
      this.prepLeft = 0.001;
    }
  }

  private updateCats(dt: number): void {
    const lairX = cellToWorldX(this.map.lair.gx);
    const lairZ = cellToWorldZ(this.map.lair.gz);

    for (const c of this.cats) {
      if (!c.live) continue;
      const def = CATS[c.type];
      c.animT += dt;
      if (c.flash > 0) c.flash = Math.max(0, c.flash - dt * 3.2);
      if (c.hitLock > 0) c.hitLock -= dt;
      if (c.comboT > 0) {
        c.comboT -= dt;
        if (c.comboT <= 0) {
          c.combo = 0;
          c.chain = [];
        }
      }
      if (c.spawnT > 0) {
        c.spawnT -= dt;
        continue;
      }

      if (c.state === "dying") {
        c.stateT -= dt;
        c.y += dt * 1.2;
        if (c.stateT <= 0) c.live = false;
        continue;
      }

      if (c.state === "stun" || c.state === "glue") {
        c.stateT -= dt;
        c.vx *= 0.82;
        c.vz *= 0.82;
        if (c.stars > 0 && c.state === "stun") c.stars = c.stars;
        if (c.stateT <= 0) {
          c.state = "walk";
          c.stars = 0;
        }
      } else if (c.state === "air") {
        c.vy -= GRAVITY * dt;
        c.y += c.vy * dt;
        c.vx *= 0.995;
        c.vz *= 0.995;
        if (c.y <= 0) {
          c.y = 0;
          if (c.vy < -3.5) {
            c.vy = -c.vy * 0.42;
            this.burst(c.x, 0.1, c.z, 4, 0.4, 1);
            this.emit({ type: "sfx", name: "boing", param: 0.3 });
            this.triggerLanding(c);
          } else {
            c.vy = 0;
            c.state = c.stars > 0 ? "stun" : "walk";
            if (c.stars > 0) c.stateT = 0.5;
            this.triggerLanding(c);
          }
        }
      } else if (c.state === "slip") {
        c.slide -= dt;
        c.vx *= 1 - 0.6 * dt;
        c.vz *= 1 - 0.6 * dt;
        c.y = Math.max(0, c.y - dt * (c.y > 0.01 ? GRAVITY * 0.05 : 0));
        if (c.slide <= 0) {
          c.state = "walk";
          c.slide = 0;
        }
      } else if (c.state === "attack") {
        c.stateT -= dt;
        c.routeT -= dt;
        if (c.routeT <= 0) {
          c.routeT = 1.05;
          if (this.mode === "survival") {
            this.damageLair(def.damage, c);
          }
          this.stolenCheese += 2;
          this.cheese = Math.max(0, this.cheese - 1);
        }
        if (this.lair.hp <= 0) {
          c.state = "flee";
          c.route = [c.gx, c.gz];
        }
      } else {
        // walk / flee
        const speedCells = def.speed * (c.state === "flee" ? 1.35 : 1) * (1 - Math.min(0.6, c.stars * 0.05));
        let tx: number;
        let tz: number;
        if (c.state === "flee") {
          const back = this.map.entries[c.variant % this.map.entries.length];
          tx = cellToWorldX(back.gx);
          tz = cellToWorldZ(back.gz);
          if (Math.hypot(c.x - tx, c.z - tz) < 0.55) {
            c.live = false;
            continue;
          }
        } else {
          const cgx = worldToCellGX(c.x);
          const cgz = worldToCellGZ(c.z);
          c.gx = cgx;
          c.gz = cgz;
          if (distanceToLair(this.flow, cgx, cgz) <= 1) {
            const d = Math.hypot(c.x - lairX, c.z - lairZ);
            if (d < 1.25) {
              c.state = "attack";
              c.stateT = 2.4;
              c.routeT = 0.25;
              continue;
            }
          }
          const nxt = flowStep(this.flow, cgx, cgz);
          if (nxt) {
            tx = cellToWorldX(nxt.gx);
            tz = cellToWorldZ(nxt.gz);
          } else {
            tx = lairX;
            tz = lairZ;
          }
          if (c.lastCellX !== cgx || c.lastCellZ !== cgz) {
            c.lastCellX = cgx;
            c.lastCellZ = cgz;
          }
        }
        const dx = tx - c.x;
        const dz = tz - c.z;
        const dl = Math.max(0.0001, Math.hypot(dx, dz));
        const desiredX = (dx / dl) * speedCells * CELL;
        const desiredZ = (dz / dl) * speedCells * CELL;
        const k = Math.min(1, dt * 9);
        c.vx += (desiredX - c.vx) * k;
        c.vz += (desiredZ - c.vz) * k;
        if (Math.hypot(c.vx, c.vz) > 0.05) c.face = Math.atan2(c.vz, c.vx);
        if (c.type === "jumper") {
          c.y = Math.abs(Math.sin(c.animT * 6.2)) * 0.34;
        }
      }

      // Integración y colisiones simples
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      if (c.state === "air" || c.y > 0.001) {
        if (c.state !== "air") {
          c.y = Math.max(0, c.y - dt * 6);
        }
      }

      if (Math.abs(c.x) > FLOOR_LIMIT_X) {
        c.x = Math.sign(c.x) * FLOOR_LIMIT_X;
        c.vx = -c.vx * 0.45;
        if (Math.abs(c.vx) > 1.5) this.bounceStun(c);
      }
      if (Math.abs(c.z) > FLOOR_LIMIT_Z) {
        c.z = Math.sign(c.z) * FLOOR_LIMIT_Z;
        c.vz = -c.vz * 0.45;
        if (Math.abs(c.vz) > 1.5) this.bounceStun(c);
      }
      if (c.y > 0.001 && c.state !== "air") c.y = Math.max(0, c.y - dt * 5);

      // No atravesar muebles
      const cgx = worldToCellGX(c.x);
      const cgz = worldToCellGZ(c.z);
      c.gx = clampInt(cgx, 0, 8);
      c.gz = clampInt(cgz, 0, 6);
      if (!isLairCell(this.map, c.gx, c.gz)) this.resolveObstacles(c, CATS[c.type].scale * 0.3);

      // El ratón también es un objetivo secundario
      if (this.mode === "survival" && c.state === "walk" && this.mouse.invuln <= 0) {
        const dm = Math.hypot(c.x - this.mouse.x, c.z - this.mouse.z);
        if (dm < 0.62) this.swipeMouse(c);
      }
    }
  }

  private bounceStun(c: CatSlot): void {
    c.stars = Math.max(c.stars, 2);
    c.state = "stun";
    c.stateT = Math.max(c.stateT, 0.4);
    this.burst(c.x, 0.5, c.z, 4, 0.4, 1);
    this.emit({ type: "sfx", name: "clang", param: 0.3 });
    this.score += 20;
  }

  private triggerLanding(c: CatSlot): void {
    // Al caer, puede accionar otra trampa cercana: así nacen las cadenas.
    for (const t of this.traps) {
      if (!t.live || t.state !== "ready") continue;
      const def = TRAPS[t.def];
      if (def.surface !== "floor") continue;
      if (Math.hypot(t.x - c.x, t.z - c.z) < def.radius + 0.3) {
        this.fire(t);
        break;
      }
    }
  }


  private swipeMouse(c: CatSlot): void {
    this.lives -= 1;
    this.mouse.invuln = 1.7;
    const dx = this.mouse.x - c.x;
    const dz = this.mouse.z - c.z;
    const d = Math.max(0.001, Math.hypot(dx, dz));
    this.mouse.x += (dx / d) * 0.9;
    this.mouse.z += (dz / d) * 0.9;
    c.state = "stun";
    c.stateT = 0.3;
    this.emit({ type: "sfx", name: "hurt" });
    this.emit({ type: "shake", power: 1 });
    this.emit({ type: "banner", text: `¡Zarpazo! Energía ${this.lives}/${MOUSE_LIVES}`, tone: "bad" });
    this.popup("HURT", this.mouse.x, 1.5, this.mouse.z, 1);
    this.damageTaken += 0;
  }

  private damageLair(amount: number, c: CatSlot): void {
    this.lair.hp = Math.max(0, this.lair.hp - amount);
    this.lair.flash = 1;
    this.damageTaken += amount;
    this.burst(cellToWorldX(this.map.lair.gx), 0.6, cellToWorldZ(this.map.lair.gz), 8, 0.6, 1);
    this.emit({ type: "sfx", name: "hurt", param: amount / 26 });
    this.emit({ type: "shake", power: Math.min(1, 0.35 + amount / 34) });
    this.popup("HURT", c.x, 1.4, c.z, 1);
    if (this.lair.hp <= 0) this.emit({ type: "banner", text: "¡LA QUESERA HA CAÍDO!", tone: "bad" });
  }

  private updateTraps(dt: number, prepPhase: boolean): void {
    for (const t of this.traps) {
      if (!t.live) continue;
      const def = TRAPS[t.def];
      t.anim = Math.max(0, t.anim - dt * 3);
      t.t += dt;

      if (t.state === "arming") {
        if (t.t >= def.armTime) {
          t.state = "ready";
          t.t = 0;
          if (!prepPhase) this.popup("ARMED", t.x, 0.85, t.z, 0);
        }
        continue;
      }

      if (t.state === "ready") {
        if (prepPhase) {
          t.t = 0;
          continue;
        }
        if (def.trigger === "timed") {
          if (t.t >= def.fall) this.fire(t);
          continue;
        }
        if (def.trigger === "manual" || def.trigger === "chain") continue;
        const near = this.collectTargets(t, def.radius, def.lane);
        if (near.length > 0) {
          this.fire(t);
        }
        continue;
      }

      if (t.state === "fired") {
        const fall = def.fall > 0 ? def.fall : 0.16;
        if (def.surface === "ceiling") {
          const p = Math.min(1, t.t / fall);
          t.y = WALL_HEIGHT - 0.35 - p * (WALL_HEIGHT - 0.55);
          // Crossing the threshold, rather than staying above it, is essential:
          // otherwise every fixed tick awards the same hit again.
          if (t.t - dt < fall && t.t >= fall) {
            t.y = 0.12;
            if (def.effect === "roll") this.spawnShot(t, "bowl");
            else this.applyTrapImpact(t, this.collectTargets(t, def.radius, false));
            this.burst(t.x, 0.18, t.z, 12, 1, 0);
          }
        }
        if (t.t >= fall + 0.34) {
          t.state = t.uses > 0 ? "cooldown" : "broken";
          t.t = 0;
        }
        continue;
      }

      if (t.state === "cooldown") {
        if (t.t >= Math.max(0.45, def.cooldown)) {
          t.t = 0;
          if (t.uses > 0) {
            t.state = "ready";
            t.y = def.surface === "ceiling" ? WALL_HEIGHT - 0.35 : def.surface === "wall" ? 1.32 : 0.06;
          } else {
            t.state = "broken";
          }
        }
        continue;
      }

      if (t.state === "broken") {
        t.live = false;
        this.burst(t.x, t.y + 0.1, t.z, 6, 0.5, 1);
        this.emit({ type: "sfx", name: "clang", param: 0.2 });
      }
    }
  }

  private updateShots(dt: number): void {
    for (const s of this.shots) {
      if (!s.live) continue;
      s.t += dt;
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      if (s.kind === "bowl") s.y = 0.34 + Math.abs(Math.sin(s.t * 9)) * 0.06;
      const def = TRAPS[s.def];
      for (const c of this.cats) {
        if (!c.live || c.state === "dying") continue;
        if (s.hitIds.includes(c.id)) continue;
        if (Math.hypot(c.x - s.x, c.z - s.z) < (s.kind === "bowl" ? 0.7 : 0.52) + 0.15) {
          s.hitIds.push(c.id);
          const trap = this.traps.find((t) => t.live && t.uid === s.trapUid) ?? null;
          this.hit(c, trap, def, s.x, s.z, 1);
          if (s.kind !== "bowl") {
            s.live = false;
            break;
          }
        }
      }
      if (!s.live) continue;
      if (Math.abs(s.x) > WALL_HIT_LIMIT + 0.4 || Math.abs(s.z) > ROOM_D / 2 + 0.4 || s.t > 3.4) {
        s.live = false;
        this.burst(s.x, s.y, s.z, 4, 0.3, 1);
      }
    }
  }

  private updateEffects(dt: number): void {
    for (const p of this.particles) {
      if (!p.live) continue;
      p.t += dt;
      p.vy -= GRAVITY * 0.55 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.02) {
        p.y = 0.02;
        p.vy *= -0.32;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }
      if (p.t >= p.life) p.live = false;
    }
    for (const u of this.popups) {
      if (!u.live) continue;
      u.t += dt;
      u.y += dt * u.rise;
      if (u.t >= u.life) u.live = false;
    }
    if (this.lair.flash > 0) this.lair.flash = Math.max(0, this.lair.flash - dt * 2.4);
    this.lair.pulse += dt;
  }

  private updateMouse(dt: number): void {
    const m = this.mouse;
    if (m.invuln > 0) m.invuln -= dt;
    const speed = (this.input.run ? MOUSE_RUN : MOUSE_SPEED) * CELL;
    const len = Math.hypot(this.input.mx, this.input.mz);
    if (len > 0.05) {
      const nx = this.input.mx / Math.max(1, len);
      const nz = this.input.mz / Math.max(1, len);
      m.x += nx * speed * dt;
      m.z += nz * speed * dt;
      m.face = Math.atan2(nz, nx);
      m.state = "walk";
      m.animT += dt * (this.input.run ? 1.7 : 1.15);
    } else {
      m.state = this.phase === "over" ? (this.lair.hp > 0 ? "cheer" : "sad") : "idle";
      m.animT += dt * 0.6;
    }
    m.beam += dt;
    const half = ROOM_W / 2 - 0.34;
    const halfZ = ROOM_D / 2 - 0.3;
    m.x = Math.max(-half, Math.min(half, m.x));
    m.z = Math.max(-halfZ, Math.min(halfZ, m.z));
    // Colisión real contra muebles y quesera: círculo contra caja con
    // deslizamiento. Antes era un empuje suave más lento que el propio
    // movimiento, así que el ratón atravesaba los muebles.
    this.resolveObstacles(m, MOUSE_RADIUS);
  }

  /**
   * Empuja un círculo fuera de todos los obstáculos sólidos.
   *
   * Usa el eje de mínima penetración, así el personaje se desliza por el
   * borde del mueble en lugar de quedarse pegado a él. Se itera dos veces
   * porque resolver contra una caja puede meterlo en la siguiente.
   */
  private resolveObstacles(body: { x: number; z: number }, radius: number): void {
    for (let pass = 0; pass < 2; pass++) {
      let touched = false;
      for (const box of this.obstacles) {
        const closestX = Math.max(box.x0, Math.min(body.x, box.x1));
        const closestZ = Math.max(box.z0, Math.min(body.z, box.z1));
        const dx = body.x - closestX;
        const dz = body.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq >= radius * radius) continue;
        touched = true;
        const dist = Math.sqrt(distSq);
        if (dist > 1e-5) {
          const push = radius - dist;
          body.x += (dx / dist) * push;
          body.z += (dz / dist) * push;
        } else {
          // El centro quedó dentro de la caja: salir por el lado más cercano.
          const gaps: ReadonlyArray<readonly ["x" | "z", number, number]> = [
            ["x", box.x0 - body.x, -1],
            ["x", box.x1 - body.x, 1],
            ["z", box.z0 - body.z, -1],
            ["z", box.z1 - body.z, 1],
          ];
          let best = gaps[0];
          for (const gap of gaps) if (Math.abs(gap[1]) < Math.abs(best[1])) best = gap;
          if (best[0] === "x") body.x += best[2] * (Math.abs(best[1]) + radius);
          else body.z += best[2] * (Math.abs(best[1]) + radius);
        }
      }
      if (!touched) break;
    }
    // El empuje puede sacarlo de la sala: se vuelve a acotar.
    const half = ROOM_W / 2 - 0.34;
    const halfZ = ROOM_D / 2 - 0.3;
    body.x = Math.max(-half, Math.min(half, body.x));
    body.z = Math.max(-halfZ, Math.min(halfZ, body.z));
  }

  /* ------------------------------ fin ------------------------------ */

  finish(reason: EndReason): void {
    if (this.phase === "over") return;
    this.phase = "over";
    this.endReason = reason;
    this.emit({ type: "sfx", name: reason === "time" ? "over" : "over" });
    this.emit({ type: "end", reason });
  }

  result(): RunResult {
    const perfect = this.damageTaken === 0 && this.mode === "survival";
    const bonus = perfect ? Math.round(this.lair.hp * 14) : 0;
    return {
      mode: this.mode,
      score: this.score + bonus,
      comboBest: this.comboBest,
      chainBest: this.chainBest,
      cheese: this.cheese,
      defeated: this.defeated,
      waves: this.wave,
      reason: this.endReason,
      lairHp: Math.round(this.lair.hp),
      perfect,
      newRecord: false,
      rankLabel: rankLabel(this.score + bonus),
    };
  }

  hud(): HudSnapshot {
    let incoming = 0;
    let trapsLive = 0;
    for (const c of this.cats) {
      if (!c.live || c.state === "dying") continue;
      if (distanceToLair(this.flow, c.gx, c.gz) <= 2) incoming += 1;
    }
    for (const t of this.traps) if (t.live) trapsLive += 1;
    return {
      timeLeft: this.mode === "lab" ? Infinity : this.time,
      prepLeft: Math.max(0, this.prepLeft),
      score: this.score,
      cheese: this.cheese,
      combo: Math.max(0, ...this.cats.filter((c) => c.live).map((c) => c.combo)),
      comboBest: this.comboBest,
      chainBest: this.chainBest,
      lairHp: Math.round(this.lair.hp),
      lairMax: this.lair.max,
      lives: this.lives,
      wave: this.wave,
      waveProgress: this.mode === "lab" ? 0 : waveProgress(this.elapsed),
      defeated: this.defeated,
      trapsLive,
      trapCap: this.trapCap,
      fps: this.fps,
      lastPlay: this.lastPlay,
      incoming,
    };
  }

  stats(): { renderScale: number; particles: number } {
    return { renderScale: RENDER_SCALE, particles: this.particleCap };
  }
}

function pushFrom(trap: TrapSlot | null): { x: number; z: number } {
  if (!trap || trap.surface !== "wall" || !trap.side) return { x: 0, z: 1 };
  if (trap.side === "back") return { x: 0, z: 1 };
  if (trap.side === "left") return { x: 1, z: 0 };
  return { x: -1, z: 0 };
}

export function createWorld(mode: GameMode, quality: QualityId, reducedMotion: boolean, mapId?: MapId): World {
  return new World({ mode, quality, reducedMotion, mapId, emit: () => undefined });
}

export { indexToCell };

/** Radio de colisión del ratón inventor. */
const MOUSE_RADIUS = 0.3;

interface ObstacleBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/**
 * Cajas sólidas de la habitación: los muebles que bloquean casillas más la
 * quesera. Se calculan una vez por mundo en coordenadas de mundo.
 */
function buildObstacles(map: GameMap): ObstacleBox[] {
  const boxes: ObstacleBox[] = [];
  const add = (gx: number, gz: number, inset = 0.08) => {
    const cx = cellToWorldX(gx);
    const cz = cellToWorldZ(gz);
    const half = CELL / 2 - inset;
    boxes.push({ x0: cx - half, x1: cx + half, z0: cz - half, z1: cz + half });
  };
  for (const f of map.furniture) add(f.gx, f.gz);
  add(map.lair.gx, map.lair.gz);
  return boxes;
}

/**
 * Casilla de aparición del inventor: la más cercana a la guarida que esté
 * libre y no toque ningún mueble, prefiriendo las que miran a la cámara.
 */
export function mouseSpawnCell(map: GameMap, blocked: CellMask): { gx: number; gz: number } {
  const solid = (gx: number, gz: number) => gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_H || blocked[gz * GRID_W + gx] === 1;
  // Orden de preferencia: delante, a los lados, detrás y diagonales.
  const offsets: Array<[number, number]> = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]];
  const clear = (gx: number, gz: number) => {
    if (solid(gx, gz)) return false;
    // Holgura: ningún mueble en las cuatro casillas vecinas, salvo la guarida.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx === map.lair.gx && nz === map.lair.gz) continue;
      if (nx < 0 || nz < 0 || nx >= GRID_W || nz >= GRID_H) continue;
      if (blocked[nz * GRID_W + nx] === 1) return false;
    }
    return true;
  };
  for (const [dx, dz] of offsets) {
    const gx = map.lair.gx + dx;
    const gz = map.lair.gz + dz;
    if (clear(gx, gz)) return { gx, gz };
  }
  for (const [dx, dz] of offsets) {
    const gx = map.lair.gx + dx;
    const gz = map.lair.gz + dz;
    if (!solid(gx, gz)) return { gx, gz };
  }
  return { gx: map.lair.gx, gz: Math.min(GRID_H - 1, map.lair.gz + 1) };
}
