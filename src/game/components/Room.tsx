import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  CELL,
  FLOOR_MARGIN,
  FLOOR_TILE,
  GRID_H,
  GRID_W,
  ROOM_D,
  ROOM_W,
  WALL_HEIGHT,
  WALL_TILE,
} from "../constants";
import { DEFAULT_MAP_ID, getMap, type GameMap } from "../maps";
import { cellToWorldX, cellToWorldZ } from "../logic";
import { cheeseTexture, floorTexture, gridTexture, tiled, wallpaperTexture } from "../textures";
import type { World } from "../simulation";

/** Vigas del techo repartidas a lo ancho, para que la sala no quede vacía arriba. */
const BEAM_COUNT = 4;
const BEAM_OFFSETS: number[] = Array.from(
  { length: BEAM_COUNT },
  (_, i) => (ROOM_W / BEAM_COUNT) * (i - (BEAM_COUNT - 1) / 2),
);

/* Habitación low-poly construida sólo con primitivas. Las zonas transparentes
   son los planos de raycast (suelo y paredes); el resto es decoración. */

interface RoomProps {
  world: World | null;
  /** Sala a dibujar. Si falta, se usa la del mundo o la clásica. */
  map?: GameMap;
  showGrid: boolean;
  interactive: boolean;
  onPoint: (point: THREE.Vector3, kind: "floor" | "back" | "left" | "right") => void;
  onPick: (point: THREE.Vector3, kind: "floor" | "back" | "left" | "right", coarse: boolean) => void;
}

export function Room({ world, map, showGrid, interactive, onPoint, onPick }: RoomProps) {
  // El mapa del mundo manda; el prop permite previsualizar salas sin partida.
  const room = map ?? world?.map ?? getMap(DEFAULT_MAP_ID);
  const theme = room.theme;
  // Cada pared recibe su propia repetición: antes compartían una sola
  // textura con repeat fijo, así que el papel salía estirado al doble y con
  // distinta escala entre el fondo y los laterales.
  const backWallWidth = ROOM_W + CELL * 2.4;
  const sideWallWidth = ROOM_D + CELL * 2.4;
  const wallBack = useMemo(
    () => new THREE.MeshLambertMaterial({ map: tiled(wallpaperTexture(), backWallWidth, WALL_HEIGHT, WALL_TILE), color: theme.wallBack }),
    [backWallWidth, theme.wallBack],
  );
  const wallSide = useMemo(
    () => new THREE.MeshLambertMaterial({ map: tiled(wallpaperTexture(), sideWallWidth, WALL_HEIGHT, WALL_TILE), color: theme.wallSide }),
    [sideWallWidth, theme.wallSide],
  );
  const floorWidth = ROOM_W + FLOOR_MARGIN * 2;
  const floorDepth = ROOM_D + FLOOR_MARGIN * 2;
  const floor = useMemo(
    () => new THREE.MeshLambertMaterial({ map: tiled(floorTexture(), floorWidth, floorDepth, FLOOR_TILE), color: theme.floor }),
    [floorWidth, floorDepth, theme.floor],
  );
  const grid = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: gridTexture(),
        transparent: true,
        opacity: showGrid ? 0.55 : 0.14,
        depthWrite: false,
      }),
    [showGrid],
  );
  const cheese = useMemo(() => new THREE.MeshLambertMaterial({ map: cheeseTexture(), color: "#ffffff" }), []);
  const dark = useMemo(() => new THREE.MeshLambertMaterial({ color: "#050b09" }), []);
  const wood = useMemo(() => new THREE.MeshLambertMaterial({ color: "#7a4f24" }), []);
  const woodDark = useMemo(() => new THREE.MeshLambertMaterial({ color: "#4d3016" }), []);
  const brass = useMemo(() => new THREE.MeshLambertMaterial({ color: "#d8a24a", emissive: "#3a2606" }), []);
  const moon = useMemo(() => new THREE.MeshBasicMaterial({ color: "#9fd8ff" }), []);

  const pick = (kind: "floor" | "back" | "left" | "right") => ({
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (!interactive) return;
      e.stopPropagation();
      onPoint(e.point, kind);
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!interactive) return;
      e.stopPropagation();
      onPick(e.point, kind, e.pointerType !== "mouse");
    },
  });

  return (
    <group>
      {/* Suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[floorWidth, floorDepth]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={grid}>
        <planeGeometry args={[GRID_W * CELL, GRID_H * CELL]} />
      </mesh>

      {/* Plano de raycast de suelo (invisible) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} {...pick("floor")}>
        <planeGeometry args={[GRID_W * CELL, GRID_H * CELL]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Paredes */}
      <mesh position={[0, WALL_HEIGHT / 2, -ROOM_D / 2 - CELL * 1.02]} material={wallBack}>
        <planeGeometry args={[backWallWidth, WALL_HEIGHT]} />
      </mesh>
      <mesh position={[-ROOM_W / 2 - CELL * 1.02, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallSide}>
        <planeGeometry args={[sideWallWidth, WALL_HEIGHT]} />
      </mesh>
      <mesh position={[ROOM_W / 2 + CELL * 1.02, WALL_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallSide}>
        <planeGeometry args={[sideWallWidth, WALL_HEIGHT]} />
      </mesh>

      {/* Planos de raycast de paredes */}
      <mesh position={[0, WALL_HEIGHT / 2, -ROOM_D / 2 - CELL * 0.92]} {...pick("back")}>
        <planeGeometry args={[ROOM_W + CELL * 2, WALL_HEIGHT]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-ROOM_W / 2 - CELL * 0.92, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} {...pick("left")}>
        <planeGeometry args={[ROOM_D + CELL * 2, WALL_HEIGHT]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[ROOM_W / 2 + CELL * 0.92, WALL_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} {...pick("right")}>
        <planeGeometry args={[ROOM_D + CELL * 2, WALL_HEIGHT]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Zócalo y vigas del techo (dan contexto a las trampas colgantes) */}
      <mesh position={[0, 0.16, -ROOM_D / 2 - CELL * 0.98]} material={woodDark}>
        <boxGeometry args={[backWallWidth, 0.32, 0.12]} />
      </mesh>
      {BEAM_OFFSETS.map((x) => (
        <mesh key={`beam-${x}`} position={[x, WALL_HEIGHT - 0.28, 0]} material={wood}>
          <boxGeometry args={[0.34, 0.34, floorDepth]} />
        </mesh>
      ))}

      {/* Muebles que bloquean casillas */}
      {room.furniture.map((f) => {
        const x = cellToWorldX(f.gx);
        const z = cellToWorldZ(f.gz);
        if (f.kind === "shelf") {
          return (
            <group key={`sh-${f.gx}-${f.gz}`} position={[x, 0, z]}>
              <mesh position={[0, 1.05, 0]} material={wood} castShadow>
                <boxGeometry args={[CELL * 0.94, 2.1, CELL * 0.7]} />
              </mesh>
              {[0.45, 0.95, 1.45].map((y, i) => (
                <mesh key={y} position={[0, y, 0.06]} material={i % 2 === 0 ? brass : woodDark}>
                  <boxGeometry args={[CELL * 0.8, 0.12, CELL * 0.56]} />
                </mesh>
              ))}
            </group>
          );
        }
        if (f.kind === "crate") {
          return (
            <group key={`cr-${f.gx}-${f.gz}`} position={[x, 0, z]}>
              <mesh position={[0, 0.32, 0]} material={wood} castShadow>
                <boxGeometry args={[CELL * 0.8, 0.64, CELL * 0.72]} />
              </mesh>
              <mesh position={[0.18, 0.78, -0.1]} rotation={[0, 0.5, 0]} material={woodDark}>
                <boxGeometry args={[CELL * 0.52, 0.36, CELL * 0.5]} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={`fi-${f.gx}-${f.gz}`} position={[x, 0, z]}>
            <mesh position={[0, 0.6, 0]} material={woodDark} castShadow>
              <boxGeometry args={[CELL * 0.95, 1.2, CELL * 0.8]} />
            </mesh>
            <mesh position={[0, 0.42, CELL * 0.36]} material={dark}>
              <boxGeometry args={[CELL * 0.6, 0.55, 0.1]} />
            </mesh>
            <mesh position={[0, 1.35, 0]} material={brass}>
              <boxGeometry args={[CELL * 1.05, 0.14, CELL * 0.9]} />
            </mesh>
          </group>
        );
      })}

      {/* Alfombra de la guarida */}
      {room.rugs.map(([gx, gz]) => (
        <mesh key={`rug-${gx}-${gz}`} rotation={[-Math.PI / 2, 0, 0]} position={[cellToWorldX(gx), 0.022, cellToWorldZ(gz)]} material={cheese}>
          <planeGeometry args={[CELL * 0.94, CELL * 0.94]} />
        </mesh>
      ))}

      {/* Quesera / guarida */}
      <Lair world={world} map={room} />

      {/* Entradas: puerta, ventana, conducto */}
      {room.entries.map((entry) => {
        const x = cellToWorldX(entry.gx);
        const z = cellToWorldZ(entry.gz);
        if (entry.kind === "door") {
          return (
            <group key={entry.id} position={[ROOM_W / 2 + CELL * 0.96, 0, z]}>
              <mesh position={[0, 0.95, 0]} material={wood}>
                <boxGeometry args={[0.16, 1.9, CELL * 0.92]} />
              </mesh>
              <mesh position={[-0.1, 0.9, 0]} rotation={[0, -Math.PI / 2, 0]} material={dark}>
                <planeGeometry args={[CELL * 0.62, 1.7]} />
              </mesh>
              <mesh position={[-0.14, 1.15, 0.24]} material={brass}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
              </mesh>
            </group>
          );
        }
        if (entry.kind === "window") {
          return (
            <group key={entry.id} position={[x, 1.5, -ROOM_D / 2 - CELL * 0.96]}>
              <mesh material={wood}>
                <boxGeometry args={[CELL * 1.05, 1.35, 0.14]} />
              </mesh>
              <mesh position={[0, 0, 0.1]} material={moon}>
                <planeGeometry args={[CELL * 0.78, 1.0]} />
              </mesh>
              <mesh position={[0, 0, 0.12]} material={wood}>
                <boxGeometry args={[0.08, 1.0, 0.05]} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={entry.id} position={[-ROOM_W / 2 - CELL * 0.96, 1.05, z]}>
            <mesh material={brass}>
              <boxGeometry args={[0.14, 0.8, CELL * 0.9]} />
            </mesh>
            {[-0.24, 0, 0.24].map((dz) => (
              <mesh key={dz} position={[0.09, 0, dz]} material={dark}>
                <boxGeometry args={[0.05, 0.6, 0.08]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Lair({ world, map }: { world: World | null; map: GameMap }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const wood = useMemo(() => new THREE.MeshLambertMaterial({ color: "#7a4f24" }), []);
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: "#a8e63c", transparent: true, opacity: 0.5 }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffcf3f", transparent: true, opacity: 0.22 }), []);
  const x = cellToWorldX(map.lair.gx);
  const z = cellToWorldZ(map.lair.gz);

  useFrame(() => {
    const ratio = world ? Math.max(0, world.lair.hp) / world.lair.max : 1;
    const flash = world ? world.lair.flash : 0;
    const mesh = ringRef.current;
    if (mesh) {
      mesh.scale.setScalar(1 + (1 - ratio) * 0.22 + flash * 0.25);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(ratio > 0.6 ? "#a8e63c" : ratio > 0.3 ? "#ffcf3f" : "#ff4fa3");
      mat.opacity = 0.26 + (1 - ratio) * 0.45 + flash * 0.35;
    }
    const g = glowRef.current;
    if (g) {
      const pulse = 0.18 + Math.sin((world ? world.lair.pulse : 0) * 2.4) * 0.05 + flash * 0.4;
      (g.material as THREE.MeshBasicMaterial).opacity = Math.min(0.75, pulse);
      g.rotation.y += 0.004;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.36, 0]} material={wood} castShadow>
        <boxGeometry args={[CELL * 1.15, 0.72, CELL * 1.15]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} rotation={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.42, 7, 1]} />
        <meshLambertMaterial map={cheeseTexture()} color="#ffffff" />
      </mesh>
      <mesh position={[0.3, 1.3, -0.2]} rotation={[0.3, 0.9, 0.2]}>
        <coneGeometry args={[0.16, 0.4, 5]} />
        <meshLambertMaterial map={cheeseTexture()} color="#fff0b8" />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={ring}>
        <ringGeometry args={[0.85, 1.05, 12]} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.75, 0]} material={glow}>
        <sphereGeometry args={[1.15, 8, 6]} />
      </mesh>
    </group>
  );
}


