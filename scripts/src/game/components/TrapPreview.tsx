import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL, GRID_H, GRID_W, ROOM_D, ROOM_W, WALL_HEIGHT } from "../constants";
import { cellToWorldX, cellToWorldZ, wallAnchor, type Target } from "../logic";
import type { TrapDef, WallSide } from "../types";

/* Fantasma de colocación: verde si la casilla es válida, rojo si está bloqueada.
   Muestra la casilla proyectada, el radio de efecto y el vector de empuje. */
export function TrapPreview({
  hover,
  ok,
  pending,
  def,
  padActive = false,
}: {
  hover: Target | null;
  ok: boolean;
  pending: boolean;
  def: TrapDef | null;
  padActive?: boolean;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const bob = useRef<THREE.Group>(null);

  const ghostMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#c6f96a", wireframe: true, transparent: true, opacity: 0.9 }),
    [],
  );
  const padMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#c6f96a", transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), []);
  const laneMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#57e8d5", transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }), []);
  const dropMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#c6f96a", transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (bob.current) bob.current.position.y = 0.02 + Math.sin(t * 5) * 0.02;
    if (pulse.current) pulse.current.scale.setScalar(1 + Math.sin(t * 7) * (pending ? 0.14 : 0.05));
  });

  if (!hover || !def) return null;

  const color = ok ? "#c6f96a" : "#ff4fa3";
  padMat.color.set(color);
  ghostMat.color.set(color);
  dropMat.color.set(ok ? "#c6f96a" : "#ff9ec2");

  const isWall = hover.surface === "wall" && def.surface === "wall";
  const side = (hover.side ?? "back") as WallSide;
  const anchor = isWall ? wallAnchor(side, hover.index) : null;
  const gx = isWall ? (side === "back" ? hover.index : side === "left" ? 0 : GRID_W - 1) : hover.index % GRID_W;
  const gz = isWall ? (side === "back" ? 0 : hover.index) : Math.floor(hover.index / GRID_W);
  const px = cellToWorldX(gx);
  const pz = cellToWorldZ(gz);
  const ax = anchor ? anchor.x : px;
  const az = anchor ? anchor.z : pz;
  const ghostY = def.surface === "ceiling" ? WALL_HEIGHT - 0.5 : def.surface === "wall" ? 1.3 : 0.2;
  const push = isWall
    ? side === "back"
      ? { x: 0, z: 1 }
      : side === "left"
        ? { x: 1, z: 0 }
        : { x: -1, z: 0 }
    : { x: 0, z: 0 };

  const laneLen = side === "back" ? ROOM_D : ROOM_W;
  const laneWidth = side === "back" ? CELL * 0.95 : CELL * 0.95;

  return (
    <group>
      {/* Casilla proyectada en el suelo (siempre, para saber a qué casilla apuntas) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.035, pz]} material={padMat}>
        <planeGeometry args={[CELL * 0.96, CELL * 0.96]} />
      </mesh>
      <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.045, pz]}>
        <ringGeometry args={[CELL * 0.58, CELL * 0.68, 14]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Radio de efecto (trampas de suelo y techo) */}
      {def.surface !== "wall" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.05, pz]}>
          <ringGeometry args={[Math.max(0.4, def.radius) * CELL, Math.max(0.4, def.radius) * CELL + 0.09, 18]} />
          <meshBasicMaterial color={color} transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}

      {/* Carril completo para trampas de pared */}
      {isWall ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            side === "back" ? px : px + push.x * laneLen * 0.5,
            0.045,
            side === "back" ? pz + push.z * laneLen * 0.5 : pz,
          ]}
          material={laneMat}
        >
          <planeGeometry args={[side === "back" ? laneWidth : laneLen, side === "back" ? laneLen : laneWidth]} />
        </mesh>
      ) : null}

      {/* Modelo fantasma */}
      <group ref={bob} position={[ax, ghostY, az]}>
        <mesh material={ghostMat}>
          <boxGeometry args={[0.54, 0.44, 0.54]} />
        </mesh>

        {/* Retícula de cruceta del cursor de mando */}
        {padActive ? (
          <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -ghostY + 0.07, 0]}>
              <ringGeometry args={[0.42, 0.5, 4]} />
              <meshBasicMaterial color="#57e8d5" transparent opacity={0.95} depthTest={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.34, 0]}>
              <coneGeometry args={[0.11, 0.28, 4]} />
              <meshBasicMaterial color="#57e8d5" transparent opacity={0.95} depthTest={false} />
            </mesh>
          </group>
        ) : null}

        {/* Techo: marca la caída y el cono de impacto */}
        {def.surface === "ceiling" ? (
          <>
            <mesh position={[0, -(ghostY - 0.24) / 2, 0]} material={dropMat}>
              <boxGeometry args={[0.09, ghostY - 0.4, 0.09]} />
            </mesh>
            <mesh position={[0, -ghostY + 0.34, 0]} rotation={[Math.PI, 0, 0]} material={dropMat}>
              <coneGeometry args={[Math.max(0.4, def.radius) * CELL, 0.36, 5]} />
            </mesh>
          </>
        ) : null}

        {/* Pared: flecha con la dirección de empuje */}
        {isWall ? (
          <mesh
            position={[push.x * 0.95, 0, push.z * 0.95]}
            rotation={[Math.PI / 2, 0, side === "back" ? -Math.PI / 2 : 0]}
            material={dropMat}
          >
            <coneGeometry args={[0.2, 0.5, 4]} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

export const PREVIEW_GRID = { GRID_W, GRID_H };
