import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAPS } from "../traps";
import { CELL, WALL_HEIGHT } from "../constants";
import type { TrapId } from "../types";
import type { World } from "../simulation";

const Q = 1 / 46;
const q = (v: number) => Math.round(v / Q) * Q;

interface Mats {
  metal: THREE.MeshLambertMaterial;
  iron: THREE.MeshLambertMaterial;
  wood: THREE.MeshLambertMaterial;
  woodDark: THREE.MeshLambertMaterial;
  rubber: THREE.MeshLambertMaterial;
  cheese: THREE.MeshLambertMaterial;
  toxic: THREE.MeshLambertMaterial;
  glass: THREE.MeshPhysicalMaterial;
  fabric: THREE.MeshLambertMaterial;
  paper: THREE.MeshLambertMaterial;
  dirt: THREE.MeshLambertMaterial;
}

export function TrapEntity({ world, index, helpers }: { world: World | null; index: number; helpers: boolean }) {
  const group = useRef<THREE.Group>(null);
  const shape = useRef<THREE.Group>(null);
  const partA = useRef<THREE.Group>(null);
  const partB = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Mesh>(null);
  const [defId, setDefId] = useState<TrapId | null>(null);

  const mats = useMemo<Mats>(
    () => ({
      metal: new THREE.MeshLambertMaterial({ color: "#c3d0da", flatShading: true }),
      iron: new THREE.MeshLambertMaterial({ color: "#7f8c99", flatShading: true }),
      wood: new THREE.MeshLambertMaterial({ color: "#a9773f", flatShading: true }),
      woodDark: new THREE.MeshLambertMaterial({ color: "#5c3a15", flatShading: true }),
      rubber: new THREE.MeshLambertMaterial({ color: "#2a3140", flatShading: true }),
      cheese: new THREE.MeshLambertMaterial({ color: "#ffcf3f", flatShading: true }),
      toxic: new THREE.MeshLambertMaterial({ color: "#a8e63c", flatShading: true }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#dff0ff", roughness: 0.25, transmission: 0, transparent: true, opacity: 0.8, flatShading: true }),
      fabric: new THREE.MeshLambertMaterial({ color: "#ff5c4d", flatShading: true }),
      paper: new THREE.MeshLambertMaterial({ color: "#ffe07a", flatShading: true }),
      dirt: new THREE.MeshLambertMaterial({ color: "#4a3320", flatShading: true }),
    }),
    [],
  );

  useFrame(() => {
    const t = world?.traps[index];
    const g = group.current;
    if (!g) return;
    if (!t || !t.live) {
      g.visible = false;
      if (defId !== null) setDefId(null);
      return;
    }
    if (t.def !== defId) setDefId(t.def);
    g.visible = true;

    const def = TRAPS[t.def];
    const p = def.surface === "ceiling" && t.state === "fired" ? 1 : 0;
    g.position.set(q(t.x), q(p ? t.y : def.surface === "ceiling" ? WALL_HEIGHT - 0.35 : def.surface === "wall" ? 1.32 : 0.06), q(t.z));
    g.rotation.y = t.side === "back" ? -Math.PI / 2 : t.side === "left" ? 0 : t.side === "right" ? Math.PI : 0;

    const armed = t.state === "arming";
    const fired = t.state === "fired";
    const cool = t.state === "cooldown";
    const prog = armed ? Math.min(1, t.t / Math.max(0.05, def.armTime)) : 1;

    if (shape.current) {
      shape.current.scale.setScalar(armed ? 0.55 + prog * 0.45 : 1);
      shape.current.rotation.z = fired ? Math.sin(t.t * 34) * 0.08 : 0;
      if (def.surface !== "ceiling") {
        shape.current.position.y = t.state === "ready" ? Math.sin(t.anim * 3) * 0.02 : 0;
      }
    }
    if (partA.current) {
      if (def.shape === "glove") partA.current.position.x = fired ? 0.55 : cool ? 0.12 : 0.02;
      if (def.shape === "clamp") partA.current.rotation.z = fired || cool ? 0.05 : 0.55;
      if (def.shape === "box") partA.current.rotation.x = fired ? -1.5 : -0.15;
      if (def.shape === "shelf") partA.current.rotation.x = fired ? -1.35 : 0;
      if (def.shape === "ramp") partA.current.rotation.z = fired ? -0.42 : 0.3;
    }
    if (partB.current) {
      if (def.shape === "clamp") partB.current.rotation.z = fired || cool ? -0.05 : -0.55;
      if (def.shape === "coil") partB.current.position.y = fired ? 0.1 : 0.3;
      if (def.shape === "bucket") partB.current.rotation.x = fired ? -1.15 : -0.1;
      if (def.shape === "peel") partB.current.rotation.z = fired ? 0.9 : 0.35;
    }
    if (spin.current) {
      spin.current.rotation.x += def.shape === "fan" ? (fired ? 1.1 : 0.28) : 0.06;
    }
    if (ring.current) {
      const show = helpers || armed;
      ring.current.visible = show;
      if (show) {
        const r = Math.max(0.35, def.radius + 0.25) * CELL;
        ring.current.scale.setScalar(armed ? 0.3 + prog * 0.7 : 1);
        const mat = ring.current.material as THREE.MeshBasicMaterial;
        mat.color.set(armed ? "#ffcf3f" : t.state === "ready" ? "#c6f96a" : cool ? "#57e8d5" : "#ff4fa3");
        mat.opacity = armed ? 0.85 : 0.5;
        ring.current.position.y = def.surface === "ceiling" ? -(WALL_HEIGHT - 0.7) : -0.05;
        ring.current.userData.radius = r;
      }
    }
    if (arrow.current) {
      arrow.current.visible = helpers && def.lane;
      arrow.current.position.x = 0.6 + Math.sin(Date.now() / 220) * 0.12;
    }
  });

  if (defId === null) {
    return <group ref={group} visible={false} />;
  }

  const def = TRAPS[defId];

  return (
    <group ref={group} visible={false}>
      <group ref={shape}>
        <TrapShape shape={def.shape} mats={mats} partA={partA} partB={partB} spin={spin} />
      </group>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} visible={false}>
        <ringGeometry args={[0.72, 0.92, 16]} />
        <meshBasicMaterial color="#c6f96a" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={arrow} position={[0.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.14, 0.3, 4]} />
        <meshBasicMaterial color="#57e8d5" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function TrapShape({
  shape,
  mats,
  partA,
  partB,
  spin,
}: {
  shape: string;
  mats: Mats;
  partA: React.RefObject<THREE.Group | null>;
  partB: React.RefObject<THREE.Group | null>;
  spin: React.RefObject<THREE.Group | null>;
}) {
  switch (shape) {
    case "peel":
      return (
        <group>
          <mesh material={mats.paper}>
            <boxGeometry args={[0.3, 0.06, 0.3]} />
          </mesh>
          {[0, 2.1, 4.2].map((a, i) => (
            <group key={a} ref={i === 1 ? partB : undefined} rotation={[0, a, 0.35]}>
              <mesh position={[0.24, 0.06, 0]} rotation={[0, 0, 0.5]} material={mats.paper}>
                <boxGeometry args={[0.3, 0.05, 0.16]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "blob":
      return (
        <group>
          <mesh scale={[1, 0.35, 1]} material={mats.glass}>
            <sphereGeometry args={[0.4, 8, 6]} />
          </mesh>
          {[0.22, -0.18].map((x) => (
            <mesh key={x} position={[x, -0.06, 0.16]} scale={[1, 0.6, 1]} material={mats.glass}>
              <sphereGeometry args={[0.12, 6, 5]} />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 0]} material={mats.paper}>
            <boxGeometry args={[0.16, 0.05, 0.1]} />
          </mesh>
        </group>
      );
    case "clamp":
      return (
        <group>
          <mesh position={[0, -0.02, 0]} material={mats.metal}>
            <boxGeometry args={[0.5, 0.1, 0.42]} />
          </mesh>
          <group ref={partA} position={[0.12, 0.04, 0]}>
            <mesh position={[0.1, 0.06, 0]} material={mats.iron}>
              <boxGeometry args={[0.26, 0.1, 0.36]} />
            </mesh>
          </group>
          <group ref={partB} position={[-0.12, 0.04, 0]}>
            <mesh position={[-0.1, 0.06, 0]} material={mats.iron}>
              <boxGeometry args={[0.26, 0.1, 0.36]} />
            </mesh>
          </group>
          <mesh position={[0, 0.02, 0]} material={mats.cheese}>
            <cylinderGeometry args={[0.07, 0.07, 0.12, 6]} />
          </mesh>
        </group>
      );
    case "coil":
      return (
        <group>
          <mesh material={mats.woodDark}>
            <boxGeometry args={[0.44, 0.08, 0.44]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.08 + i * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.metal}>
              <torusGeometry args={[0.16, 0.035, 4, 8]} />
            </mesh>
          ))}
          <group ref={partB} position={[0, 0.3, 0]}>
            <mesh material={mats.fabric}>
              <boxGeometry args={[0.4, 0.08, 0.4]} />
            </mesh>
            <mesh position={[0, 0.08, 0]} material={mats.wood}>
              <boxGeometry args={[0.16, 0.1, 0.16]} />
            </mesh>
          </group>
        </group>
      );
    case "ramp":
      return (
        <group>
          <mesh material={mats.woodDark}>
            <boxGeometry args={[0.62, 0.08, 0.5]} />
          </mesh>
          <group ref={partA} rotation={[0, 0, 0.3]}>
            <mesh position={[0, 0.06, 0]} material={mats.wood}>
              <boxGeometry args={[0.62, 0.07, 0.46]} />
            </mesh>
            <mesh position={[0.26, 0.12, 0]} material={mats.toxic}>
              <boxGeometry args={[0.1, 0.06, 0.3]} />
            </mesh>
          </group>
        </group>
      );
    case "box":
      return (
        <group>
          <mesh material={mats.fabric}>
            <boxGeometry args={[0.42, 0.36, 0.42]} />
          </mesh>
          <group ref={partA} position={[0, 0.18, 0]} rotation={[0, 0, -0.15]}>
            <mesh position={[0, 0.03, 0]} material={mats.paper}>
              <boxGeometry args={[0.46, 0.06, 0.46]} />
            </mesh>
          </group>
          <mesh position={[0, 0.3, 0]} material={mats.cheese}>
            <coneGeometry args={[0.12, 0.3, 5]} />
          </mesh>
        </group>
      );
    case "rack":
      return (
        <group position={[0, 0, 0]}>
          <mesh material={mats.wood}>
            <boxGeometry args={[0.24, 0.5, 0.56]} />
          </mesh>
          {[-0.16, 0, 0.16].map((z) => (
            <mesh key={z} position={[0.18, 0, z]} rotation={[0, 0, -Math.PI / 2]} material={mats.cheese}>
              <coneGeometry args={[0.07, 0.26, 5]} />
            </mesh>
          ))}
        </group>
      );
    case "fan":
      return (
        <group>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
            <cylinderGeometry args={[0.3, 0.34, 0.24, 8]} />
          </mesh>
          <group ref={spin} position={[0.16, 0, 0]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[(Math.PI / 2) * i, 0, 0]} position={[0, 0, 0]} material={mats.toxic}>
                <boxGeometry args={[0.05, 0.5, 0.14]} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case "glove":
      return (
        <group>
          <mesh material={mats.woodDark}>
            <boxGeometry args={[0.18, 0.4, 0.4]} />
          </mesh>
          <group ref={partA} position={[0.02, 0, 0]}>
            <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
              <cylinderGeometry args={[0.06, 0.06, 0.4, 6]} />
            </mesh>
            <mesh position={[0.42, 0, 0]} material={mats.fabric}>
              <boxGeometry args={[0.26, 0.24, 0.24]} />
            </mesh>
          </group>
        </group>
      );
    case "shelf":
      return (
        <group>
          <group ref={partA} position={[0, 0.9, 0]}>
            <mesh material={mats.wood}>
              <boxGeometry args={[0.24, 1.9, 0.72]} />
            </mesh>
            {[0.4, 1.2].map((y) => (
              <mesh key={y} position={[0.14, y - 0.9, 0]} material={mats.cheese}>
                <boxGeometry args={[0.06, 0.12, 0.5]} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case "cannon":
      return (
        <group>
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.iron}>
            <cylinderGeometry args={[0.14, 0.18, 0.5, 8]} />
          </mesh>
          <mesh material={mats.wood}>
            <boxGeometry args={[0.36, 0.16, 0.34]} />
          </mesh>
          {[-0.14, 0.14].map((z) => (
            <mesh key={z} position={[0, -0.1, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.rubber}>
              <cylinderGeometry args={[0.1, 0.1, 0.06, 7]} />
            </mesh>
          ))}
        </group>
      );
    case "anvil":
      return (
        <group>
          <mesh material={mats.iron}>
            <boxGeometry args={[0.44, 0.24, 0.3]} />
          </mesh>
          <mesh position={[0, 0.2, 0]} material={mats.iron}>
            <boxGeometry args={[0.6, 0.18, 0.34]} />
          </mesh>
          <mesh position={[0.38, 0.2, 0]} rotation={[0, 0, -0.5]} material={mats.iron}>
            <coneGeometry args={[0.1, 0.24, 5]} />
          </mesh>
          <mesh position={[0, -0.02, 0]} material={mats.rubber}>
            <boxGeometry args={[0.2, 0.24, 0.2]} />
          </mesh>
        </group>
      );
    case "pot":
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.wood}>
            <cylinderGeometry args={[0.24, 0.18, 0.3, 7]} />
          </mesh>
          <mesh position={[0, 0.16, 0]} material={mats.dirt}>
            <boxGeometry args={[0.34, 0.06, 0.34]} />
          </mesh>
          <mesh position={[0, 0.32, 0]} material={mats.toxic}>
            <coneGeometry args={[0.16, 0.32, 5]} />
          </mesh>
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]} material={mats.cheese}>
            <coneGeometry args={[0.4, 0.34, 8, 1, true]} />
          </mesh>
          {[-0.2, 0, 0.2].map((z) => (
            <mesh key={z} position={[0, -0.2, z]} material={mats.paper}>
              <sphereGeometry args={[0.07, 6, 5]} />
            </mesh>
          ))}
          <mesh position={[0, 0.5, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.02, 0.02, 1, 4]} />
          </mesh>
        </group>
      );
    case "ball":
      return (
        <group>
          <mesh material={mats.rubber}>
            <sphereGeometry args={[0.28, 8, 6]} />
          </mesh>
          {[-0.08, 0, 0.08].map((z) => (
            <mesh key={z} position={[0.2, z * 0.6, 0]} material={mats.toxic}>
              <sphereGeometry args={[0.04, 5, 4]} />
            </mesh>
          ))}
        </group>
      );
    case "bucket":
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.26, 0.2, 0.3, 8, 1, true]} />
          </mesh>
          <group ref={partB} rotation={[-0.1, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} material={mats.glass}>
              <cylinderGeometry args={[0.23, 0.23, 0.04, 8]} />
            </mesh>
          </group>
          <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.iron}>
            <torusGeometry args={[0.24, 0.02, 3, 8, Math.PI]} />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh material={mats.metal}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
        </mesh>
      );
  }
}
