import { TRAPS } from "./traps";
import type { SurfaceKind, TrapId, TrapState } from "./types";

/*
 * Tutorial guiado.
 *
 * Cada paso se completa HACIENDO la acción, no leyendo: el motor toma una
 * instantánea del juego al empezar el paso y avanza cuando la instantánea
 * actual cumple la condición. Todo es puro (sin React ni Three.js), así que
 * se puede probar recorriendo el tutorial completo con un mundo real.
 */

/** Cómo está jugando la persona: cambia los textos de control. */
export type InputKind = "keyboard" | "touch" | "pad";

/** Lo mínimo del mundo que el tutorial necesita observar. */
export interface TutorialWorldView {
  score: number;
  comboBest: number;
  traps: ReadonlyArray<{ live: boolean; surface: SurfaceKind; def: TrapId; state: TrapState }>;
  cats: ReadonlyArray<{ live: boolean }>;
}

export interface TutorialSnapshot {
  /** Distancia total caminada por el inventor, en unidades de mundo. */
  moved: number;
  selected: TrapId | null;
  floor: number;
  wall: number;
  ceiling: number;
  /** Trampas manuales disparadas que aún se ven en su animación o recarga. */
  manualFired: number;
  score: number;
  comboBest: number;
  catsLive: number;
  paused: boolean;
}

export function snapshotOf(view: TutorialWorldView, extra: { moved: number; selected: TrapId | null; paused: boolean }): TutorialSnapshot {
  let floor = 0;
  let wall = 0;
  let ceiling = 0;
  let manualFired = 0;
  for (const t of view.traps) {
    if (!t.live) continue;
    if (t.surface === "floor") floor += 1;
    else if (t.surface === "wall") wall += 1;
    else ceiling += 1;
    if (TRAPS[t.def].trigger === "manual" && (t.state === "fired" || t.state === "cooldown")) manualFired += 1;
  }
  let catsLive = 0;
  for (const c of view.cats) if (c.live) catsLive += 1;
  return {
    moved: extra.moved,
    selected: extra.selected,
    floor,
    wall,
    ceiling,
    manualFired,
    score: view.score,
    comboBest: view.comboBest,
    catsLive,
    paused: extra.paused,
  };
}

export type TutorialStepId =
  | "welcome"
  | "move"
  | "select"
  | "floor"
  | "wall"
  | "ceiling"
  | "catch"
  | "combo"
  | "manual"
  | "remove"
  | "pause"
  | "done";

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  /** Texto con los controles del dispositivo que se está usando. */
  body: Record<InputKind, string>;
  /** Consejo corto de por qué importa esto en una partida real. */
  why: string;
  /** Pasos informativos: se avanzan con el botón «Continuar». */
  manual?: boolean;
  /** El tutorial suelta gatos de práctica mientras dura el paso. */
  spawnCats?: boolean;
  /** Trampa que conviene tener seleccionada al empezar el paso. */
  suggest?: TrapId;
  check: (now: TutorialSnapshot, start: TutorialSnapshot) => boolean;
}

/** Distancia que hay que caminar para dar por aprendido el movimiento. */
export const TUTORIAL_MOVE_DISTANCE = 2.4;

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: "welcome",
    title: "Bienvenido al taller",
    body: {
      keyboard: "Eres Ratón Kagero. Los gatos zombi quieren tu quesera y tú la defiendes con trampas caseras. Aquí no hay reloj ni daño: practica sin miedo.",
      touch: "Eres Ratón Kagero. Los gatos zombi quieren tu quesera y tú la defiendes con trampas caseras. Aquí no hay reloj ni daño: practica sin miedo.",
      pad: "Eres Ratón Kagero. Los gatos zombi quieren tu quesera y tú la defiendes con trampas caseras. Aquí no hay reloj ni daño: practica sin miedo.",
    },
    why: "Pulsa «Continuar» para empezar. Puedes saltar cualquier paso.",
    manual: true,
    check: () => false,
  },
  {
    id: "move",
    title: "Muévete por la sala",
    body: {
      keyboard: "Camina con W A S D o las flechas. Mantén Shift para correr.",
      touch: "Arrastra el joystick de la izquierda para caminar. Llévalo al borde para correr.",
      pad: "Mueve al inventor con el stick izquierdo. A fondo, corre.",
    },
    why: "Las trampas golpeadas cerca del inventor dan CHEESE BONUS.",
    check: (now, start) => now.moved - start.moved >= TUTORIAL_MOVE_DISTANCE,
  },
  {
    id: "select",
    title: "Elige una trampa",
    body: {
      keyboard: "En la barra de trampas, haz clic en «Pegamento felino». También puedes rotar con E y Q.",
      touch: "En la barra de abajo, toca la tarjeta «Pegamento felino». Desliza la barra para ver más.",
      pad: "Pulsa X para rotar por las trampas hasta el «Pegamento felino».",
    },
    why: "El pegamento deja al gato quieto: el blanco perfecto para un golpe desde arriba.",
    check: (now) => now.selected === "glue_patch",
  },
  {
    id: "floor",
    title: "Coloca una trampa de suelo",
    body: {
      keyboard: "Pasa el ratón por el suelo: el fantasma se pone verde si la casilla vale. Haz clic para colocar.",
      touch: "Toca una casilla del suelo para apuntar y vuelve a tocarla para confirmar.",
      pad: "Mueve el cursor con la cruceta o el stick derecho y pulsa A para colocar.",
    },
    why: "Rojo significa mueble, quesera o casilla ocupada: el motivo aparece en el aviso.",
    check: (now, start) => now.floor > start.floor,
  },
  {
    id: "wall",
    title: "Ahora en la pared",
    body: {
      keyboard: "Pulsa 2 o la pestaña «Pared», elige una trampa y apunta a una de las tres paredes.",
      touch: "Toca la pestaña «Pared», elige una trampa y toca dos veces una pared.",
      pad: "Pulsa RB hasta «Pared». LT cambia de pared; A coloca.",
    },
    why: "Las trampas de pared barren un carril entero: mira la flecha de empuje.",
    check: (now, start) => now.wall > start.wall,
  },
  {
    id: "ceiling",
    title: "Y desde el techo",
    body: {
      keyboard: "Pulsa 3 o la pestaña «Techo» y coloca un Yunque. La marca en el suelo indica dónde caerá.",
      touch: "Toca la pestaña «Techo», elige el Yunque y toca dos veces la casilla donde caerá.",
      pad: "Pulsa RB hasta «Techo», elige el Yunque con X y colócalo con A.",
    },
    why: "Las trampas de techo caen en área: rematan gatos pegados o aturdidos.",
    check: (now, start) => now.ceiling > start.ceiling,
  },
  {
    id: "catch",
    title: "¡Llega un gato!",
    body: {
      keyboard: "Un gato de práctica entra por la puerta. Deja que pise tus trampas.",
      touch: "Un gato de práctica entra por la puerta. Deja que pise tus trampas.",
      pad: "Un gato de práctica entra por la puerta. Deja que pise tus trampas.",
    },
    why: "Si no pasa por tus trampas, coloca otra en su camino hacia la quesera.",
    spawnCats: true,
    check: (now, start) => now.score > start.score,
  },
  {
    id: "combo",
    title: "Encadena un combo",
    body: {
      keyboard: "Golpea al mismo gato con dos trampas distintas en menos de 2,5 s. Prueba Cáscara y luego Pegamento en su ruta.",
      touch: "Golpea al mismo gato con dos trampas distintas en menos de 2,5 s. Prueba Cáscara y luego Pegamento en su ruta.",
      pad: "Golpea al mismo gato con dos trampas distintas en menos de 2,5 s. Prueba Cáscara y luego Pegamento en su ruta.",
    },
    why: "El combo sube x2, x3 y x5. Repetir la misma trampa no suma variedad.",
    spawnCats: true,
    suggest: "banana_peel",
    check: (now) => now.comboBest >= 2,
  },
  {
    id: "manual",
    title: "Dispara una trampa manual",
    body: {
      keyboard: "Coloca un «Cañón de corchos» en una pared y pulsa Espacio para dispararlo.",
      touch: "Coloca un «Cañón de corchos» en una pared y pulsa el botón rosa de disparar.",
      pad: "Coloca un «Cañón de corchos» en una pared y pulsa Y para dispararlo.",
    },
    why: "Las manuales esperan tu orden: dispáralas cuando el gato pase por su carril.",
    suggest: "cork_cannon",
    check: (now, start) => now.manualFired > start.manualFired || now.manualFired > 0,
  },
  {
    id: "remove",
    title: "Retira una trampa",
    body: {
      keyboard: "Apunta a una trampa colocada y pulsa X, o usa el botón «Retirar».",
      touch: "Toca una trampa colocada para apuntarla y pulsa la papelera.",
      pad: "Pon el cursor sobre una trampa y pulsa B.",
    },
    why: "En la preparación de una partida recuperas el 85 % del queso.",
    check: (now, start) => now.floor + now.wall + now.ceiling < start.floor + start.wall + start.ceiling,
  },
  {
    id: "pause",
    title: "Pausa cuando quieras",
    body: {
      keyboard: "Pulsa P o Esc para abrir la pausa.",
      touch: "Toca el botón de pausa arriba a la derecha.",
      pad: "Pulsa Start para abrir la pausa.",
    },
    why: "En la pausa ajustas sonido, calidad gráfica, sacudida y efectos VHS.",
    check: (now) => now.paused,
  },
  {
    id: "done",
    title: "¡Listo para defender!",
    body: {
      keyboard: "Ya sabes moverte, colocar en suelo, pared y techo, encadenar combos, disparar y retirar.",
      touch: "Ya sabes moverte, colocar en suelo, pared y techo, encadenar combos, disparar y retirar.",
      pad: "Ya sabes moverte, colocar en suelo, pared y techo, encadenar combos, disparar y retirar.",
    },
    why: "Empieza por el Salón; cuando domines las rutas, prueba la Bodega.",
    manual: true,
    check: () => false,
  },
];

export const TUTORIAL_LAST = TUTORIAL_STEPS.length - 1;

export function tutorialStep(index: number): TutorialStep {
  return TUTORIAL_STEPS[Math.max(0, Math.min(TUTORIAL_LAST, index))];
}

/** ¿Se puede avanzar desde este paso con la instantánea actual? */
export function stepComplete(index: number, now: TutorialSnapshot, start: TutorialSnapshot): boolean {
  const step = tutorialStep(index);
  if (step.manual) return false;
  return step.check(now, start);
}
