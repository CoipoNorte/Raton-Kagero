import { GRID_H, GRID_W } from "./constants";

/*
 * Catálogo de salas.
 *
 * Todas comparten la rejilla 11x9 (la aritmética de índices y el encoding de
 * `Target` dependen de ella), pero cambian en lo que define realmente una
 * sala: dónde están los muebles, por dónde entran los gatos, qué se defiende
 * y con qué paleta se ve. Eso basta para que cada mapa se juegue distinto.
 *
 * Cada diseño está verificado por pruebas: sin celdas aisladas, entradas en
 * el borde con rutas equilibradas y guarida accesible.
 */

export type MapId = "salon" | "cocina" | "desvan" | "bodega";
export type FurnitureKind = "shelf" | "crate" | "fire";
export type EntryKind = "door" | "window" | "vent";

export interface MapFurniture {
  gx: number;
  gz: number;
  kind: FurnitureKind;
}

export interface MapEntry {
  id: string;
  label: string;
  gx: number;
  gz: number;
  kind: EntryKind;
}

/** Paleta de la sala: define el carácter visual sin tocar la geometría. */
export interface MapTheme {
  /** Tinte del papel pintado de la pared del fondo. */
  wallBack: string;
  /** Tinte de las paredes laterales (algo más oscuro da profundidad). */
  wallSide: string;
  /** Tinte de la tarima. */
  floor: string;
  /** Color de la niebla y del vacío alrededor de la sala. */
  fog: string;
  /** Luz ambiental cálida o fría según el ambiente. */
  ambient: string;
  /** Luz de acento que marca el punto focal. */
  accent: string;
}

export interface GameMap {
  id: MapId;
  name: string;
  blurb: string;
  /** Pista táctica que se muestra antes de empezar. */
  hint: string;
  /** 1 = introductoria, 3 = exigente. Sólo informativa. */
  difficulty: 1 | 2 | 3;
  lair: { gx: number; gz: number };
  furniture: readonly MapFurniture[];
  entries: readonly MapEntry[];
  /** Celdas con alfombra: señalan la zona a defender. */
  rugs: readonly (readonly [number, number])[];
  theme: MapTheme;
}

/** Anillo de alfombra alrededor de una celda, recortado a la rejilla. */
function ringAround(gx: number, gz: number): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dz === 0) continue;
      const x = gx + dx;
      const z = gz + dz;
      if (x < 0 || z < 0 || x >= GRID_W || z >= GRID_H) continue;
      out.push([x, z] as const);
    }
  }
  return out;
}

const SALON: GameMap = {
  id: "salon",
  name: "Salón de la mansión",
  blurb: "La sala clásica: tres entradas equidistantes y la quesera en el centro.",
  hint: "Las tres rutas miden lo mismo: reparte trampas en vez de concentrarlas.",
  difficulty: 1,
  lair: { gx: 5, gz: 4 },
  furniture: [
    // Barrera norte: obliga a rodear hacia los pasillos laterales.
    { gx: 4, gz: 1, kind: "crate" },
    { gx: 5, gz: 1, kind: "crate" },
    // Costado oeste.
    { gx: 2, gz: 3, kind: "shelf" },
    { gx: 2, gz: 4, kind: "shelf" },
    // Costado este, con la chimenea como referencia visual.
    { gx: 8, gz: 2, kind: "shelf" },
    { gx: 8, gz: 4, kind: "fire" },
    { gx: 8, gz: 5, kind: "shelf" },
    // Barrera sur: embudo frente a la puerta.
    { gx: 4, gz: 6, kind: "crate" },
    { gx: 5, gz: 6, kind: "crate" },
    // Esquinas, para romper la simetría.
    { gx: 2, gz: 8, kind: "crate" },
    { gx: 7, gz: 8, kind: "shelf" },
  ],
  entries: [
    { id: "door", label: "Puerta de la cocina", gx: 10, gz: 6, kind: "door" },
    { id: "window", label: "Ventana del pasillo", gx: 2, gz: 0, kind: "window" },
    { id: "vent", label: "Conducto de ventilación", gx: 0, gz: 2, kind: "vent" },
  ],
  rugs: ringAround(5, 4),
  theme: {
    wallBack: "#cdd8c6",
    wallSide: "#c5d1be",
    floor: "#e6d6c2",
    fog: "#0d2019",
    ambient: "#8fd8b4",
    accent: "#ffcf3f",
  },
};

const COCINA: GameMap = {
  id: "cocina",
  name: "Cocina de azulejos",
  blurb: "Encimeras largas y pasillos estrechos. La quesera está arrinconada.",
  hint: "La puerta queda lejos: aprovecha los pasillos para encadenar sin prisa.",
  difficulty: 2,
  lair: { gx: 2, gz: 7 },
  furniture: [
    // Encimera norte.
    { gx: 1, gz: 1, kind: "crate" },
    { gx: 2, gz: 1, kind: "shelf" },
    { gx: 3, gz: 1, kind: "crate" },
    // Isla central vertical: parte la sala en dos pasillos.
    { gx: 5, gz: 0, kind: "shelf" },
    { gx: 5, gz: 1, kind: "crate" },
    { gx: 5, gz: 2, kind: "crate" },
    { gx: 5, gz: 3, kind: "shelf" },
    // Fogones al este.
    { gx: 7, gz: 3, kind: "fire" },
    { gx: 8, gz: 3, kind: "shelf" },
    { gx: 9, gz: 3, kind: "crate" },
    // Despensa sureste.
    { gx: 7, gz: 6, kind: "shelf" },
    { gx: 8, gz: 6, kind: "crate" },
    // Alacena oeste.
    { gx: 0, gz: 5, kind: "shelf" },
    { gx: 1, gz: 5, kind: "crate" },
    // Muro que protege la despensa de la quesera.
    { gx: 4, gz: 8, kind: "crate" },
  ],
  entries: [
    { id: "door", label: "Puerta del office", gx: 10, gz: 1, kind: "door" },
    { id: "window", label: "Ventanuco del patio", gx: 0, gz: 0, kind: "window" },
    { id: "vent", label: "Campana extractora", gx: 10, gz: 8, kind: "vent" },
  ],
  rugs: ringAround(2, 7),
  theme: {
    wallBack: "#dde7ea",
    wallSide: "#cfdade",
    floor: "#eaeef0",
    fog: "#101f24",
    ambient: "#a8d8e8",
    accent: "#57e8d5",
  },
};

const DESVAN: GameMap = {
  id: "desvan",
  name: "Desván polvoriento",
  blurb: "Centro despejado y trastos amontonados en las esquinas.",
  hint: "Campo abierto: las trampas de pared barren carriles enteros.",
  difficulty: 2,
  lair: { gx: 5, gz: 4 },
  furniture: [
    // Trastos en las cuatro esquinas.
    { gx: 1, gz: 1, kind: "crate" },
    { gx: 2, gz: 1, kind: "crate" },
    { gx: 1, gz: 2, kind: "shelf" },
    { gx: 9, gz: 1, kind: "crate" },
    { gx: 8, gz: 1, kind: "shelf" },
    { gx: 9, gz: 2, kind: "crate" },
    { gx: 1, gz: 7, kind: "shelf" },
    { gx: 2, gz: 7, kind: "crate" },
    { gx: 1, gz: 6, kind: "crate" },
    { gx: 9, gz: 7, kind: "crate" },
    { gx: 8, gz: 7, kind: "crate" },
    { gx: 9, gz: 6, kind: "shelf" },
    // Dos columnas que flanquean la guarida.
    { gx: 4, gz: 4, kind: "shelf" },
    { gx: 6, gz: 4, kind: "shelf" },
    // Baúl al sur.
    { gx: 5, gz: 8, kind: "crate" },
  ],
  entries: [
    { id: "vent", label: "Gatera del tejado", gx: 5, gz: 0, kind: "vent" },
    { id: "window", label: "Claraboya oeste", gx: 0, gz: 4, kind: "window" },
    { id: "door", label: "Trampilla este", gx: 10, gz: 4, kind: "door" },
  ],
  rugs: ringAround(5, 4),
  theme: {
    wallBack: "#d8c9a8",
    wallSide: "#c9b893",
    floor: "#d6c09a",
    fog: "#231a10",
    ambient: "#e8c88f",
    accent: "#ff9d3c",
  },
};

const BODEGA: GameMap = {
  id: "bodega",
  name: "Bodega de columnas",
  blurb: "Un bosque de barricas. La quesera espera al fondo del todo.",
  hint: "Rutas largas entre columnas: encadena trampas de techo en los pasillos.",
  difficulty: 3,
  lair: { gx: 9, gz: 4 },
  furniture: [
    // Cuatro hileras de columnas que forman pasillos verticales.
    { gx: 2, gz: 1, kind: "crate" },
    { gx: 2, gz: 3, kind: "shelf" },
    { gx: 2, gz: 5, kind: "shelf" },
    { gx: 2, gz: 7, kind: "crate" },
    { gx: 4, gz: 0, kind: "shelf" },
    { gx: 4, gz: 2, kind: "crate" },
    { gx: 4, gz: 4, kind: "fire" },
    { gx: 4, gz: 6, kind: "crate" },
    { gx: 4, gz: 8, kind: "shelf" },
    { gx: 6, gz: 1, kind: "crate" },
    { gx: 6, gz: 3, kind: "shelf" },
    { gx: 6, gz: 5, kind: "shelf" },
    { gx: 6, gz: 7, kind: "crate" },
    { gx: 7, gz: 0, kind: "crate" },
    { gx: 7, gz: 8, kind: "crate" },
  ],
  entries: [
    { id: "door", label: "Escalera de piedra", gx: 0, gz: 4, kind: "door" },
    { id: "window", label: "Tragaluz norte", gx: 0, gz: 0, kind: "window" },
    { id: "vent", label: "Desagüe sur", gx: 0, gz: 8, kind: "vent" },
  ],
  rugs: ringAround(9, 4),
  theme: {
    wallBack: "#9aa6ad",
    wallSide: "#8b979e",
    floor: "#7d6a55",
    fog: "#0b1418",
    ambient: "#7fa8c4",
    accent: "#c6f96a",
  },
};

export const MAPS: Record<MapId, GameMap> = {
  salon: SALON,
  cocina: COCINA,
  desvan: DESVAN,
  bodega: BODEGA,
};

export const MAP_LIST: readonly GameMap[] = [SALON, COCINA, DESVAN, BODEGA];

export const DEFAULT_MAP_ID: MapId = "salon";

export function getMap(id: MapId | null | undefined): GameMap {
  return (id && MAPS[id]) || MAPS[DEFAULT_MAP_ID];
}

/** Celdas sólidas del mapa, en el formato que espera la lógica de rejilla. */
export function mapBlockedCells(map: GameMap): ReadonlyArray<readonly [number, number]> {
  return map.furniture.map((f) => [f.gx, f.gz] as const);
}
