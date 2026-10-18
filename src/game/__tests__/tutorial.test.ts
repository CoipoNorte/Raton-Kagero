import { describe, expect, it } from "vitest";
import {
  TUTORIAL_LAST,
  TUTORIAL_MOVE_DISTANCE,
  TUTORIAL_STEPS,
  snapshotOf,
  stepComplete,
  tutorialStep,
  type TutorialSnapshot,
} from "../tutorial";
import { World } from "../simulation";
import { blockedWalkMask, cellTarget, cellToWorldX, cellToWorldZ, maskHas, wallTarget } from "../logic";
import { getMap } from "../maps";
import { GRID_H, GRID_W } from "../constants";
import type { TrapId } from "../types";

const ZERO: TutorialSnapshot = {
  moved: 0,
  selected: "banana_peel",
  floor: 0,
  wall: 0,
  ceiling: 0,
  manualFired: 0,
  score: 0,
  comboBest: 0,
  catsLive: 0,
  paused: false,
};

describe("definicion del tutorial", () => {
  it("tiene pasos unicos, con titulo, texto por dispositivo y consejo", () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(TUTORIAL_STEPS.map((s) => s.id));
    expect(ids.size).toBe(TUTORIAL_STEPS.length);
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.length, step.id).toBeGreaterThan(3);
      expect(step.why.length, step.id).toBeGreaterThan(10);
      for (const input of ["keyboard", "touch", "pad"] as const) {
        expect(step.body[input].length, `${step.id}/${input}`).toBeGreaterThan(20);
      }
    }
    // Empieza con bienvenida y termina con el cierre.
    expect(TUTORIAL_STEPS[0].id).toBe("welcome");
    expect(TUTORIAL_STEPS[TUTORIAL_LAST].id).toBe("done");
  });

  it("los pasos de control explican teclado, tactil y mando por separado", () => {
    // Si los tres textos fueran iguales, alguien con mando no sabría qué pulsar.
    for (const id of ["move", "select", "floor", "wall", "ceiling", "manual", "remove", "pause"]) {
      const step = TUTORIAL_STEPS.find((s) => s.id === id)!;
      const textos = new Set([step.body.keyboard, step.body.touch, step.body.pad]);
      expect(textos.size, `${id}: textos de control repetidos`).toBe(3);
    }
  });

  it("cubre las tres superficies, combos, disparo manual, retirada y pausa", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    for (const imprescindible of ["move", "floor", "wall", "ceiling", "catch", "combo", "manual", "remove", "pause"]) {
      expect(ids).toContain(imprescindible);
    }
  });

  it("ningun paso de accion se da por hecho sin hacer nada", () => {
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      expect(stepComplete(i, ZERO, ZERO), TUTORIAL_STEPS[i].id).toBe(false);
    }
  });

  it("los pasos informativos solo avanzan con el boton", () => {
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      if (!TUTORIAL_STEPS[i].manual) continue;
      const todo: TutorialSnapshot = { ...ZERO, moved: 99, floor: 9, wall: 9, ceiling: 9, score: 999, comboBest: 5, paused: true };
      expect(stepComplete(i, todo, ZERO), TUTORIAL_STEPS[i].id).toBe(false);
    }
  });

  it("los indices fuera de rango no rompen", () => {
    expect(tutorialStep(-3).id).toBe("welcome");
    expect(tutorialStep(999).id).toBe("done");
  });
});

describe("recorrido completo con un mundo real", () => {
  it("se pueden completar los doce pasos haciendo cada accion", () => {
    const w = new World({ mode: "lab", quality: "high", reducedMotion: false, mapId: "salon", emit: () => undefined });
    w.phase = "playing";
    const map = getMap("salon");

    let moved = 0;
    let selected: TrapId | null = "banana_peel";
    let paused = false;
    let last = { x: w.mouse.x, z: w.mouse.z };
    const tick = (frames: number) => {
      for (let i = 0; i < frames; i++) {
        w.advance(1 / 60);
        moved += Math.hypot(w.mouse.x - last.x, w.mouse.z - last.z);
        last = { x: w.mouse.x, z: w.mouse.z };
      }
    };
    const snap = () => snapshotOf(w, { moved, selected, paused });

    // Casillas libres de esta sala para colocar sin chocar con muebles.
    const blocked = blockedWalkMask(map);
    const free: Array<{ gx: number; gz: number }> = [];
    for (let gz = 1; gz < GRID_H - 1; gz++) {
      for (let gx = 1; gx < GRID_W - 1; gx++) if (!maskHas(blocked, gx, gz)) free.push({ gx, gz });
    }

    let index = 0;
    let start = snap();
    const expectStep = (id: string) => expect(tutorialStep(index).id).toBe(id);
    const advance = () => {
      expect(stepComplete(index, snap(), start), `el paso ${tutorialStep(index).id} no se completó`).toBe(true);
      index += 1;
      start = snap();
    };

    // 1. Bienvenida: informativa.
    expectStep("welcome");
    index += 1;
    start = snap();

    // 2. Caminar.
    expectStep("move");
    w.input.run = true;
    for (const [mx, mz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      w.input.mx = mx;
      w.input.mz = mz;
      tick(20);
    }
    w.input.mx = 0;
    w.input.mz = 0;
    expect(moved).toBeGreaterThanOrEqual(TUTORIAL_MOVE_DISTANCE);
    advance();

    // 3. Elegir el pegamento.
    expectStep("select");
    expect(stepComplete(index, snap(), start)).toBe(false);
    selected = "glue_patch";
    advance();

    // 4. Suelo.
    expectStep("floor");
    expect(w.place(cellTarget(free[0].gx, free[0].gz, "floor"), "glue_patch").ok).toBe(true);
    advance();

    // 5. Pared.
    expectStep("wall");
    expect(w.place(wallTarget("back", 1), "boxing_glove").ok).toBe(true);
    advance();

    // 6. Techo.
    expectStep("ceiling");
    expect(w.place(cellTarget(free[3].gx, free[3].gz, "ceiling"), "anvil").ok).toBe(true);
    advance();

    // 7. Atrapar un gato: un gato pisa una cáscara armada.
    expectStep("catch");
    const peel = free[6];
    expect(w.place(cellTarget(peel.gx, peel.gz, "floor"), "banana_peel").ok).toBe(true);
    tick(40);
    expect(w.spawnCat("common", 0)).toBe(true);
    const cat = w.cats.find((c) => c.live)!;
    cat.spawnT = 0;
    cat.x = cellToWorldX(peel.gx);
    cat.z = cellToWorldZ(peel.gz);
    for (let i = 0; i < 60 && w.score <= start.score; i++) tick(1);
    advance();

    // 8. Combo: dos trampas distintas sobre el mismo gato en la ventana.
    expectStep("combo");
    const laneX = 7;
    expect(w.place(wallTarget("back", laneX), "shelf_tip").ok).toBe(true);
    expect(w.place(wallTarget("back", laneX), "cork_cannon").ok).toBe(true);
    tick(50);
    w.clearCats();
    expect(w.spawnCat("boss", 0)).toBe(true);
    const boss = w.cats.find((c) => c.live)!;
    boss.spawnT = 0;
    boss.state = "glue";
    boss.stateT = 8;
    boss.x = cellToWorldX(laneX);
    boss.z = cellToWorldZ(5);
    const uid = (def: TrapId) => w.traps.find((t) => t.live && t.def === def)!.uid;
    expect(w.fireTrap(uid("shelf_tip")).ok).toBe(true);
    expect(w.fireTrap(uid("cork_cannon")).ok).toBe(true);
    for (let i = 0; i < 120 && w.comboBest < 2; i++) tick(1);
    advance();

    // 9. Disparo manual: se espera a que el cañón recargue y se dispara otra vez.
    expectStep("manual");
    for (let i = 0; i < 240; i++) {
      tick(1);
      const cork = w.traps.find((t) => t.live && t.def === "cork_cannon");
      if (cork?.state === "ready") break;
    }
    start = snap();
    expect(stepComplete(index, snap(), start)).toBe(false);
    expect(w.fireNearest().ok).toBe(true);
    tick(2);
    advance();

    // 10. Retirar una trampa.
    expectStep("remove");
    expect(w.remove(cellTarget(free[0].gx, free[0].gz, "floor")).ok).toBe(true);
    advance();

    // 11. Pausa.
    expectStep("pause");
    paused = true;
    advance();

    // 12. Cierre.
    expectStep("done");
    expect(index).toBe(TUTORIAL_LAST);
  });
});
