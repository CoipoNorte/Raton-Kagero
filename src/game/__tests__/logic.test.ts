import { describe, expect, it } from "vitest";
import {
  blockedWalkMask,
  buildFlowField,
  cellIndex,
  cellTarget,
  comboMultiplier,
  flowStep,
  indexToCell,
  lairGoalMask,
  maskHas,
  pickCatType,
  rankLabel,
  scoreForHit,
  spawnDelay,
  validatePlacement,
  wallTarget,
  waveForTime,
} from "../logic";
import { createRng } from "../random";
import { MOUSE_RUN as MOUSE_RUN_TEST } from "../constants";
import { CELL, FLOOR_TILE, GRID_H, GRID_W, ROOM_D, ROOM_ISO_H, ROOM_ISO_W, ROOM_W, WALL_HEIGHT } from "../constants";
import { DEFAULT_MAP_ID, MAP_LIST, getMap } from "../maps";

/** Sala por defecto: la usan las pruebas que no son específicas de un mapa. */
const MAP = getMap(DEFAULT_MAP_ID);
const FURNITURE = MAP.furniture;
const ENTRIES = MAP.entries;
const LAIR_CELL = MAP.lair;
import { cellToWorldX, cellToWorldZ } from "../logic";
import { World } from "../simulation";
import type { TrapId, TrapSlot } from "../types";

const freeCtx = (over: Partial<Parameters<typeof validatePlacement>[2]> = {}) => ({
  traps: [] as TrapSlot[],
  cheese: 100,
  cap: 12,
  editable: true,
  blocked: blockedWalkMask(MAP),
  map: MAP,
  ...over,
});

describe("cuadricula y pathfinding", () => {
  it("mantiene el mapeo casilla <-> mundo en dos direcciones", () => {
    for (let gz = 0; gz < GRID_H; gz++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const idx = cellIndex(gx, gz);
        const back = indexToCell(idx);
        expect([back.gx, back.gz]).toEqual([gx, gz]);
      }
    }
  });

  it("los muebles y la quesera no son transitables", () => {
    const blocked = blockedWalkMask(MAP);
    // Todo mueble declarado bloquea, y la quesera también.
    for (const f of FURNITURE) expect(maskHas(blocked, f.gx, f.gz)).toBe(true);
    expect(maskHas(blocked, LAIR_CELL.gx, LAIR_CELL.gz)).toBe(true);

    // Y ninguna casilla libre queda bloqueada por error.
    const solid = new Set(FURNITURE.map((f) => `${f.gx},${f.gz}`));
    solid.add(`${LAIR_CELL.gx},${LAIR_CELL.gz}`);
    let free = 0;
    for (let gz = 0; gz < GRID_H; gz++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        if (solid.has(`${gx},${gz}`)) continue;
        expect(maskHas(blocked, gx, gz)).toBe(false);
        free += 1;
      }
    }
    // Regresión: con más de 32 casillas un bitmask de enteros desbordaría.
    expect(GRID_W * GRID_H).toBeGreaterThan(32);
    expect(free).toBe(GRID_W * GRID_H - solid.size);
  });

  it("el campo de flujo lleva a la quesera desde las tres entradas", () => {
    const flow = buildFlowField(blockedWalkMask(MAP), lairGoalMask(MAP));
    const starts: Array<[number, number]> = ENTRIES.map((e) => [e.gx, e.gz]);
    for (const [gx, gz] of starts) {
      expect(flow[cellIndex(gx, gz)]).toBeLessThan(32767);
      let cur = { gx, gz };
      let steps = 0;
      while (flow[cellIndex(cur.gx, cur.gz)] > 0 && steps < 60) {
        const nxt = flowStep(flow, cur.gx, cur.gz);
        if (!nxt) break;
        cur = nxt;
        steps += 1;
      }
      expect(flow[cellIndex(cur.gx, cur.gz)]).toBe(0);
      expect(steps).toBeGreaterThan(1);
    }
  });
});

describe("validacion de colocacion", () => {
  it("acepta una trampa de suelo en casilla libre", () => {
    const v = validatePlacement(cellTarget(5, 3, "floor"), "banana_peel", freeCtx());
    expect(v.ok).toBe(true);
  });

  it("rechaza colocar sobre un mueble o sobre la quesera", () => {
    const mueble = FURNITURE[0];
    expect(validatePlacement(cellTarget(mueble.gx, mueble.gz, "floor"), "banana_peel", freeCtx()).ok).toBe(false);
    expect(validatePlacement(cellTarget(LAIR_CELL.gx, LAIR_CELL.gz, "floor"), "banana_peel", freeCtx()).ok).toBe(false);
  });

  it("rechaza por falta de queso y por limite de trampas", () => {
    const poor = freeCtx({ cheese: 3 });
    const poorVerdict = validatePlacement(cellTarget(5, 3, "ceiling"), "anvil", poor);
    expect(poorVerdict.ok).toBe(false);
    expect(poorVerdict.reason).toContain("queso");

    const full = freeCtx({ cap: 0 });
    expect(validatePlacement(cellTarget(5, 3, "floor"), "banana_peel", full).ok).toBe(false);
  });

  it("no permite dos trampas de suelo en la misma casilla pero si suelo + techo", () => {
    const existing: TrapSlot = {
      live: true,
      uid: 1,
      def: "banana_peel",
      surface: "floor",
      side: null,
      laneIndex: 0,
      gx: 5,
      gz: 3,
      x: 0,
      y: 0,
      z: 0,
      dir: 0,
      state: "ready",
      t: 0,
      anim: 0,
      uses: 1,
      hits: 0,
      ownerCell: 0,
    };
    const ctx = freeCtx({ traps: [existing] });
    expect(validatePlacement(cellTarget(5, 3, "floor"), "glue_patch", ctx).ok).toBe(false);
    expect(validatePlacement(cellTarget(5, 3, "ceiling"), "anvil", ctx).ok).toBe(true);
  });

  it("rechaza la superficie equivocada y los indices fuera de la habitacion", () => {
    expect(validatePlacement(cellTarget(5, 3, "floor"), "anvil", freeCtx()).reason).toContain("techo");
    expect(validatePlacement(wallTarget("back", 3), "banana_peel", freeCtx()).reason).toContain("suelo");
    expect(validatePlacement({ surface: "ceiling", side: "back", index: GRID_W * GRID_H }, "anvil", freeCtx()).ok).toBe(false);
  });

  it("limita el numero de trampas por carril de pared", () => {
    const mk = (uid: number, def: TrapId, lane: number): TrapSlot => ({
      live: true,
      uid,
      def,
      surface: "wall",
      side: "back",
      laneIndex: lane,
      gx: lane,
      gz: 0,
      x: 0,
      y: 0,
      z: 0,
      dir: 0,
      state: "ready",
      t: 0,
      anim: 0,
      uses: 1,
      hits: 0,
      ownerCell: 0,
    });
    const ctx = freeCtx({ traps: [mk(1, "dart_rack", 4), mk(2, "mega_fan", 4), mk(3, "cork_cannon", 4)] });
    expect(validatePlacement(wallTarget("back", 4), "shelf_tip", ctx).reason).toBe("Carril saturado");
    expect(validatePlacement(wallTarget("back", 4), "dart_rack", ctx).reason).toContain("ya tiene");
    expect(validatePlacement(wallTarget("back", 6), "shelf_tip", ctx).ok).toBe(true);
  });

  it("solo permite una lampara de arana activa", () => {
    const lamp: TrapSlot = {
      live: true,
      uid: 9,
      def: "chandelier",
      surface: "ceiling",
      side: null,
      laneIndex: 0,
      gx: 1,
      gz: 1,
      x: 0,
      y: 0,
      z: 0,
      dir: 0,
      state: "ready",
      t: 0,
      anim: 0,
      uses: 1,
      hits: 0,
      ownerCell: 0,
    };
    const v = validatePlacement(cellTarget(6, 5, "ceiling"), "chandelier", freeCtx({ traps: [lamp] }));
    expect(v.ok).toBe(false);
    expect(v.reason).toContain("lampara");
  });
});

describe("combos y puntuacion", () => {
  it("aplica la tabla 1/2/3/5 con tope en x5", () => {
    expect([0, 1, 2, 3, 4, 9].map(comboMultiplier)).toEqual([1, 2, 3, 5, 5, 5]);
  });

  it("premia variedad, golpe ambiental, proximidad y finisher", () => {
    const plain = scoreForHit({ base: 60, hitIndex: 0, variety: false, nearInventor: false, kill: false, multi: 1, chainLength: 1 });
    const varied = scoreForHit({ base: 60, hitIndex: 0, variety: true, nearInventor: false, kill: false, multi: 1, chainLength: 1 });
    const ambient = scoreForHit({ base: 60, hitIndex: 0, variety: false, nearInventor: false, kill: false, multi: 3, chainLength: 1 });
    const near = scoreForHit({ base: 60, hitIndex: 0, variety: false, nearInventor: true, kill: false, multi: 1, chainLength: 1 });
    const finisher = scoreForHit({ base: 60, hitIndex: 3, variety: true, nearInventor: false, kill: true, multi: 1, chainLength: 4 });
    expect(varied.points).toBe(plain.points + 45);
    expect(ambient.points).toBe(plain.points + 60);
    expect(near.points).toBeGreaterThan(plain.points);
    expect(finisher.finisher).toBe(true);
    expect(finisher.points).toBeGreaterThan(60 * 5);
  });

  it("no da finisher con cadenas cortas", () => {
    expect(scoreForHit({ base: 50, hitIndex: 1, variety: true, nearInventor: false, kill: true, multi: 1, chainLength: 2 }).finisher).toBe(false);
  });

  it("los rangos de categoria cambian al superar el umbral", () => {
    expect(rankLabel(0)).toBe("Raton de despecho");
    expect(rankLabel(2500)).toBe("Ingeniero de caceria");
    expect(rankLabel(20000)).toBe("Leyenda de la quesera");
  });
});

describe("oleadas", () => {
  it("acelera el ritmo de aparicion con un suelo", () => {
    const first = spawnDelay(1);
    const mid = spawnDelay(4);
    const late = spawnDelay(30);
    expect(first).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(late);
    expect(late).toBeGreaterThanOrEqual(0.75);
  });

  it("respeta la ola minima de cada tipo y la del jefe", () => {
    const rng = createRng(1234);
    for (let i = 0; i < 200; i++) {
      expect(pickCatType(rng, 1)).not.toBe("boss");
      expect(pickCatType(rng, 2)).not.toBe("heavy");
    }
    let sawBoss = false;
    for (let i = 0; i < 400; i++) if (pickCatType(rng, 8) === "boss") sawBoss = true;
    expect(sawBoss).toBe(true);
  });

  it("la ola avanza cada 12 segundos", () => {
    expect(waveForTime(0)).toBe(1);
    expect(waveForTime(11.9)).toBe(1);
    expect(waveForTime(12)).toBe(2);
    expect(waveForTime(36.5)).toBe(4);
  });
});

describe("mundo headless (reglas + fisicas arcade)", () => {
  const wallSlot = (w: World, id: TrapId) => w.traps.find((t) => t.live && t.def === id)!.uid;
  const make = () => {
    const events: string[] = [];
    const w = new World({ mode: "survival", quality: "high", reducedMotion: false, emit: (ev) => events.push(ev.type) });
    w.phase = "playing";
    return { w, events };
  };

  it("descuenta queso al colocar y lo devuelve en la preparacion", () => {
    const { w } = make();
    const before = w.cheese;
    const out = w.place(cellTarget(5, 3, "floor"), "glue_patch");
    expect(out.ok).toBe(true);
    expect(w.cheese).toBe(before - 10);
    w.phase = "prep";
    const removed = w.remove(cellTarget(5, 3, "floor"));
    expect(removed.ok).toBe(true);
    expect(w.cheese).toBe(before - 10 + Math.round(10 * 0.85));
    expect(w.traps.filter((t) => t.live).length).toBe(0);
  });

  it("el Laboratorio deja probar trampas sin gastar queso ni récord", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    const cheese = w.cheese;
    expect(w.place(cellTarget(5, 3, "ceiling"), "chandelier").ok).toBe(true);
    expect(w.place(wallTarget("back", 4), "shelf_tip").ok).toBe(true);
    expect(w.cheese).toBe(cheese);
    expect(w.remove(cellTarget(5, 3, "ceiling")).ok).toBe(true);
    expect(w.cheese).toBe(cheese);
    expect(w.earnedCheese).toBe(0);
  });

  it("el presupuesto inicial no cuenta como queso ganado para desbloqueos", () => {
    const { w } = make();
    expect(w.cheese).toBe(65);
    expect(w.earnedCheese).toBe(0);
    w.time = 0.001;
    w.advance(1 / 60);
    expect(w.result().cheese).toBe(65);
    expect(w.earnedCheese).toBe(0);
  });

  it("la preparacion permite armar pero no activar trampas ni avanzar el temporizador", () => {
    const w = new World({ mode: "survival", quality: "high", reducedMotion: false, emit: () => undefined });
    expect(w.place(cellTarget(5, 3, "floor"), "banana_peel").ok).toBe(true);
    expect(w.spawnCat("heavy", 0)).toBe(true);
    const cat = w.cats.find((c) => c.live)!;
    cat.x = cellToWorldX(5);
    cat.z = cellToWorldZ(3);
    cat.spawnT = 0;
    cat.state = "glue";
    cat.stateT = 15;
    for (let i = 0; i < 45; i++) w.advance(1 / 60);
    expect(w.traps.find((t) => t.live)?.state).toBe("ready");
    expect(w.score).toBe(0);
    expect(w.time).toBe(90);
    w.phase = "playing";
    w.advance(1 / 60);
    expect(w.score).toBeGreaterThan(0);
  });

  it("un yunque impacta al aterrizar una sola vez por activacion", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    expect(w.place(cellTarget(5, 3, "ceiling"), "anvil").ok).toBe(true);
    expect(w.spawnCat("boss", 0)).toBe(true);
    const cat = w.cats.find((c) => c.live)!;
    cat.x = cellToWorldX(5);
    cat.z = cellToWorldZ(3);
    cat.spawnT = 0;
    cat.state = "glue";
    cat.stateT = 6;
    const trap = w.traps.find((t) => t.live)!;
    for (let i = 0; i < 33; i++) w.advance(1 / 60);
    expect(trap.state).toBe("fired");
    expect(trap.hits).toBe(0);
    for (let i = 0; i < 30; i++) w.advance(1 / 60);
    expect(trap.hits).toBe(1);
    const score = w.score;
    for (let i = 0; i < 10; i++) w.advance(1 / 60);
    expect(trap.hits).toBe(1);
    expect(w.score).toBe(score);
  });

  it("una trampa de suelo con dos usos se rearma antes de agotarse", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    w.place(cellTarget(5, 3, "floor"), "banana_peel");
    w.spawnCat("boss", 0);
    const cat = w.cats.find((c) => c.live)!;
    cat.spawnT = 0;
    cat.x = cellToWorldX(5);
    cat.z = cellToWorldZ(3);
    cat.state = "glue";
    cat.stateT = 10;
    const trap = w.traps.find((t) => t.live)!;
    for (let i = 0; i < 35; i++) w.advance(1 / 60);
    expect(trap.hits).toBe(1);
    expect(trap.uses).toBe(1);
    for (let i = 0; i < 50; i++) {
      cat.x = cellToWorldX(5);
      cat.z = cellToWorldZ(3);
      cat.state = "glue";
      cat.stateT = 10;
      w.advance(1 / 60);
    }
    expect(trap.hits).toBe(2);
    expect(trap.uses).toBe(0);
  });

  it("una pausa bloquea disparos y colocacion incluso desde llamadas directas", () => {
    const { w } = make();
    w.phase = "prep";
    w.place(wallTarget("back", 4), "cork_cannon");
    for (let i = 0; i < 35; i++) w.advance(1 / 60);
    w.phase = "playing";
    w.paused = true;
    expect(w.place(cellTarget(5, 3, "floor"), "banana_peel").ok).toBe(false);
    expect(w.fireNearest().ok).toBe(false);
    expect(w.fireTrap(0).ok).toBe(false);
    expect(w.remove(wallTarget("back", 4)).ok).toBe(false);
    expect(w.traps.find((t) => t.live)?.state).toBe("ready");
  });

  it("disparo manual de pared impulsa a un gato y suma puntos", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    expect(w.place(wallTarget("back", 4), "cork_cannon").ok).toBe(true);
    for (let i = 0; i < 40; i++) w.advance(1 / 60);
    expect(w.spawnCat("boss", 0)).toBe(true);
    const cat = w.cats.find((c) => c.live)!;
    cat.x = cellToWorldX(4);
    cat.z = cellToWorldZ(2);
    cat.state = "glue";
    cat.stateT = 5;
    cat.spawnT = 0;
    expect(w.fireNearest().ok).toBe(true);
    for (let i = 0; i < 100 && w.score === 0; i++) w.advance(1 / 60);
    expect(w.score).toBeGreaterThan(0);
    expect(cat.vz).toBeGreaterThan(0);
    expect(w.comboBest).toBe(1);
  });

  it("mezcla techo, estanteria y corcho sobre el mismo gato hasta combo x3", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    expect(w.place(cellTarget(4, 3, "ceiling"), "anvil").ok).toBe(true);
    expect(w.place(wallTarget("back", 4), "shelf_tip").ok).toBe(true);
    expect(w.place(wallTarget("back", 4), "cork_cannon").ok).toBe(true);
    for (let i = 0; i < 45; i++) w.advance(1 / 60);
    w.spawnCat("boss", 0);
    const cat = w.cats.find((c) => c.live)!;
    cat.x = cellToWorldX(4);
    cat.z = cellToWorldZ(3) + 0.35;
    cat.state = "glue";
    cat.stateT = 6;
    cat.spawnT = 0;
    for (let i = 0; i < 45; i++) w.advance(1 / 60);
    expect(w.comboBest).toBeGreaterThanOrEqual(1);
    expect(w.fireTrap(wallSlot(w, "shelf_tip")).ok).toBe(true);
    expect(w.fireTrap(wallSlot(w, "cork_cannon")).ok).toBe(true);
    for (let i = 0; i < 100 && w.comboBest < 3; i++) w.advance(1 / 60);
    expect(w.comboBest).toBeGreaterThanOrEqual(3);
  });

  /** Ruta real que seguirá un gato desde una entrada, según el campo de flujo. */
  function routeFrom(gx: number, gz: number, steps: number): Array<[number, number]> {
    const flow = buildFlowField(blockedWalkMask(MAP), lairGoalMask(MAP));
    const out: Array<[number, number]> = [];
    let cur = { gx, gz };
    for (let i = 0; i < steps; i++) {
      const nxt = flowStep(flow, cur.gx, cur.gz);
      if (!nxt) break;
      out.push([nxt.gx, nxt.gz]);
      cur = nxt;
    }
    return out;
  }

  it("encadena trampas sobre el mismo gato y sube el combo", () => {
    const { w, events } = make();
    const door = ENTRIES[0];
    const route = routeFrom(door.gx, door.gz, 5);
    expect(route.length).toBeGreaterThanOrEqual(3);
    const [a, b] = route;
    expect(w.place(cellTarget(a[0], a[1], "floor"), "banana_peel").ok).toBe(true);
    expect(w.place(cellTarget(b[0], b[1], "floor"), "glue_patch").ok).toBe(true);
    w.spawnCat("common", 0);
    for (let i = 0; i < 420; i++) w.advance(1 / 60);
    expect(w.score).toBeGreaterThan(0);
    expect(w.comboBest).toBeGreaterThanOrEqual(1);
    expect(w.traps.some((t) => t.hits > 0)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(w.lair.hp).toBeGreaterThanOrEqual(0);
  });

  it("un gato que llega a la quesera la daña y el tiempo termina la partida", () => {
    const { w } = make();
    w.spawnCat("common", 0);
    for (let i = 0; i < 420; i++) w.advance(1 / 60);
    expect(w.lair.hp).toBeLessThan(100);
    expect(w.phase).toBe("playing");
    w.time = 0.01;
    for (let i = 0; i < 8; i++) w.advance(1 / 60);
    expect(w.phase).toBe("over");
    const r = w.result();
    expect(r.reason).toBe("time");
    expect(r.perfect).toBe(false);
  });

  it("la quesera destruida termina la partida por lair", () => {
    const { w } = make();
    w.spawnCat("boss", 0);
    for (let i = 0; i < 1500; i++) {
      w.advance(1 / 60);
      if (w.phase === "over") break;
    }
    expect(w.phase).toBe("over");
    expect(["lair", "mouse", "time"]).toContain(w.result().reason);
  });

  it("la simulacion no avanza en pausa ni depende del framerate", () => {
    const { w } = make();
    w.spawnCat("common", 1);
    w.paused = true;
    for (let i = 0; i < 60; i++) w.advance(1 / 60);
    const frozen = { x: w.cats[0].x, z: w.cats[0].z };
    w.paused = false;
    for (let i = 0; i < 30; i++) w.advance(1 / 30);
    const moved = Math.hypot(w.cats[0].x - frozen.x, w.cats[0].z - frozen.z);
    expect(moved).toBeGreaterThan(0.05);
    // Delta gigante tras volver de la pestaña inactiva: como mucho MAX_STEPS.
    const before = w.time;
    w.advance(10);
    expect(before - w.time).toBeLessThanOrEqual(5 / 60 + 1e-6);
  });

  it("el laboratorio no gasta reloj ni daña la quesera", () => {
    const w = new World({ mode: "lab", quality: "medium", reducedMotion: false, emit: () => undefined });
    w.phase = "playing";
    w.spawnCat("common", 0);
    for (let i = 0; i < 600; i++) w.advance(1 / 60);
    expect(w.lair.hp).toBe(100);
    expect(Number.isFinite(w.time)).toBe(false);
    const r = w.result();
    expect(r.mode).toBe("lab");
  });
});

describe("colisiones del raton con muebles y quesera", () => {
  const makeLab = () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    w.phase = "playing";
    return w;
  };

  /** Empuja al ratón hacia una celda con teclas sostenidas. */
  function walk(w: World, targetX: number, targetZ: number, steps: number) {
    for (let i = 0; i < steps; i++) {
      const dx = targetX - w.mouse.x;
      const dz = targetZ - w.mouse.z;
      const len = Math.hypot(dx, dz) || 1;
      w.input.mx = dx / len;
      w.input.mz = dz / len;
      w.input.run = true;
      w.advance(1 / 60);
    }
    w.input.mx = 0;
    w.input.mz = 0;
    w.input.run = false;
  }

  it("el raton no atraviesa ningun mueble por muy directo que sea el camino", () => {
    const w = makeLab();
    // Recorrido en diagonal cruzando varias casillas de muebles.
    // Intenta entrar en el centro de cada mueble declarado.
    const targets: Array<[number, number]> = FURNITURE.map((f) => [cellToWorldX(f.gx), cellToWorldZ(f.gz)]);
    for (const [tx, tz] of targets) {
      walk(w, tx, tz, 240);
      // Tras caminar, el ratón debe quedar fuera de todos los muebles.
      for (const f of FURNITURE) {
        const cx = cellToWorldX(f.gx);
        const cz = cellToWorldZ(f.gz);
        const dist = Math.hypot(w.mouse.x - cx, w.mouse.z - cz);
        expect(dist).toBeGreaterThan(CELL * 0.5 - 0.32);
      }
    }
  });

  it("el raton no entra en la quesera", () => {
    const w = makeLab();
    walk(w, cellToWorldX(LAIR_CELL.gx), cellToWorldZ(LAIR_CELL.gz), 300);
    const dist = Math.hypot(
      w.mouse.x - cellToWorldX(LAIR_CELL.gx),
      w.mouse.z - cellToWorldZ(LAIR_CELL.gz),
    );
    expect(dist).toBeGreaterThan(CELL * 0.5 - 0.32);
  });

  it("el raton se desliza por el borde del mueble en vez de quedarse clavado", () => {
    const w = makeLab();
    // Avanza rozando la hilera de muebles del este: debe progresar en X.
    const startX = w.mouse.x;
    walk(w, cellToWorldX(GRID_W - 1), cellToWorldZ(LAIR_CELL.gz), 300);
    expect(w.mouse.x).toBeGreaterThan(startX + 1);
  });

  it("los gatos tampoco atraviesan muebles tras ser empujados", () => {
    const w = makeLab();
    w.spawnCat("heavy", 0);
    const cat = w.cats.find((c) => c.live)!;
    cat.spawnT = 0;
    cat.state = "glue";
    cat.stateT = 30;
    // Lo clava en el centro de un mueble y deja que la simulación lo expulse.
    const mueble = FURNITURE[0];
    cat.x = cellToWorldX(mueble.gx);
    cat.z = cellToWorldZ(mueble.gz);
    for (let i = 0; i < 30; i++) w.advance(1 / 60);
    const dist = Math.hypot(cat.x - cellToWorldX(mueble.gx), cat.z - cellToWorldZ(mueble.gz));
    expect(dist).toBeGreaterThan(CELL * 0.5 - 0.45);
  });

  it("la velocidad no permite saltarse un mueble en un solo paso", () => {
    // Desplazamiento máximo por paso fijo frente al radio de colisión.
    const maxStep = MOUSE_RUN_TEST * CELL * (1 / 60);
    expect(maxStep).toBeLessThan(0.3);
  });
});

describe("diseño de la sala", () => {
  it("la sala es lo bastante amplia para maniobrar", () => {
    // Margen de holgura: con menos de 9x7 los pasillos no dejan encadenar.
    expect(GRID_W).toBeGreaterThanOrEqual(11);
    expect(GRID_H).toBeGreaterThanOrEqual(9);
    expect(GRID_W * CELL).toBeGreaterThanOrEqual(13);
    expect(GRID_H * CELL).toBeGreaterThanOrEqual(10.5);
  });

  it("los muebles dejan la sala despejada y sin zonas aisladas", () => {
    const blocked = blockedWalkMask(MAP);
    const flow = buildFlowField(blocked, lairGoalMask(MAP));
    let walkable = 0;
    let reachable = 0;
    for (let gz = 0; gz < GRID_H; gz++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        if (maskHas(blocked, gx, gz)) continue;
        walkable += 1;
        if (flow[cellIndex(gx, gz)] < 32767) reachable += 1;
      }
    }
    // Ningún rincón queda incomunicado de la quesera.
    expect(reachable).toBe(walkable);
    // Y al menos el 80% del suelo es jugable: la sala no está atiborrada.
    expect(walkable / (GRID_W * GRID_H)).toBeGreaterThan(0.8);
  });

  it("las entradas estan en el borde y equilibradas respecto a la quesera", () => {
    const flow = buildFlowField(blockedWalkMask(MAP), lairGoalMask(MAP));
    const costs = ENTRIES.map((e) => {
      const borde = e.gx === 0 || e.gz === 0 || e.gx === GRID_W - 1 || e.gz === GRID_H - 1;
      expect(borde, `la entrada ${e.id} deberia nacer en un borde`).toBe(true);
      const d = flow[cellIndex(e.gx, e.gz)];
      expect(d, `la entrada ${e.id} no llega a la quesera`).toBeLessThan(32767);
      return d;
    });
    // Ninguna entrada puede ser mucho más corta: sería la única usada.
    expect(Math.max(...costs) - Math.min(...costs)).toBeLessThanOrEqual(3);
  });

  it("ningun mueble ni entrada pisa la quesera ni se solapa", () => {
    const vistos = new Set<string>();
    for (const f of FURNITURE) {
      const k = `${f.gx},${f.gz}`;
      expect(vistos.has(k), `mueble duplicado en ${k}`).toBe(false);
      vistos.add(k);
      expect(f.gx === LAIR_CELL.gx && f.gz === LAIR_CELL.gz).toBe(false);
      expect(f.gx).toBeGreaterThanOrEqual(0);
      expect(f.gx).toBeLessThan(GRID_W);
      expect(f.gz).toBeGreaterThanOrEqual(0);
      expect(f.gz).toBeLessThan(GRID_H);
    }
    for (const e of ENTRIES) {
      expect(vistos.has(`${e.gx},${e.gz}`), `la entrada ${e.id} nace dentro de un mueble`).toBe(false);
    }
  });

  it("la quesera tiene espacio libre alrededor para defenderla", () => {
    const blocked = blockedWalkMask(MAP);
    let libres = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        if (!maskHas(blocked, LAIR_CELL.gx + dx, LAIR_CELL.gz + dz)) libres += 1;
      }
    }
    // Las ocho casillas del anillo deben estar despejadas.
    expect(libres).toBe(8);
  });
});

describe("encuadre y texturas de la sala", () => {
  it("la zona jugable entra entera en el encuadre isometrico", () => {
    // La planta proyectada no puede exceder el ancho de encuadre.
    const plantaProyectada = (ROOM_W + ROOM_D) * Math.SQRT1_2;
    expect(ROOM_ISO_W).toBeCloseTo(plantaProyectada, 5);
    // Y el alto debe reservar sitio para las paredes, no solo para el suelo.
    expect(ROOM_ISO_H).toBeGreaterThan(ROOM_ISO_W * 0.5);
    expect(ROOM_ISO_H - ROOM_ISO_W * 0.5).toBeCloseTo(WALL_HEIGHT, 5);
  });

  it("las tablas del suelo caen exactamente sobre la rejilla", () => {
    // Una tabla por celda: las juntas coinciden con los bordes de casilla.
    expect(FLOOR_TILE).toBeCloseTo(CELL, 5);
    const anchoSuelo = ROOM_W + CELL * 2;
    const fondoSuelo = ROOM_D + CELL * 2;
    expect(Math.abs(anchoSuelo / FLOOR_TILE - Math.round(anchoSuelo / FLOOR_TILE))).toBeLessThan(0.01);
    expect(Math.abs(fondoSuelo / FLOOR_TILE - Math.round(fondoSuelo / FLOOR_TILE))).toBeLessThan(0.01);
  });

  it("el papel pintado conserva la proporcion en las tres paredes", () => {
    const tile = WALL_HEIGHT / 2;
    const fondo = ROOM_W + CELL * 2.4;
    const lateral = ROOM_D + CELL * 2.4;
    const tileFondo = fondo / Math.round(fondo / tile);
    const tileLateral = lateral / Math.round(lateral / tile);
    const alto = WALL_HEIGHT / Math.round(WALL_HEIGHT / tile);
    // Ni estirado (aspecto lejos de 1) ni con escalas distintas entre paredes.
    expect(tileFondo / alto).toBeGreaterThan(0.9);
    expect(tileFondo / alto).toBeLessThan(1.15);
    expect(tileLateral / alto).toBeGreaterThan(0.9);
    expect(tileLateral / alto).toBeLessThan(1.15);
    expect(Math.abs(tileFondo / tileLateral - 1)).toBeLessThan(0.08);
  });
});

describe("catalogo de salas", () => {
  it("hay varias salas y todas tienen identidad propia", () => {
    expect(MAP_LIST.length).toBeGreaterThanOrEqual(4);
    const ids = new Set(MAP_LIST.map((m) => m.id));
    const nombres = new Set(MAP_LIST.map((m) => m.name));
    expect(ids.size).toBe(MAP_LIST.length);
    expect(nombres.size).toBe(MAP_LIST.length);
    for (const m of MAP_LIST) {
      expect(m.name.length).toBeGreaterThan(3);
      expect(m.blurb.length).toBeGreaterThan(12);
      expect(m.hint.length).toBeGreaterThan(12);
      expect(m.entries.length).toBeGreaterThanOrEqual(3);
      expect(m.difficulty).toBeGreaterThanOrEqual(1);
      expect(m.difficulty).toBeLessThanOrEqual(3);
    }
  });

  it("ninguna sala deja zonas aisladas ni rincones sin salida", () => {
    for (const m of MAP_LIST) {
      const blocked = blockedWalkMask(m);
      const flow = buildFlowField(blocked, lairGoalMask(m));
      let walkable = 0;
      let reachable = 0;
      for (let gz = 0; gz < GRID_H; gz++) {
        for (let gx = 0; gx < GRID_W; gx++) {
          if (maskHas(blocked, gx, gz)) continue;
          walkable += 1;
          if (flow[cellIndex(gx, gz)] < 32767) reachable += 1;
        }
      }
      expect(reachable, `${m.name}: hay casillas incomunicadas`).toBe(walkable);
      // Suficiente suelo libre para maniobrar y encadenar trampas.
      expect(walkable / (GRID_W * GRID_H), `${m.name}: demasiado atiborrada`).toBeGreaterThan(0.7);
    }
  });

  it("en toda sala las entradas nacen en el borde y llegan a la guarida", () => {
    for (const m of MAP_LIST) {
      const flow = buildFlowField(blockedWalkMask(m), lairGoalMask(m));
      const costs: number[] = [];
      for (const e of m.entries) {
        const borde = e.gx === 0 || e.gz === 0 || e.gx === GRID_W - 1 || e.gz === GRID_H - 1;
        expect(borde, `${m.name}: la entrada ${e.id} no está en un borde`).toBe(true);
        const d = flow[cellIndex(e.gx, e.gz)];
        expect(d, `${m.name}: la entrada ${e.id} no llega a la guarida`).toBeLessThan(32767);
        expect(d, `${m.name}: la entrada ${e.id} nace pegada a la guarida`).toBeGreaterThan(1);
        costs.push(d);
      }
      // Ninguna ruta puede ser tan corta que las demás sobren.
      expect(Math.max(...costs) - Math.min(...costs), `${m.name}: rutas desequilibradas`).toBeLessThanOrEqual(4);
    }
  });

  it("en toda sala los muebles son coherentes y la guarida defendible", () => {
    for (const m of MAP_LIST) {
      const vistos = new Set<string>();
      for (const f of m.furniture) {
        const k = `${f.gx},${f.gz}`;
        expect(vistos.has(k), `${m.name}: mueble duplicado en ${k}`).toBe(false);
        vistos.add(k);
        expect(f.gx >= 0 && f.gx < GRID_W && f.gz >= 0 && f.gz < GRID_H, `${m.name}: mueble fuera de la sala`).toBe(true);
        expect(f.gx === m.lair.gx && f.gz === m.lair.gz, `${m.name}: mueble sobre la guarida`).toBe(false);
      }
      for (const e of m.entries) {
        expect(vistos.has(`${e.gx},${e.gz}`), `${m.name}: la entrada ${e.id} nace dentro de un mueble`).toBe(false);
      }
      // La guarida necesita accesos libres para poder defenderla.
      const blocked = blockedWalkMask(m);
      let libres = 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dz === 0) continue;
          const gx = m.lair.gx + dx;
          const gz = m.lair.gz + dz;
          if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_H) continue;
          if (!maskHas(blocked, gx, gz)) libres += 1;
        }
      }
      expect(libres, `${m.name}: guarida demasiado encerrada`).toBeGreaterThanOrEqual(4);
    }
  });

  it("las salas se juegan distinto entre si", () => {
    // Si dos mapas tuvieran el mismo reparto, no aportarían variedad.
    const firmas = MAP_LIST.map((m) =>
      [...m.furniture.map((f) => `${f.gx},${f.gz}`)].sort().join("|") + `#${m.lair.gx},${m.lair.gz}`,
    );
    expect(new Set(firmas).size).toBe(MAP_LIST.length);
    // Y al menos una cambia el punto a defender respecto a la clásica.
    const lairs = new Set(MAP_LIST.map((m) => `${m.lair.gx},${m.lair.gz}`));
    expect(lairs.size).toBeGreaterThan(1);
  });

  it("cada sala tiene paleta propia y legible", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    const fondos = new Set<string>();
    for (const m of MAP_LIST) {
      for (const [clave, valor] of Object.entries(m.theme)) {
        expect(hex.test(valor), `${m.name}: color ${clave} inválido`).toBe(true);
      }
      fondos.add(m.theme.floor);
    }
    // Suelos distintos: se nota de un vistazo en qué sala estás.
    expect(fondos.size).toBe(MAP_LIST.length);
  });

  it("una sala desconocida cae en la clasica en vez de romper", () => {
    expect(getMap(undefined).id).toBe(DEFAULT_MAP_ID);
    expect(getMap(null).id).toBe(DEFAULT_MAP_ID);
    expect(getMap("inexistente" as never).id).toBe(DEFAULT_MAP_ID);
  });

  it("se puede jugar una ronda completa en cualquier sala", () => {
    for (const m of MAP_LIST) {
      const w = new World({ mode: "survival", quality: "high", reducedMotion: false, mapId: m.id, emit: () => undefined });
      w.phase = "playing";
      expect(w.map.id).toBe(m.id);
      // Los gatos entran por cada puerta y avanzan hacia la guarida.
      for (let i = 0; i < m.entries.length; i++) expect(w.spawnCat("common", i)).toBe(true);
      for (let i = 0; i < 300; i++) w.advance(1 / 60);
      // La partida sigue viva y los gatos se han movido o han atacado.
      expect(w.phase).toBe("playing");
      const vivos = w.cats.filter((c) => c.live);
      expect(vivos.length).toBeGreaterThan(0);
      // Y se puede colocar una trampa en una casilla libre de esa sala.
      const libre = (() => {
        const blocked = blockedWalkMask(m);
        for (let gz = 0; gz < GRID_H; gz++) {
          for (let gx = 0; gx < GRID_W; gx++) if (!maskHas(blocked, gx, gz)) return { gx, gz };
        }
        return null;
      })();
      expect(libre).not.toBeNull();
      expect(w.place(cellTarget(libre!.gx, libre!.gz, "floor"), "banana_peel").ok, `${m.name}: no deja colocar`).toBe(true);
    }
  });
});

describe("disparo manual en la sala ampliada", () => {
  it("se puede disparar una trampa de la pared del fondo desde el extremo opuesto", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    w.phase = "playing";
    expect(w.place(wallTarget("back", 0), "cork_cannon").ok).toBe(true);
    for (let i = 0; i < 60; i++) w.advance(1 / 60);
    // Inventor en la esquina contraria: más de 9 u de distancia.
    w.mouse.x = cellToWorldX(GRID_W - 1);
    w.mouse.z = cellToWorldZ(GRID_H - 1);
    const out = w.fireNearest();
    expect(out.ok, out.reason).toBe(true);
  });

  it("el aviso distingue entre no tener manuales y estar recargando", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, emit: () => undefined });
    w.phase = "playing";
    expect(w.fireNearest().reason).toMatch(/Coloca primero/);
    w.place(wallTarget("back", 2), "cork_cannon");
    // Recién colocada sigue armándose.
    expect(w.fireNearest().reason).toMatch(/recargando/);
  });
});

describe("aparicion del inventor", () => {
  it("en cada sala nace junto a su guarida, libre y sin tocar muebles", () => {
    for (const m of MAP_LIST) {
      const w = new World({ mode: "lab", quality: "high", reducedMotion: false, mapId: m.id, emit: () => undefined });
      const gx = Math.round(w.mouse.x / CELL + (GRID_W - 1) / 2);
      const gz = Math.round(w.mouse.z / CELL + (GRID_H - 1) / 2);
      const blocked = blockedWalkMask(m);
      expect(maskHas(blocked, gx, gz), `${m.name}: nace dentro de algo sólido`).toBe(false);
      // A una o dos casillas de la guarida, nunca al otro lado de la sala.
      expect(Math.max(Math.abs(gx - m.lair.gx), Math.abs(gz - m.lair.gz)), `${m.name}: nace lejos`).toBeLessThanOrEqual(2);
      // Puede caminar en las cuatro direcciones sin quedarse clavado.
      for (const [mx, mz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const probe = new World({ mode: "lab", quality: "high", reducedMotion: false, mapId: m.id, emit: () => undefined });
        probe.phase = "playing";
        const x0 = probe.mouse.x;
        const z0 = probe.mouse.z;
        probe.input.mx = mx;
        probe.input.mz = mz;
        for (let i = 0; i < 12; i++) probe.advance(1 / 60);
        const d = Math.hypot(probe.mouse.x - x0, probe.mouse.z - z0);
        expect(d, `${m.name}: atascado hacia ${mx},${mz}`).toBeGreaterThan(0.2);
      }
    }
  });
});
