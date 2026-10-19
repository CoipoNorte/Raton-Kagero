import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Room } from "./Room";
import { TrapPreview } from "./TrapPreview";
import { Particles, Popups, Shots, Trails } from "./Fx";
import { ZombieCat } from "../entities/ZombieCat";
import { MouseInventor } from "../entities/MouseInventor";
import { TrapEntity } from "../entities/TrapEntity";
import {
  CAT_CAP_BY_QUALITY,
  CELL,
  DPR_CAP_BY_QUALITY,
  GRID_H,
  GRID_W,
  PARTICLE_CAP_BY_QUALITY,
  POOL_CATS,
  POOL_TRAPS,
  ROOM_D,
  ROOM_W,
  SHADOWS_BY_QUALITY,
  TRAP_CAP_BY_QUALITY,
} from "../constants";
import { cellIndex, cellTarget, clampInt, wallTarget, worldToCellGX, worldToCellGZ, type Target } from "../logic";
import type { QualityId, SurfaceKind, TrapDef } from "../types";
import type { World } from "../simulation";
import { DEFAULT_MAP_ID, getMap } from "../maps";

export interface Canvas3DProps {
  world: World | null;
  quality: QualityId;
  interactive: boolean;
  helpers: boolean;
  surface: SurfaceKind;
  selectedDef: TrapDef | null;
  hover: Target | null;
  hoverOk: boolean;
  pending: boolean;
  trails: boolean;
  freeCam: boolean;
  padActive?: boolean;
  reducedMotion: boolean;
  view: { w: number; h: number };
  shake: { power: number; id: number };
  keys: React.RefObject<Record<string, boolean>>;
  joy: React.RefObject<{ x: number; y: number; active: boolean }>;
  padMove?: React.RefObject<{ x: number; y: number }>;
  onHover: (t: Target | null) => void;
  onTap: (t: Target, coarse: boolean) => void;
  onContextLost: (lost: boolean) => void;
}

type HitKind = "floor" | "back" | "left" | "right";

function resolve(v: THREE.Vector3, kind: HitKind, surface: SurfaceKind): Target {
  const gx = clampInt(worldToCellGX(v.x), 0, GRID_W - 1);
  const gz = clampInt(worldToCellGZ(v.z), 0, GRID_H - 1);
  if (surface === "wall") {
    if (kind === "back") return wallTarget("back", gx);
    if (kind === "left") return wallTarget("left", gz);
    if (kind === "right") return wallTarget("right", gz);
    const dBack = Math.abs(v.z + ROOM_D / 2);
    const dLeft = Math.abs(v.x + ROOM_W / 2);
    const dRight = Math.abs(ROOM_W / 2 - v.x);
    const min = Math.min(dBack, dLeft, dRight);
    if (min === dLeft) return wallTarget("left", gz);
    if (min === dRight) return wallTarget("right", gz);
    return wallTarget("back", gx);
  }
  if (kind === "back") return cellTarget(gx, 0, surface);
  if (kind === "left") return cellTarget(0, gz, surface);
  if (kind === "right") return cellTarget(GRID_W - 1, gz, surface);
  return cellTarget(gx, gz, surface);
}

function Scene(props: Canvas3DProps) {
  const shake = useRef({ power: 0, t: 0 });
  const lastKey = useRef("");
  const base = useMemo(() => new THREE.Vector3(11.6, 10.4, 11.6), []);
  const target = useMemo(() => new THREE.Vector3(0, 0.65, 0), []);

  useEffect(() => {
    if (props.shake.id > 0 && !props.reducedMotion) shake.current = { power: props.shake.power, t: 0 };
  }, [props.shake, props.reducedMotion]);

  const handleMove = useMemo(
    () => (point: THREE.Vector3, kind: HitKind) => {
      const t = resolve(point, kind, props.surface);
      const key = `${t.surface}:${t.side}:${t.index}`;
      if (key === lastKey.current) return;
      lastKey.current = key;
      props.onHover(t);
    },
    [props.surface, props.onHover],
  );
  const handleDown = useMemo(
    () => (point: THREE.Vector3, kind: HitKind, coarse: boolean) => {
      props.onTap(resolve(point, kind, props.surface), coarse);
    },
    [props.surface, props.onTap],
  );

  const catBudget = Math.min(POOL_CATS, CAT_CAP_BY_QUALITY[props.quality] + 2);
  const trapBudget = Math.min(POOL_TRAPS, TRAP_CAP_BY_QUALITY[props.quality]);
  const particleBudget = PARTICLE_CAP_BY_QUALITY[props.quality];
  const shadows = SHADOWS_BY_QUALITY[props.quality];
  const room = props.world?.map ?? getMap(DEFAULT_MAP_ID);
  const lair = useMemo(
    () => ({ x: (room.lair.gx - (GRID_W - 1) / 2) * CELL, z: (room.lair.gz - (GRID_H - 1) / 2) * CELL }),
    [room.lair.gx, room.lair.gz],
  );

  useFrame((state, dt) => {
    const w = props.world;
    if (w) {
      const k = props.keys.current ?? {};
      const j = props.joy.current ?? { x: 0, y: 0, active: false };
      const pad = props.padMove?.current ?? { x: 0, y: 0 };
      let mx = 0;
      let mz = 0;
      if (k["w"] || k["arrowup"]) mz -= 1;
      if (k["s"] || k["arrowdown"]) mz += 1;
      if (k["a"] || k["arrowleft"]) mx -= 1;
      if (k["d"] || k["arrowright"]) mx += 1;
      // El mando sólo aporta si el stick está activo: no pisa al teclado.
      w.input.mx = mx + j.x + pad.x;
      w.input.mz = mz + j.y + pad.y;
      w.input.run = !!k["shift"] || Math.hypot(pad.x, pad.y) > 0.7;
      w.advance(dt);
    }

    const cam = state.camera as THREE.OrthographicCamera;
    const zoom = Math.max(6, Math.min(180, Math.min(state.size.width / props.view.w, state.size.height / props.view.h)));
    // En el Laboratorio, OrbitControls es dueño del zoom. Antes se reescribía
    // aquí cada frame y la rueda parecía no funcionar.
    if (!props.freeCam && Math.abs(cam.zoom - zoom) > 0.04) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    if (!props.freeCam) {
      const s = shake.current;
      if (s.power > 0) {
        s.t += dt;
        s.power = Math.max(0, s.power - dt * 2.4);
        const amp = s.power * 0.3;
        cam.position.set(base.x + Math.sin(s.t * 48) * amp, base.y + Math.sin(s.t * 63) * amp * 0.8, base.z + Math.cos(s.t * 55) * amp);
      } else if (Math.abs(cam.position.x - base.x) > 0.001) {
        cam.position.copy(base);
      }
      cam.lookAt(target);
    }
  });

  return (
    <>
      <color attach="background" args={[room.theme.fog]} />
      <fog attach="fog" args={[room.theme.fog, 19, 52]} />
      <hemisphereLight args={["#ffe3ad", "#123324", 0.62]} />
      <ambientLight intensity={0.34} color={room.theme.ambient} />
      <directionalLight
        position={[7, 13, 5]}
        intensity={1.15}
        color="#ffd79a"
        castShadow={shadows}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <pointLight position={[lair.x, 2.1, lair.z]} intensity={14} distance={7.5} decay={2} color={room.theme.accent} />
      <pointLight position={[-5.4, 2.6, -4.2]} intensity={7} distance={8} decay={2} color="#57e8d5" />

      <Room
        world={props.world}
        interactive={props.interactive}
        showGrid={props.helpers}
        onPoint={(p, k) => handleMove(p, k)}
        onPick={(p, k, coarse) => handleDown(p, k, coarse)}
      />

      <group>
        {Array.from({ length: catBudget }, (_, i) => (
          <ZombieCat key={i} world={props.world} index={i} />
        ))}
      </group>
      <group>
        {Array.from({ length: trapBudget }, (_, i) => (
          <TrapEntity key={i} world={props.world} index={i} helpers={props.helpers} />
        ))}
      </group>
      <MouseInventor world={props.world} showReach={props.helpers} />
      <Shots world={props.world} />
      <Particles world={props.world} count={particleBudget} />
      <Popups world={props.world} />
      <Trails world={props.world} show={props.trails} />

      <TrapPreview hover={props.hover} ok={props.hoverOk} pending={props.pending} def={props.selectedDef} padActive={props.padActive} />

      {props.freeCam ? (
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minZoom={12}
          maxZoom={90}
          minPolarAngle={0.62}
          maxPolarAngle={1.16}
          minAzimuthAngle={-0.5}
          maxAzimuthAngle={0.9}
          target={[0, 0.65, 0]}
          enableDamping={false}
        />
      ) : null}
    </>
  );
}



export function Canvas3D(props: Canvas3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const cap = DPR_CAP_BY_QUALITY[props.quality];

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const canvas = node.querySelector("canvas");
    if (!canvas) return;
    const lost = (e: Event) => {
      e.preventDefault();
      props.onContextLost(true);
    };
    const restored = () => props.onContextLost(false);
    canvas.addEventListener("webglcontextlost", lost as EventListener);
    canvas.addEventListener("webglcontextrestored", restored as EventListener);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost as EventListener);
      canvas.removeEventListener("webglcontextrestored", restored as EventListener);
    };
  }, [props]);

  return (
    <div ref={host} className="absolute inset-0">
      <Canvas
        orthographic
        dpr={[0.55, cap]}
        camera={{ position: [11.6, 10.4, 11.6], zoom: 44, near: -40, far: 140 }}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
        shadows={SHADOWS_BY_QUALITY[props.quality]}
        onCreated={({ gl }) => {
          gl.setClearColor("#0b1a15", 1);
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}

export { cellIndex };
