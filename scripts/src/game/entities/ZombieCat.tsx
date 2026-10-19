import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CATS } from "../enemies";
import { starTexture } from "../textures";
import type { CatTypeId } from "../types";
import type { World } from "../simulation";

const Q = 1 / 46;
const q = (v: number) => Math.round(v / Q) * Q;

/* Gato zombi procedural. Un slot del pool = un componente montado de forma
   permanente; si no tiene entidad activa se oculta (nada de setState por frame). */
export function ZombieCat({ world, index }: { world: World | null; index: number }) {
  const group = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<Array<THREE.Mesh | null>>([]);
  const tail = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Group>(null);
  const bar = useRef<THREE.Mesh>(null);
  const [type, setType] = useState<CatTypeId>("common");

  const fur = useMemo(() => new THREE.MeshLambertMaterial({ color: "#b8a7c4", flatShading: true }), []);
  const dark = useMemo(() => new THREE.MeshLambertMaterial({ color: "#4a3b57", flatShading: true }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#c6f96a" }), []);
  const tongue = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ff7a9c" }), []);
  const starMat = useMemo(
    () => new THREE.SpriteMaterial({ map: starTexture(), transparent: true, color: "#ffe07a", depthTest: false }),
    [],
  );

  const def = CATS[type];

  useFrame(() => {
    const slot = world?.cats[index];
    const g = group.current;
    if (!g) return;
    if (!slot || !slot.live) {
      g.visible = false;
      return;
    }
    if (slot.type !== type) setType(slot.type);
    g.visible = true;

    g.position.set(q(slot.x), q(slot.y), q(slot.z));
    g.rotation.y = -slot.face;

    const rigG = rig.current;
    const bodyG = body.current;
    const headG = head.current;
    const t = slot.animT;
    const scale = def.scale * (slot.state === "dying" ? Math.max(0.05, slot.stateT / 0.34) : 1);
    g.scale.setScalar(scale);

    if (rigG) {
      rigG.rotation.set(0, 0, 0);
      rigG.position.set(0, 0, 0);
    }
    if (bodyG && headG) {
      if (slot.state === "walk" || slot.state === "flee") {
        bodyG.position.y = 0.02 + Math.abs(Math.sin(t * 7)) * 0.05;
        bodyG.rotation.z = Math.sin(t * 7) * 0.06;
        headG.rotation.z = Math.sin(t * 7 + 0.5) * 0.12;
        headG.rotation.x = slot.state === "flee" ? -0.2 : 0.1;
      } else if (slot.state === "slip") {
        rigG?.rotateY(t * 13);
        bodyG.rotation.z = 0.5 + Math.sin(t * 12) * 0.3;
        headG.rotation.z = -0.5;
      } else if (slot.state === "stun") {
        bodyG.rotation.z = Math.sin(t * 9) * 0.24;
        bodyG.rotation.x = Math.sin(t * 7) * 0.12;
        headG.rotation.z = Math.sin(t * 11) * 0.35;
      } else if (slot.state === "glue") {
        bodyG.rotation.x = 0.12;
        headG.rotation.z = Math.sin(t * 3) * 0.2;
        bodyG.position.y = -0.04;
      } else if (slot.state === "air") {
        bodyG.rotation.x = t * 7;
        bodyG.rotation.z = t * 4;
        headG.rotation.z = 0.3;
      } else if (slot.state === "attack") {
        bodyG.rotation.x = Math.sin(t * 14) * 0.2;
        headG.position.z = 0.05;
      } else if (slot.state === "dying") {
        bodyG.rotation.z += 0.35;
        headG.rotation.x -= 0.2;
      }
    }

    const swing = slot.state === "walk" || slot.state === "flee" ? Math.sin(t * 9) * 0.6 : 0.12;
    for (let i = 0; i < 4; i++) {
      const leg = legs.current[i];
      if (!leg) continue;
      leg.rotation.x = (i < 2 ? swing : -swing) * (slot.state === "glue" || slot.state === "stun" ? 0.15 : 1);
    }
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * 5) * 0.5;
      tail.current.rotation.z = 0.4 + Math.sin(t * 6) * 0.25;
    }
    if (stars.current) {
      const show = slot.stars > 0 && (slot.state === "stun" || slot.state === "slip" || slot.state === "air");
      stars.current.visible = show;
      if (show) {
        stars.current.rotation.y = t * 4.2;
        stars.current.position.y = 0.95 + Math.sin(t * 8) * 0.04;
      }
    }
    if (bar.current) {
      const ratio = Math.max(0, slot.hp) / slot.maxHp;
      const show = ratio < 0.999 && slot.state !== "dying";
      bar.current.visible = show;
      bar.current.scale.x = Math.max(0.01, ratio);
      (bar.current.material as THREE.MeshBasicMaterial).color.set(ratio > 0.55 ? "#c6f96a" : ratio > 0.25 ? "#ffcf3f" : "#ff4fa3");
      bar.current.position.x = -0.36 * (1 - ratio);
    }

    const flash = slot.flash;
    fur.color.set(def.color);
    if (flash > 0.01) fur.color.lerp(WHITE, Math.min(0.85, flash));
    fur.emissive.copy(TMP_COLOR.setRGB(flash * 0.5, flash * 0.2, flash * 0.3));
  });

  return (
    <group ref={group} visible={false}>
      <group ref={rig}>
        <group ref={body}>
          <mesh position={[0, 0.42, 0]} material={fur} castShadow>
            <boxGeometry args={[0.78, 0.5, 0.46]} />
          </mesh>
          <mesh position={[0.02, 0.2, 0]} material={dark}>
            <boxGeometry args={[0.66, 0.16, 0.4]} />
          </mesh>
          {def.shape === "chunk" || def.shape === "big" ? (
            <mesh position={[0.1, 0.62, 0]} material={dark}>
              <boxGeometry args={[0.4, 0.18, 0.56]} />
            </mesh>
          ) : null}
          {def.shape === "sprint" ? (
            <mesh position={[-0.16, 0.68, 0]} rotation={[0, 0, -0.5]} material={fur}>
              <coneGeometry args={[0.12, 0.3, 4]} />
            </mesh>
          ) : null}

          <group ref={head} position={[0.5, 0.62, 0]}>
            <mesh material={fur} castShadow>
              <boxGeometry args={[0.42, 0.38, 0.42]} />
            </mesh>
            <mesh position={[0.24, -0.04, 0]} material={dark}>
              <boxGeometry args={[0.16, 0.14, 0.24]} />
            </mesh>
            <mesh position={[0.26, -0.14, 0]} rotation={[0, 0, -0.4]} material={tongue}>
              <boxGeometry args={[0.14, 0.06, 0.08]} />
            </mesh>
            <mesh position={[0.1, 0.02, 0.13]} material={glow}>
              <boxGeometry args={[0.08, 0.08, 0.05]} />
            </mesh>
            <mesh position={[0.1, 0.02, -0.13]} material={glow}>
              <boxGeometry args={[0.08, 0.08, 0.05]} />
            </mesh>
            <mesh position={[-0.02, 0.26, 0.16]} rotation={[0, 0, 0.2]} material={fur}>
              <coneGeometry args={[0.11, 0.22, 3]} />
            </mesh>
            <mesh position={[-0.02, 0.26, -0.16]} rotation={[0, 0, 0.2]} material={fur}>
              <coneGeometry args={[0.11, 0.22, 3]} />
            </mesh>
            {def.shape === "dut" ? (
              <mesh position={[0.02, 0.16, 0]} material={dark}>
                <cylinderGeometry args={[0.26, 0.3, 0.16, 6]} />
              </mesh>
            ) : null}
            {def.shape === "big" ? (
              <mesh position={[0.2, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={dark}>
                <coneGeometry args={[0.16, 0.2, 4]} />
              </mesh>
            ) : null}
          </group>

          <group ref={tail} position={[-0.42, 0.5, 0]}>
            <mesh position={[-0.16, 0.06, 0]} material={fur}>
              <boxGeometry args={[0.34, 0.1, 0.1]} />
            </mesh>
            <mesh position={[-0.36, 0.2, 0]} material={fur}>
              <boxGeometry args={[0.24, 0.09, 0.09]} />
            </mesh>
          </group>

          {[
            [0.26, 0.19],
            [-0.24, 0.19],
            [0.26, -0.19],
            [-0.24, -0.19],
          ].map(([px, pz], i) => (
            <mesh
              key={i}
              ref={(m) => {
                legs.current[i] = m;
              }}
              position={[px, 0.1, pz]}
              material={dark}
            >
              <boxGeometry args={[0.14, 0.28, 0.12]} />
            </mesh>
          ))}
        </group>

        <group ref={stars} visible={false} position={[0, 0.95, 0]}>
          {[0, 2.1, 4.2].map((a) => (
            <sprite key={a} position={[Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]} scale={[0.26, 0.26, 0.26]} material={starMat} />
          ))}
        </group>
      </group>

      <mesh ref={bar} position={[0, 1.12, 0]} visible={false}>
        <planeGeometry args={[0.72, 0.08]} />
        <meshBasicMaterial color="#c6f96a" transparent opacity={0.9} depthTest={false} />
      </mesh>
    </group>
  );
}

const WHITE = new THREE.Color("#ffffff");
const TMP_COLOR = new THREE.Color();
