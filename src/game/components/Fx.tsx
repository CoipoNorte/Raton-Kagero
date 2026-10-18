import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { POOL_POPUPS, POOL_SHOTS } from "../constants";
import { TRAPS } from "../traps";
import { wordTexture } from "../textures";
import type { PopWord } from "../types";
import type { World } from "../simulation";

const PALETTE = ["#ffcf3f", "#c6f96a", "#ff4fa3", "#8ff5e8"];

/* Partículas cartoon: un único InstancedMesh con pool fijo. */
export function Particles({ world, count }: { world: World | null; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const total = Math.max(16, Math.min(200, count));

  useEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const c = new THREE.Color();
    for (let i = 0; i < total; i++) {
      c.set(PALETTE[i % PALETTE.length]);
      im.setColorAt(i, c);
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [total]);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    if (!world) {
      im.count = 0;
      return;
    }
    let n = 0;
    for (let i = 0; i < world.particles.length && n < total; i++) {
      const p = world.particles[i];
      if (!p.live) continue;
      const k = 1 - p.t / p.life;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.t * p.spin, p.t * p.spin * 0.6, 0);
      const base = p.kind === 2 ? 0.16 : p.kind === 1 ? 0.1 : 0.12;
      dummy.scale.setScalar(Math.max(0.01, base * (0.4 + k * 1.3) * (p.size / 0.12)));
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, total]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* Textos flotantes integrados en la escena (sprites con textura procedural). */
function Popup({ world, index }: { world: World | null; index: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const mat = useMemo(() => new THREE.SpriteMaterial({ transparent: true, depthTest: false, toneMapped: false }), []);
  const current = useRef<PopWord | null>(null);

  useFrame(() => {
    const s = ref.current;
    if (!s) return;
    const u = world?.popups[index];
    if (!u || !u.live) {
      s.visible = false;
      return;
    }
    if (current.current !== u.word) {
      current.current = u.word;
      mat.map = wordTexture(u.word);
      mat.needsUpdate = true;
    }
    const k = Math.min(1, u.t / u.life);
    s.visible = true;
    s.position.set(u.x, u.y + k * u.rise, u.z);
    const pop = k < 0.16 ? 0.55 + (k / 0.16) * 0.55 : 1.1 - (k - 0.16) * 0.12;
    s.scale.set(pop * 2.2, pop * 0.56, 1);
    mat.opacity = k > 0.68 ? Math.max(0, 1 - (k - 0.68) / 0.32) : 1;
    mat.color.set(u.tone === 1 ? "#ff8fb0" : u.tone === 2 ? "#ffe07a" : "#ffffff");
  });

  return <sprite ref={ref} material={mat} visible={false} />;
}

export function Popups({ world }: { world: World | null }) {
  return (
    <group>
      {Array.from({ length: POOL_POPUPS }, (_, i) => (
        <Popup key={i} world={world} index={i} />
      ))}
    </group>
  );
}

/* Proyectiles: dardos, corchos y la bola que rueda. */
function Shot({ world, index }: { world: World | null; index: number }) {
  const group = useRef<THREE.Group>(null);
  const dart = useRef<THREE.Mesh>(null);
  const cork = useRef<THREE.Mesh>(null);
  const bowl = useRef<THREE.Mesh>(null);
  const mats = useMemo(
    () => ({
      cheese: new THREE.MeshLambertMaterial({ color: "#ffcf3f", flatShading: true }),
      cork: new THREE.MeshLambertMaterial({ color: "#d6c7a4", flatShading: true }),
      bowl: new THREE.MeshLambertMaterial({ color: "#1b362c", flatShading: true }),
    }),
    [],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = world?.shots[index];
    if (!s || !s.live) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(s.x, s.y, s.z);
    g.rotation.y = -Math.atan2(s.vz, s.vx);
    const isDart = s.kind === "dart";
    const isCork = s.kind === "cork";
    const isBowl = s.kind === "bowl";
    if (dart.current) dart.current.visible = isDart;
    if (cork.current) cork.current.visible = isCork;
    if (bowl.current) {
      bowl.current.visible = isBowl;
      bowl.current.rotation.x += 0.28;
    }
    if (isDart || isCork) g.rotation.z = Math.sin(s.t * 26) * 0.08;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={dart} material={mats.cheese} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.32, 5]} />
      </mesh>
      <mesh ref={cork} material={mats.cork} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.26, 6]} />
      </mesh>
      <mesh ref={bowl} material={mats.bowl}>
        <sphereGeometry args={[0.32, 8, 6]} />
      </mesh>
    </group>
  );
}

export function Shots({ world }: { world: World | null }) {
  return (
    <group>
      {Array.from({ length: POOL_SHOTS }, (_, i) => (
        <Shot key={i} world={world} index={i} />
      ))}
    </group>
  );
}

/* Estelas de trayectoria: se ven en preparación, laboratorio y al colocar. */
export function Trails({ world, show }: { world: World | null; show: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    if (!world || !show) {
      im.count = 0;
      return;
    }
    let n = 0;
    for (const t of world.traps) {
      if (!t.live || n >= 64) continue;
      const def = TRAPS[t.def];
      if (!def.lane) continue;
      const px = t.side === "back" ? 0 : t.side === "left" ? 1 : -1;
      const pz = t.side === "back" ? 1 : 0;
      for (let i = 1; i < 9; i++) {
        dummy.position.set(t.x + px * i * 1.2, 0.06, t.z + pz * i * 1.2);
        dummy.rotation.set(-Math.PI / 2, 0, Math.atan2(pz, px));
        dummy.scale.setScalar(0.16 + Math.sin(Date.now() / 260 + i) * 0.03);
        dummy.updateMatrix();
        im.setMatrixAt(n, dummy.matrix);
        n += 1;
        if (n >= 64) break;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 64]} frustumCulled={false}>
      <coneGeometry args={[0.16, 0.4, 3]} />
      <meshBasicMaterial color="#57e8d5" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}
