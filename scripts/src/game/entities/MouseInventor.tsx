import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL } from "../constants";
import type { World } from "../simulation";

const Q = 1 / 46;
const q = (value: number) => Math.round(value / Q) * Q;
type Point3 = readonly [number, number, number];

interface LinkProps {
  from: Point3;
  to: Point3;
  radiusA: number;
  radiusB: number;
  material: THREE.Material;
  sides?: number;
}

/** Cilindro orientado entre dos puntos. Permite una cola continua sin duplicarla. */
function Link({ from, to, radiusA, radiusB, material, sides = 6 }: LinkProps) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return { length, midpoint, quaternion };
  }, [from, to]);

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} material={material} castShadow>
      <cylinderGeometry args={[radiusB, radiusA, transform.length, sides, 1]} />
    </mesh>
  );
}

const TAIL_POINTS: readonly Point3[] = [
  [-0.38, 0.28, 0],
  [-0.58, 0.24, 0.04],
  [-0.78, 0.18, 0.16],
  [-0.94, 0.14, 0.34],
  [-1.02, 0.12, 0.55],
  [-0.96, 0.11, 0.75],
];

const WHISKERS: ReadonlyArray<readonly [Point3, Point3]> = [
  [[0.68, 0.39, 0.1], [0.91, 0.41, 0.3]],
  [[0.68, 0.36, 0.1], [0.93, 0.33, 0.27]],
  [[0.68, 0.39, -0.1], [0.91, 0.41, -0.3]],
  [[0.68, 0.36, -0.1], [0.93, 0.33, -0.27]],
];

/**
 * Ratón inventor low-poly.
 *
 * La lectura animal manda sobre los accesorios: cuerpo horizontal, grupa
 * redonda, cabeza grande, hocico cónico, orejas circulares, cuatro patas y
 * exactamente una cola larga. La mochila y la lámpara son secundarios.
 */
export function MouseInventor({ world, showReach }: { world: World | null; showReach: boolean }) {
  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const ears = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const frontLeft = useRef<THREE.Group>(null);
  const frontRight = useRef<THREE.Group>(null);
  const rearLeft = useRef<THREE.Group>(null);
  const rearRight = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const reach = useRef<THREE.Mesh>(null);

  const materials = useMemo(
    () => ({
      fur: new THREE.MeshLambertMaterial({ color: "#b9c3ca", flatShading: true }),
      furLight: new THREE.MeshLambertMaterial({ color: "#dce3e6", flatShading: true }),
      belly: new THREE.MeshLambertMaterial({ color: "#eee4d2", flatShading: true }),
      pink: new THREE.MeshLambertMaterial({ color: "#e98ba8", flatShading: true }),
      pinkLight: new THREE.MeshLambertMaterial({ color: "#f6b3c6", flatShading: true }),
      nose: new THREE.MeshLambertMaterial({ color: "#5b2738", flatShading: true }),
      eye: new THREE.MeshBasicMaterial({ color: "#111815" }),
      eyeGlint: new THREE.MeshBasicMaterial({ color: "#d7ffb2" }),
      tooth: new THREE.MeshLambertMaterial({ color: "#fff3d4", flatShading: true }),
      whisker: new THREE.MeshBasicMaterial({ color: "#ece5d9" }),
      leather: new THREE.MeshLambertMaterial({ color: "#26493a", flatShading: true }),
      leatherDark: new THREE.MeshLambertMaterial({ color: "#14291f", flatShading: true }),
      brass: new THREE.MeshLambertMaterial({ color: "#d8a24a", emissive: "#3d2907", flatShading: true }),
      lamp: new THREE.MeshBasicMaterial({ color: "#fff2a6" }),
      beam: new THREE.MeshBasicMaterial({
        color: "#ffe07a",
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      shadow: new THREE.MeshBasicMaterial({ color: "#06100c", transparent: true, opacity: 0.34, depthWrite: false }),
    }),
    [],
  );

  useFrame(() => {
    const mouse = world?.mouse;
    const rootNode = root.current;
    if (!mouse || !rootNode) {
      if (rootNode) rootNode.visible = false;
      return;
    }

    rootNode.visible = true;
    rootNode.position.set(q(mouse.x), 0, q(mouse.z));
    rootNode.rotation.y = -mouse.face;

    const t = mouse.animT;
    const walking = mouse.state === "walk";
    const stride = walking ? Math.sin(t * 11.5) : 0;
    const bounce = walking ? Math.abs(Math.sin(t * 11.5)) * 0.045 : Math.sin(t * 2.1) * 0.012;

    if (rig.current) {
      rig.current.position.y = bounce;
      rig.current.rotation.z = walking ? stride * 0.035 : 0;
      rig.current.rotation.x = mouse.state === "sad" ? 0.16 : 0;
      if (mouse.state === "cheer") {
        rig.current.position.y = 0.09 + Math.abs(Math.sin(t * 8.5)) * 0.18;
        rig.current.rotation.z = Math.sin(t * 8.5) * 0.12;
      }
    }

    if (head.current) {
      head.current.rotation.z = walking ? -stride * 0.055 : Math.sin(t * 1.8) * 0.025;
      head.current.rotation.x = mouse.state === "sad" ? 0.16 : Math.sin(t * 2.4) * 0.018;
    }

    if (ears.current) {
      ears.current.rotation.x = walking ? Math.sin(t * 9.5) * 0.055 : Math.sin(t * 2) * 0.025;
      ears.current.rotation.z = mouse.state === "sad" ? 0.28 : 0;
    }

    const legSwing = stride * 0.62;
    if (frontLeft.current) frontLeft.current.rotation.z = legSwing;
    if (frontRight.current) frontRight.current.rotation.z = -legSwing;
    if (rearLeft.current) rearLeft.current.rotation.z = -legSwing * 0.8;
    if (rearRight.current) rearRight.current.rotation.z = legSwing * 0.8;

    if (tail.current) {
      tail.current.rotation.y = walking ? Math.sin(t * 5.8) * 0.38 : Math.sin(t * 2.4) * 0.16;
      tail.current.rotation.z = mouse.state === "sad" ? -0.12 : Math.sin(t * 3.1) * 0.06;
    }

    if (beam.current) {
      (beam.current.material as THREE.MeshBasicMaterial).opacity =
        (0.055 + Math.sin(t * 5.5) * 0.008) * (mouse.invuln > 0 ? 0.45 : 1);
    }

    if (reach.current) {
      reach.current.visible = showReach;
      reach.current.rotation.z += 0.007;
    }

    rootNode.position.y = mouse.invuln > 0 && Math.floor(mouse.invuln * 15) % 2 === 0 ? 0.045 : 0;
  });

  return (
    <group ref={root}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.05, 0.012, 0]} scale={[1.25, 1.25, 1.25]} material={materials.shadow}>
        <circleGeometry args={[0.43, 12]} />
      </mesh>

      <group ref={rig} scale={[1.25, 1.25, 1.25]}>
        {/* Grupa y torso horizontal: la silueta principal de ratón. */}
        <mesh position={[-0.13, 0.32, 0]} scale={[1.35, 0.78, 0.9]} material={materials.fur} castShadow>
          <sphereGeometry args={[0.34, 9, 6]} />
        </mesh>
        <mesh position={[0.17, 0.34, 0]} scale={[1.05, 0.83, 0.88]} material={materials.furLight} castShadow>
          <sphereGeometry args={[0.28, 8, 6]} />
        </mesh>
        <mesh position={[0.13, 0.21, 0]} scale={[1.2, 0.42, 0.75]} material={materials.belly}>
          <sphereGeometry args={[0.24, 8, 5]} />
        </mesh>

        {/* Cabeza grande, mejillas y hocico puntiagudo hacia +X. */}
        <group ref={head} position={[0.38, 0.46, 0]}>
          <mesh scale={[1.05, 0.94, 1]} material={materials.furLight} castShadow>
            <sphereGeometry args={[0.29, 9, 7]} />
          </mesh>
          <mesh position={[0.25, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.furLight} castShadow>
            <coneGeometry args={[0.19, 0.45, 7]} />
          </mesh>
          <mesh position={[0.48, -0.05, 0]} scale={[1.15, 0.82, 1]} material={materials.nose}>
            <sphereGeometry args={[0.075, 7, 5]} />
          </mesh>

          {/* Ojos laterales grandes, situados antes del hocico. */}
          <mesh position={[0.13, 0.06, 0.245]} scale={[1, 1.12, 0.7]} material={materials.eye}>
            <sphereGeometry args={[0.072, 7, 5]} />
          </mesh>
          <mesh position={[0.13, 0.06, -0.245]} scale={[1, 1.12, 0.7]} material={materials.eye}>
            <sphereGeometry args={[0.072, 7, 5]} />
          </mesh>
          <mesh position={[0.155, 0.087, 0.288]} material={materials.eyeGlint}>
            <sphereGeometry args={[0.019, 5, 4]} />
          </mesh>
          <mesh position={[0.155, 0.087, -0.288]} material={materials.eyeGlint}>
            <sphereGeometry args={[0.019, 5, 4]} />
          </mesh>

          {/* Dos dientes incisivos cortos debajo del hocico. */}
          <mesh position={[0.34, -0.18, 0.045]} rotation={[0, 0, -0.08]} material={materials.tooth}>
            <boxGeometry args={[0.09, 0.12, 0.055]} />
          </mesh>
          <mesh position={[0.34, -0.18, -0.045]} rotation={[0, 0, -0.08]} material={materials.tooth}>
            <boxGeometry args={[0.09, 0.12, 0.055]} />
          </mesh>

          {/* Orejas circulares, altas y visibles desde cámara isométrica. */}
          <group ref={ears}>
            <mesh position={[-0.13, 0.24, 0.205]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.45]} material={materials.fur} castShadow>
              <cylinderGeometry args={[0.185, 0.185, 0.075, 10]} />
            </mesh>
            <mesh position={[-0.13, 0.24, -0.205]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.45]} material={materials.fur} castShadow>
              <cylinderGeometry args={[0.185, 0.185, 0.075, 10]} />
            </mesh>
            <mesh position={[-0.13, 0.244, 0.225]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.4]} material={materials.pinkLight}>
              <cylinderGeometry args={[0.12, 0.12, 0.052, 9]} />
            </mesh>
            <mesh position={[-0.13, 0.244, -0.225]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.4]} material={materials.pinkLight}>
              <cylinderGeometry args={[0.12, 0.12, 0.052, 9]} />
            </mesh>
          </group>

          {/* Vincha y lámpara frontal. */}
          <mesh position={[-0.02, 0.03, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.leatherDark}>
            <torusGeometry args={[0.285, 0.027, 4, 10]} />
          </mesh>
          <mesh position={[0.16, 0.245, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.brass}>
            <cylinderGeometry args={[0.075, 0.09, 0.14, 7]} />
          </mesh>
          <mesh position={[0.245, 0.245, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.lamp}>
            <cylinderGeometry args={[0.055, 0.055, 0.035, 7]} />
          </mesh>
        </group>

        {WHISKERS.map(([from, to], index) => (
          <Link key={`whisker-${index}`} from={from} to={to} radiusA={0.009} radiusB={0.005} material={materials.whisker} sides={4} />
        ))}

        {/* Una única cola: cinco segmentos conectados, rosada, larga y cónica. */}
        <group ref={tail}>
          {TAIL_POINTS.slice(0, -1).map((point, index) => (
            <Link
              key={`tail-${index}`}
              from={point}
              to={TAIL_POINTS[index + 1]}
              radiusA={0.047 - index * 0.0065}
              radiusB={0.04 - index * 0.0065}
              material={materials.pink}
              sides={7}
            />
          ))}
          <mesh position={TAIL_POINTS[TAIL_POINTS.length - 1]} material={materials.pink}>
            <sphereGeometry args={[0.014, 6, 4]} />
          </mesh>
        </group>

        {/* Mochila compacta: el accesorio no rompe la silueta animal. */}
        <group position={[-0.18, 0.57, 0]}>
          <mesh material={materials.leather} castShadow>
            <boxGeometry args={[0.32, 0.26, 0.38]} />
          </mesh>
          <mesh position={[0.02, 0.02, 0.202]} material={materials.brass}>
            <boxGeometry args={[0.13, 0.08, 0.025]} />
          </mesh>
          <mesh position={[-0.08, 0.22, 0.1]} rotation={[0, 0, 0.24]} material={materials.brass}>
            <cylinderGeometry args={[0.024, 0.024, 0.36, 5]} />
          </mesh>
          <mesh position={[0.08, 0.2, -0.08]} rotation={[0.18, 0, -0.2]} material={materials.brass}>
            <boxGeometry args={[0.045, 0.34, 0.045]} />
          </mesh>
        </group>

        {/* Cuatro patitas rosadas, cortas y separadas del cuerpo. */}
        <group ref={frontLeft} position={[0.23, 0.13, 0.2]}>
          <mesh rotation={[0, 0, -0.18]} material={materials.pinkLight}>
            <capsuleGeometry args={[0.055, 0.11, 3, 6]} />
          </mesh>
          <mesh position={[0.055, -0.08, 0]} scale={[1.35, 0.55, 1]} material={materials.pink}>
            <sphereGeometry args={[0.065, 6, 4]} />
          </mesh>
        </group>
        <group ref={frontRight} position={[0.23, 0.13, -0.2]}>
          <mesh rotation={[0, 0, -0.18]} material={materials.pinkLight}>
            <capsuleGeometry args={[0.055, 0.11, 3, 6]} />
          </mesh>
          <mesh position={[0.055, -0.08, 0]} scale={[1.35, 0.55, 1]} material={materials.pink}>
            <sphereGeometry args={[0.065, 6, 4]} />
          </mesh>
        </group>
        <group ref={rearLeft} position={[-0.25, 0.14, 0.2]}>
          <mesh scale={[1.15, 1, 1]} material={materials.fur}>
            <sphereGeometry args={[0.105, 7, 5]} />
          </mesh>
          <mesh position={[0.07, -0.085, 0]} scale={[1.55, 0.52, 1]} material={materials.pink}>
            <sphereGeometry args={[0.075, 6, 4]} />
          </mesh>
        </group>
        <group ref={rearRight} position={[-0.25, 0.14, -0.2]}>
          <mesh scale={[1.15, 1, 1]} material={materials.fur}>
            <sphereGeometry args={[0.105, 7, 5]} />
          </mesh>
          <mesh position={[0.07, -0.085, 0]} scale={[1.55, 0.52, 1]} material={materials.pink}>
            <sphereGeometry args={[0.075, 6, 4]} />
          </mesh>
        </group>

        {/* Haz de la lámpara frontal, alineado con el hocico (+X). */}
        <mesh ref={beam} position={[0.96, 0.705, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.beam}>
          <coneGeometry args={[0.25, 1.08, 7, 1, true]} />
        </mesh>
      </group>

      <mesh ref={reach} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} visible={false}>
        <ringGeometry args={[CELL * 2.9, CELL * 3.1, 22]} />
        <meshBasicMaterial color="#57e8d5" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}