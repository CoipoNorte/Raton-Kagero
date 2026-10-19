import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ROUND_TIME, PREP_TIME, LAIR_HP, MOUSE_LIVES, START_CHEESE } from "../game/constants";
import type { GameMode, HudSnapshot, Phase, Progress, QualityId, RunResult, Settings, SurfaceKind, TrapId, WorldEvent } from "../game/types";
import { World } from "../game/simulation";
import { cellTarget, targetCell, wallTarget, worldToCellGX, worldToCellGZ, type Target } from "../game/logic";
import { TRAPS } from "../game/traps";
import { DEFAULT_MAP_ID, getMap, type MapId } from "../game/maps";
import * as audio from "../game/sound";
import type { SfxName } from "../game/sound";
import { useGamepad, type GamepadState } from "./useGamepad";
import type { PadAction } from "../game/gamepad";
import { TUTORIAL_LAST, snapshotOf, stepComplete, tutorialStep, type TutorialSnapshot } from "../game/tutorial";
import type { WallSide } from "../game/types";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, loadProgress, loadSettings, saveProgress, saveSettings, storageIsVolatile, unlockedFor } from "../game/storage";

export interface Interaction {
  hover: Target | null;
  ok: boolean;
  reason: string;
  pending: Target | null;
  trapUid: number | null;
  trapDef: TrapId | null;
}

const EMPTY_HUD: HudSnapshot = {
  timeLeft: ROUND_TIME,
  prepLeft: PREP_TIME,
  score: 0,
  cheese: START_CHEESE,
  combo: 0,
  comboBest: 0,
  chainBest: 0,
  lairHp: LAIR_HP,
  lairMax: LAIR_HP,
  lives: MOUSE_LIVES,
  wave: 1,
  waveProgress: 0,
  defeated: 0,
  trapsLive: 0,
  trapCap: 12,
  fps: 60,
  lastPlay: null,
  incoming: 0,
};

function sameTarget(a: Target | null, b: Target | null): boolean {
  if (!a || !b) return false;
  return a.surface === b.surface && a.index === b.index && a.side === b.side;
}

function prefersReduced(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useGameEngine() {
  const [settings, setSettings] = useState<Settings>(() => (typeof window === "undefined" ? DEFAULT_SETTINGS : loadSettings()));
  const [progress, setProgress] = useState<Progress>(() => (typeof window === "undefined" ? DEFAULT_PROGRESS : loadProgress()));
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<GameMode>("survival");
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [surface, setSurface] = useState<SurfaceKind>("floor");
  const [selected, setSelected] = useState<TrapId | null>("banana_peel");
  const [result, setResult] = useState<RunResult | null>(null);
  const [banner, setBanner] = useState<{ text: string; tone: "good" | "bad" | "gold"; id: number } | null>(null);
  const [shake, setShake] = useState<{ power: number; id: number }>({ power: 0, id: 0 });
  const [flash, setFlash] = useState(0);
  const [quality, setQuality] = useState<QualityId>(settings.quality);
  const [mapId, setMapId] = useState<MapId>(() => (typeof window === "undefined" ? DEFAULT_MAP_ID : loadSettings().mapId));
  const [interaction, setInteraction] = useState<Interaction>({ hover: null, ok: false, reason: "", pending: null, trapUid: null, trapDef: null });
  const [padTarget, setPadTarget] = useState<Target | null>(null);
  const [padConnected, setPadConnected] = useState(false);

  const worldRef = useRef<World | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const joy = useRef({ x: 0, y: 0, active: false });
  const padMove = useRef({ x: 0, y: 0 });
  const padRef = useRef<GamepadState>({ connected: false, id: "", gx: getMap(DEFAULT_MAP_ID).lair.gx, gz: getMap(DEFAULT_MAP_ID).lair.gz, side: "back" });
  const padSurface = useRef<SurfaceKind>("floor");
  const padSide = useRef<WallSide>("back");
  const padTargetRef = useRef<Target | null>(null);
  const padConnectedRef = useRef(false);
  const padCursorRef = useRef({ gx: getMap(DEFAULT_MAP_ID).lair.gx, gz: getMap(DEFAULT_MAP_ID).lair.gz });
  /* Tutorial: índice del paso (null = no hay tutorial en curso) y la
     instantánea tomada al entrar en el paso, contra la que se compara. */
  const [tutorialIndex, setTutorialIndex] = useState<number | null>(null);
  const tutorialRef = useRef<number | null>(null);
  const tutorialStartRef = useRef<TutorialSnapshot | null>(null);
  const tutorialMovedRef = useRef(0);
  const tutorialLastPosRef = useRef({ x: 0, z: 0 });
  const tutorialSpawnRef = useRef(0);
  const tutorialEnterRef = useRef<((index: number, earned: boolean) => void) | null>(null);
  const tutorialRestartRef = useRef<(() => void) | null>(null);
  const selectedRef = useRef<TrapId | null>("banana_peel");
  /** Mapa de la ronda en curso; si no hay partida, el elegido en el menú. */
  const activeMapRef = useRef(getMap(mapId));
  const lastInputWasPad = useRef(false);
  const progressRef = useRef(progress);
  const settingsRef = useRef(settings);
  const bannerTimer = useRef<number | null>(null);
  const lowFps = useRef(0);
  const idRef = useRef(1);
  const reduced = useRef(prefersReduced());

  progressRef.current = progress;
  settingsRef.current = settings;
  selectedRef.current = selected;
  activeMapRef.current = worldRef.current?.map ?? getMap(mapId);

  const unlockThresholds = useMemo(() => {
    const map = {} as Record<TrapId, number>;
    for (const [id, def] of Object.entries(TRAPS) as Array<[TrapId, (typeof TRAPS)[TrapId]]>) map[id] = def.unlock;
    return map;
  }, []);

  const unlocked = useMemo(() => unlockedFor(progress, unlockThresholds), [progress, unlockThresholds]);
  const unlockedSet = useMemo(() => new Set<TrapId>(unlocked), [unlocked]);

  /* --------------------------- audio / gesture --------------------------- */
  useEffect(() => {
    const onFirst = () => {
      audio.unlock();
      audio.configure({ sound: settingsRef.current.sound, music: settingsRef.current.music, volume: settingsRef.current.volume });
      if (settingsRef.current.music) audio.startMusic();
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("keydown", onFirst);
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  useEffect(() => {
    saveSettings(settings);
    audio.configure({ sound: settings.sound, music: settings.music, volume: settings.volume });
  }, [settings]);

  useEffect(() => {
    const active = settings.music && phase !== "over";
    if (active && audio.isReady()) audio.startMusic();
    else audio.stopMusic();
    audio.duckMusic(phase === "paused");
  }, [phase, settings.music]);

  useEffect(() => () => { audio.dispose(); audio.stopMusic(); }, []);

  /* ------------------------------ eventos ------------------------------- */

  const showBanner = useCallback((text: string, tone: "good" | "bad" | "gold") => {
    idRef.current += 1;
    setBanner({ text, tone, id: idRef.current });
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 1900);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    };
  }, []);

  const finishRun = useCallback(
    (world: World) => {
      const base = world.result();
      const prev = progressRef.current;
      const isRecord = base.mode === "survival" && base.score > prev.highScore;
      const next: Progress = {
        highScore: Math.max(prev.highScore, base.mode === "survival" ? base.score : 0),
        bestCombo: Math.max(prev.bestCombo, base.mode === "survival" ? base.comboBest : 0),
        bestChain: Math.max(prev.bestChain, base.mode === "survival" ? base.chainBest : 0),
        // El queso inicial es presupuesto de la ronda, no una recompensa desbloqueable.
        totalCheese: prev.totalCheese + (base.mode === "survival" ? world.earnedCheese : 0),
        runs: prev.runs + 1,
        catsOut: prev.catsOut + base.defeated,
        unlocked: prev.unlocked,
        tutorialDone: prev.tutorialDone,
      };
      saveProgress(next);
      setProgress(next);
      setResult({ ...base, newRecord: isRecord });
      setPhase("over");
      if (isRecord) audio.play("record");
    },
    [],
  );

  const handleEvent = useCallback(
    (ev: WorldEvent) => {
      switch (ev.type) {
        case "sfx":
          audio.play(ev.name as SfxName, ev.param ?? 0);
          break;
        case "shake": {
          const level = settingsRef.current.shake;
          if (level === "off" || reduced.current) break;
          const power = level === "low" ? ev.power * 0.45 : ev.power;
          idRef.current += 1;
          setShake({ power, id: idRef.current });
          break;
        }
        case "banner":
          showBanner(ev.text, ev.tone);
          if (ev.tone === "bad" && settingsRef.current.flashes) setFlash((f) => f + 1);
          break;
        case "end": {
          const w = worldRef.current;
          if (w) finishRun(w);
          break;
        }
      }
    },
    [finishRun, showBanner],
  );

  const eventRef = useRef(handleEvent);
  eventRef.current = handleEvent;

  /* ------------------------------- partida ------------------------------ */

  const startRun = useCallback(
    (next: GameMode) => {
      const world = new World({
        mode: next,
        quality,
        reducedMotion: reduced.current,
        mapId,
        emit: (ev) => eventRef.current(ev),
      });
      world.paused = false;
      world.pendingDef = selected;
      worldRef.current = world;
      tutorialRef.current = null;
      setTutorialIndex(null);
      setMode(next);
      setResult(null);
      setInteraction({ hover: null, ok: false, reason: "", pending: null, trapUid: null, trapDef: null });
      setPhase(next === "lab" ? "playing" : "prep");
      setHud(world.hud());
      audio.unlock();
      audio.play("start");
    },
    [mapId, quality, selected],
  );

  const openBriefing = useCallback((next: GameMode) => {
    setMode(next);
    setPhase("briefing");
    audio.play("ui");
  }, []);

  const goMenu = useCallback(() => {
    worldRef.current = null;
    tutorialRef.current = null;
    setTutorialIndex(null);
    setPhase("menu");
    setResult(null);
    audio.play("ui");
  }, []);

  const restart = useCallback(() => {
    // Reiniciar dentro del tutorial vuelve a empezar el tutorial, no un Laboratorio suelto.
    if (tutorialRef.current !== null && tutorialRestartRef.current) {
      tutorialRestartRef.current();
      return;
    }
    startRun(mode);
  }, [mode, startRun]);

  const setPaused = useCallback((v: boolean) => {
    const w = worldRef.current;
    if (!w) return;
    w.paused = v;
    setPhase(v ? "paused" : w.phase);
    audio.play("pause");
  }, []);

  const togglePause = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    if (phase === "paused") setPaused(false);
    else if (phase === "playing" || phase === "prep") setPaused(true);
  }, [phase, setPaused]);

  /* --------------------------- colocación táctil -------------------------- */

  const refreshVerdict = useCallback(
    (target: Target | null) => {
      const w = worldRef.current;
      if (!w) {
        setInteraction((prev) => ({ ...prev, hover: null, ok: false, reason: "" }));
        return;
      }
      const cell = target ? targetCell(target) : activeMapRef.current.lair;
    const hit = target
      ? w.trapsAt(cell.gx, cell.gz, target.surface, target.side, target.surface === "wall" ? target.index : 0)
      : null;
      if (!selected) {
        setInteraction((prev) => ({ ...prev, hover: target, ok: false, reason: "Elige una trampa en la barra", trapUid: hit?.uid ?? null, trapDef: hit?.def ?? null }));
        return;
      }
      if (w.mode !== "lab" && !unlockedSet.has(selected)) {
        setInteraction((prev) => ({ ...prev, hover: target, ok: false, reason: "Trampa bloqueada", trapUid: hit?.uid ?? null, trapDef: hit?.def ?? null }));
        return;
      }
      const verdict = w.validate(target ?? cellTargetSafe(w, surface));
      setInteraction((prev) => ({
        ...prev,
        hover: target,
        ok: verdict.ok,
        reason: verdict.reason,
        trapUid: hit?.uid ?? null,
        trapDef: hit?.def ?? null,
      }));
    },
    [selected, surface, unlockedSet],
  );

  const placeAt = useCallback(
    (target: Target) => {
      const w = worldRef.current;
      if (!w || !selected) return;
      const out = w.place(target, selected);
      if (!out.ok) showBanner(out.reason, "bad");
      else showBanner(`${TRAPS[selected].name} armada`, "good");
      refreshVerdict(target);
      setHud(w.hud());
    },
    [refreshVerdict, selected, showBanner],
  );

  const removeAt = useCallback(
    (target: Target) => {
      const w = worldRef.current;
      if (!w) return;
      if (w.phase !== "prep" && w.mode !== "lab") {
        showBanner("Solo puedes retirar en la preparacion", "bad");
        return;
      }
      const out = w.remove(target);
      showBanner(out.reason, out.ok ? "good" : "bad");
      refreshVerdict(target);
      setHud(w.hud());
    },
    [refreshVerdict, showBanner],
  );

  /**
   * Retira la trampa de la casilla apuntada. Si no hay ninguna apuntada, el
   * botón no se queda mudo: explica qué falta para poder usarlo.
   */
  const removeHovered = useCallback(() => {
    const target = padConnectedRef.current && padTargetRef.current ? padTargetRef.current : interactionRef.current.hover;
    if (!target) {
      showBanner(
        padConnectedRef.current
          ? "Mueve el cursor del mando sobre una trampa"
          : "Apunta primero una casilla con una trampa",
        "bad",
      );
      return;
    }
    removeAt(target);
  }, [removeAt, showBanner]);

  const fireTrap = useCallback(
    (uid: number) => {
      const w = worldRef.current;
      if (!w) return;
      const out = w.fireTrap(uid);
      if (!out.ok) showBanner(out.reason, "bad");
    },
    [showBanner],
  );

  const fireNearest = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    const out = w.fireNearest();
    if (!out.ok) showBanner(out.reason, "bad");
  }, [showBanner]);

  const tapTarget = useCallback(
    (target: Target, coarse: boolean) => {
      const w = worldRef.current;
      if (!w) return;
      const current = interactionRef.current;
      if (!selected) {
        if (current.trapUid !== null) fireTrap(current.trapUid);
        return;
      }
      if (coarse) {
        if (sameTarget(current.pending, target)) {
          placeAt(target);
          setInteraction((prev) => ({ ...prev, pending: null }));
        } else {
          setInteraction((prev) => ({ ...prev, pending: target }));
          refreshVerdict(target);
          audio.play("ui");
        }
        return;
      }
      placeAt(target);
    },
    [fireTrap, placeAt, refreshVerdict, selected],
  );

  const interactionRef = useRef(interaction);
  interactionRef.current = interaction;

  const clearPending = useCallback(() => {
    setInteraction((prev) => ({ ...prev, pending: null }));
  }, []);

  const cancelPlacement = useCallback(() => {
    setSelected(null);
    if (worldRef.current) worldRef.current.pendingDef = null;
    setInteraction((prev) => ({ ...prev, pending: null, ok: false, reason: "Elige una trampa en la barra" }));
  }, []);

  const selectTrap = useCallback(
    (id: TrapId | null) => {
      setSelected(id);
      const w = worldRef.current;
      if (w) w.pendingDef = id;
      if (id) {
        setSurface(TRAPS[id].surface);
        padSurface.current = TRAPS[id].surface;
        audio.play("ui");
      }
      refreshVerdict(interactionRef.current.hover);
    },
    [refreshVerdict],
  );

  const pickSurface = useCallback(
    (next: SurfaceKind) => {
      setSurface(next);
      padSurface.current = next;
      audio.play("ui");
      const w = worldRef.current;
      if (selected && TRAPS[selected].surface !== next) {
        const first = (Object.values(TRAPS) as Array<(typeof TRAPS)[TrapId]>).find((t) => t.surface === next && (worldRef.current?.mode === "lab" || unlockedSet.has(t.id)));
        if (first) {
          setSelected(first.id);
          if (w) w.pendingDef = first.id;
        } else {
          setSelected(null);
          if (w) w.pendingDef = null;
        }
      }
      refreshVerdict(interactionRef.current.hover);
    },
    [refreshVerdict, selected, unlockedSet],
  );

  const cycleTrap = useCallback(
    (dir: number) => {
      const list = (Object.values(TRAPS) as Array<(typeof TRAPS)[TrapId]>).filter((t) => t.surface === surface && (worldRef.current?.mode === "lab" || unlockedSet.has(t.id)));
      if (list.length === 0) return;
      const idx = list.findIndex((t) => t.id === selected);
      const next = list[(idx + dir + list.length) % list.length];
      setSelected(next.id);
      const w = worldRef.current;
      if (w) w.pendingDef = next.id;
      refreshVerdict(interactionRef.current.hover);
    },
    [refreshVerdict, selected, surface, unlockedSet],
  );

  /* ------------------------------- mando ------------------------------- */

  const padCell = useCallback(
    (gx: number, gz: number, side: WallSide, surface: SurfaceKind): Target => {
      if (surface === "wall") {
        return side === "back" ? wallTarget("back", gx) : wallTarget(side, gz);
      }
      return cellTarget(gx, gz, surface);
    },
    [],
  );

  /** Ciclo de superficie para el mando: suelo -> pared -> techo -> suelo. */
  const nextSurface = useCallback((dir: number): SurfaceKind => {
    const order: SurfaceKind[] = ["floor", "wall", "ceiling"];
    const idx = order.indexOf(padSurface.current);
    const next = order[(idx + dir + order.length) % order.length];
    return next;
  }, []);

  const applyPadCursor = useCallback(
    (gx: number, gz: number) => {
      const surface = padSurface.current;
      const target = padCell(gx, gz, padSide.current, surface);
      lastInputWasPad.current = true;
      padCursorRef.current = { gx, gz };
      padTargetRef.current = target;
      setPadTarget(target);
    },
    [padCell],
  );

  const pad = useGamepad({
    home: activeMapRef.current.lair,
    onMove: (x, y) => {
      padMove.current.x = x;
      padMove.current.y = y;
      if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) lastInputWasPad.current = true;
    },
    onCursor: applyPadCursor,
    onWallSide: (side) => {
      padSide.current = side;
      applyPadCursor(padCursorRef.current.gx, padCursorRef.current.gz);
    },
    onConnectChange: (connected, id) => {
      setPadConnected(connected);
      padConnectedRef.current = connected;
      if (connected) {
        padRef.current = { ...padRef.current, connected: true, id };
        applyPadCursor(padRef.current.gx, padRef.current.gz);
        showBanner(`Mando conectado: ${id.slice(0, 22)}`, "good");
      } else {
        padMove.current = { x: 0, y: 0 };
        setPadTarget(null);
      }
    },
    onAction: (action: PadAction) => {
      lastInputWasPad.current = true;
      switch (action) {
        case "place": {
          const t = padTargetRef.current;
          if (t) placeAt(t);
          break;
        }
        case "cancel": {
          const t = padTargetRef.current;
          if (t) {
            const w = worldRef.current;
            if (w && (w.mode === "lab" || w.phase === "prep")) removeAt(t);
            else cancelPlacement();
          }
          break;
        }
        case "cycle":
          cycleTrap(1);
          break;
        case "cycleBack":
          cycleTrap(-1);
          break;
        case "fire":
          fireNearest();
          break;
        case "surfaceNext":
          pickSurface(nextSurface(1));
          break;
        case "surfacePrev":
          pickSurface(nextSurface(-1));
          break;
        case "trails":
          patchSettings({ trails: !settingsRef.current.trails });
          break;
        case "pause":
          togglePause();
          break;
        default:
          break;
      }
    },
  });

  padRef.current = pad;

  /* ------------------------------- tutorial ------------------------------ */

  const tutorialSnapshot = useCallback((w: World): TutorialSnapshot => {
    return snapshotOf(w, {
      moved: tutorialMovedRef.current,
      selected: selectedRef.current,
      paused: phaseRef.current === "paused",
    });
  }, []);

  const markTutorialDone = useCallback(() => {
    setProgress((prev) => {
      if (prev.tutorialDone) return prev;
      const next = { ...prev, tutorialDone: true };
      saveProgress(next);
      return next;
    });
  }, []);

  /** Entra en un paso: guarda la instantánea de partida y prepara el terreno. */
  const enterTutorialStep = useCallback(
    (index: number, earned: boolean) => {
      const clamped = Math.max(0, Math.min(TUTORIAL_LAST, index));
      const step = tutorialStep(clamped);
      tutorialRef.current = clamped;
      setTutorialIndex(clamped);
      if (step.suggest) selectTrap(step.suggest);
      const w = worldRef.current;
      tutorialStartRef.current = w ? tutorialSnapshot(w) : null;
      tutorialSpawnRef.current = 0;
      if (earned) {
        audio.play("coin", 0.8);
        showBanner("¡Paso completado!", "good");
      }
      if (clamped === TUTORIAL_LAST) markTutorialDone();
    },
    [markTutorialDone, selectTrap, showBanner, tutorialSnapshot],
  );
  tutorialEnterRef.current = enterTutorialStep;

  /** Abre el tutorial en el Salón, con reglas de Laboratorio: sin reloj ni daño. */
  const startTutorial = useCallback(() => {
    const world = new World({
      mode: "lab",
      quality,
      reducedMotion: reduced.current,
      mapId: "salon",
      emit: (ev) => eventRef.current(ev),
    });
    world.paused = false;
    world.pendingDef = selectedRef.current;
    worldRef.current = world;
    tutorialMovedRef.current = 0;
    tutorialLastPosRef.current = { x: world.mouse.x, z: world.mouse.z };
    setMode("lab");
    setResult(null);
    setInteraction({ hover: null, ok: false, reason: "", pending: null, trapUid: null, trapDef: null });
    setPhase("playing");
    setHud(world.hud());
    audio.unlock();
    audio.play("start");
    enterTutorialStep(0, false);
  }, [enterTutorialStep, quality]);
  tutorialRestartRef.current = startTutorial;

  /** «Continuar» en pasos informativos y «Saltar» en los demás. */
  const tutorialNext = useCallback(() => {
    const current = tutorialRef.current;
    if (current === null) return;
    audio.play("ui");
    enterTutorialStep(current + 1, false);
  }, [enterTutorialStep]);

  /* ------------------------------ laboratorio ---------------------------- */

  const labSpawn = useCallback(
    (type: Parameters<World["spawnTest"]>[0], entry: number, count = 1) => {
      const w = worldRef.current;
      if (!w) return;
      const n = Math.max(1, Math.min(6, Math.round(count)));
      for (let i = 0; i < n; i++) w.spawnTest(type, (entry + i) % 3);
    },
    [],
  );

  const labReset = useCallback(() => {
    worldRef.current?.resetRoom();
  }, []);

  const clearCats = useCallback(() => {
    worldRef.current?.clearCats();
  }, []);

  const beginNow = useCallback(() => {
    worldRef.current?.beginNow();
  }, []);

  /* -------------------------------- ajustes ------------------------------ */

  /** Elige la sala de la próxima partida y la recuerda entre sesiones. */
  const pickMap = useCallback((next: MapId) => {
    setMapId(next);
    setSettings((prev) => ({ ...prev, mapId: next }));
    audio.play("ui");
  }, []);

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyQuality = useCallback((q: QualityId) => {
    setQuality(q);
    setSettings((prev) => ({ ...prev, quality: q, autoQuality: false }));
    worldRef.current?.setQuality(q);
  }, []);

  /* ------------------------------ teclas/loops ---------------------------- */

  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true;
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      // Nunca se intercepta Tab: bloquearlo encerraría al teclado y haría
      // inalcanzables el HUD y la barra de trampas.
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) && phase !== "menu") e.preventDefault();
      keys.current[k] = true;

      // Si el foco está en un control, su propio manejador ya responde a
      // Enter/Espacio: no se duplica la acción desde el atajo global.
      const focusIsControl =
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body &&
        ["BUTTON", "A", "SELECT", "INPUT"].includes(document.activeElement.tagName);

      if (phase === "menu" || phase === "briefing" || phase === "over") {
        if (k === "enter" && !focusIsControl) {
          if (phase === "menu") openBriefing("survival");
          else if (phase === "over") restart();
          else startRun(mode);
        }
        return;
      }
      if (k === "escape" || k === "p") {
        togglePause();
        return;
      }
      if (phase === "paused") return;
      if (k === "1") pickSurface("floor");
      else if (k === "2") pickSurface("wall");
      else if (k === "3") pickSurface("ceiling");
      else if (k === "e") cycleTrap(1);
      else if (k === "q") cycleTrap(-1);
      else if (k === " " && !focusIsControl) fireNearest();
      else if (k === "enter" && !focusIsControl) {
        const hov = interactionRef.current.hover;
        if (hov) placeAt(hov);
      } else if (k === "x") {
        const hov = interactionRef.current.hover;
        if (hov) removeAt(hov);
      } else if (k === "c") cancelPlacement();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    const blur = () => {
      keys.current = {};
      joy.current = { x: 0, y: 0, active: false };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [cancelPlacement, cycleTrap, fireNearest, mode, openBriefing, pickSurface, placeAt, phase, removeAt, restart, startRun, togglePause]);

  // Pausa automática al cambiar de pestaña (la simulación ya limita el delta).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        const w = worldRef.current;
        if (w && (w.phase === "playing" || w.phase === "prep")) {
          w.paused = true;
          setPhase("paused");
        }
        audio.stopMusic();
      } else if (settingsRef.current.music && phase !== "over") {
        audio.startMusic();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  // HUD a ~8 Hz + control automático de calidad.
  useEffect(() => {
    if (phase !== "playing" && phase !== "prep" && phase !== "paused") return;
    const id = window.setInterval(() => {
      const w = worldRef.current;
      if (!w) return;
      // Sincroniza el fin de la preparación con el estado de React (baja frecuencia).
      if (w.phase === "playing" && phaseRef.current === "prep") setPhase("playing");
      if (w.phase === "prep" && phaseRef.current === "playing") setPhase("prep");
      setHud(w.hud());

      const ti = tutorialRef.current;
      if (ti !== null) {
        // Distancia caminada; se ignoran saltos grandes (empujones, reinicios).
        const last = tutorialLastPosRef.current;
        const step = Math.hypot(w.mouse.x - last.x, w.mouse.z - last.z);
        if (step < 3) tutorialMovedRef.current += step;
        tutorialLastPosRef.current = { x: w.mouse.x, z: w.mouse.z };

        const now = snapshotOf(w, {
          moved: tutorialMovedRef.current,
          selected: selectedRef.current,
          paused: phaseRef.current === "paused",
        });
        const def = tutorialStep(ti);
        // Gatos de práctica: siempre hay uno en sala mientras el paso lo pida.
        if (def.spawnCats && !w.paused && now.catsLive === 0 && performance.now() - tutorialSpawnRef.current > 2500) {
          tutorialSpawnRef.current = performance.now();
          w.spawnTest("common", 0);
        }
        if (stepComplete(ti, now, tutorialStartRef.current ?? now)) tutorialEnterRef.current?.(ti + 1, true);
      }

      if (settingsRef.current.autoQuality) {
        if (w.fps < 42) lowFps.current += 1;
        else if (w.fps > 55) lowFps.current = Math.max(0, lowFps.current - 1);
        if (lowFps.current > 16) {
          lowFps.current = 0;
          const order: QualityId[] = ["high", "medium", "low"];
          const idx = order.indexOf(qualityRef.current);
          if (idx < order.length - 1) {
            const next = order[idx + 1];
            setQuality(next);
            setSettings((prev) => ({ ...prev, quality: next }));
            w.setQuality(next);
            showBanner(`Calidad automatica: ${next.toUpperCase()}`, "gold");
          }
        }
      }
    }, 125);
    return () => window.clearInterval(id);
  }, [phase, showBanner]);

  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Actualiza el veredicto cuando cambia la selección.
  useEffect(() => {
    refreshVerdict(interactionRef.current.hover);
  }, [selected, surface, refreshVerdict]);

  const hoverTarget = useCallback(
    (target: Target | null) => {
      // Con un mando conectado, el cursor del mando manda: el puntero no pisa
      // la casilla seleccionada mientras se juega con los botones.
      if (target && !padConnectedRef.current) {
        lastInputWasPad.current = false;
        refreshVerdict(target);
        return;
      }
      if (target && padTargetRef.current) refreshVerdict(padTargetRef.current);
    },
    [refreshVerdict],
  );

  // El cursor del mando alimenta el mismo veredicto de colocación.
  useEffect(() => {
    if (!padTarget) return;
    refreshVerdict(padTarget);
  }, [padTarget, refreshVerdict]);

  return {
    phase,
    mode,
    hud,
    settings,
    patchSettings,
    progress,
    quality,
    applyQuality,
    surface,
    pickSurface,
    mapId,
    pickMap,
    tutorialIndex,
    startTutorial,
    tutorialNext,
    activeMap: activeMapRef.current,
    selected,
    selectTrap,
    unlocked,
    result,
    banner,
    shake,
    flash,
    worldRef,
    keys,
    joy,
    interaction,
    hoverTarget,
    tapTarget,
    padTarget,
    padConnected,
    padMove,
    placeAt,
    removeAt,
    removeHovered,
    clearPending,
    cancelPlacement,
    fireNearest,
    fireTrap,
    cycleTrap,
    startRun,
    openBriefing,
    goMenu,
    restart,
    togglePause,
    setPaused,
    beginNow,
    labSpawn,
    labReset,
    clearCats,
    storageVolatile: storageIsVolatile(),
    reducedMotion: reduced.current,
  };
}

/** Casilla bajo el inventor, usada cuando no hay nada apuntado. */
function cellTargetSafe(w: World, surface: SurfaceKind): Target {
  return cellTarget(worldToCellGX(w.mouse.x), worldToCellGZ(w.mouse.z), surface);
}

export type Engine = ReturnType<typeof useGameEngine>;
