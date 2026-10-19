import { useMemo, useRef } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useGameEngine } from "./hooks/useGameEngine";
import { useLayout } from "./hooks/useLayout";
import { StartScreen, BriefingScreen } from "./screens/StartScreen";
import { GameScreen } from "./screens/GameScreen";

import { VhsOverlay } from "./components/VhsOverlay";

function probeWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")) as unknown;
    return !!gl;
  } catch {
    return false;
  }
}

function WebGLFallback({ canReload }: { canReload: boolean }) {
  return (
    <div className="rk-mansion grid h-full w-full place-items-center p-4">
      <div className="rk-panel rk-panel-lit max-w-[560px] p-5 text-center">
        <AlertTriangle className="mx-auto h-9 w-9 text-vhs-500" />
        <h1 className="rk-title mt-3 text-2xl">Este navegador no puede abrir WebGL</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-parch-300">
          <strong className="text-cheese-400">Raton: Zombie Cat Trap</strong> necesita aceleracion 3D. Suele fallar en modo privado estricto, con el
          acelerador desactivado o en navegadores muy antiguos.
        </p>
        <ul className="mx-auto mt-3 max-w-[42ch] space-y-1 text-left text-[12px] text-moss-500">
          <li>· Activa “Aceleracion de hardware” en los ajustes del navegador.</li>
          <li>· Prueba con Chrome, Edge, Firefox o Safari recientes.</li>
          <li>· En el movil, evita el modo “ahorro de datos / ahorro de bateria” extremo.</li>
        </ul>
        {canReload ? (
          <button type="button" className="rk-btn mt-4" onClick={() => window.location.reload()}>
            <RotateCcw className="h-5 w-5" />
            Reintentar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const layout = useLayout(root);
  const engine = useGameEngine();
  const supported = useMemo(probeWebGL, []);

  const world = engine.worldRef.current;

  if (!supported) return <WebGLFallback canReload={typeof window !== "undefined"} />;

  const flashBoost = engine.flash;

  return (
    <div
      ref={root}
      className="relative h-[100dvh] w-full overflow-hidden rk-mansion rk-flicker"
    >
      {engine.phase === "menu" ? (
        <StartScreen
          progress={engine.progress}
          settings={engine.settings}
          patch={engine.patchSettings}
          onMode={engine.openBriefing}
          layout={layout}
          unlocked={engine.unlocked}
          storageVolatile={engine.storageVolatile}
          mapId={engine.mapId}
          onPickMap={engine.pickMap}
          onTutorial={engine.startTutorial}
        />
      ) : engine.phase === "briefing" ? (
        <BriefingScreen mode={engine.mode} map={engine.activeMap} onBack={engine.goMenu} onStart={() => engine.startRun(engine.mode)} layout={layout} />
      ) : (
        <GameScreen engine={engine} layout={layout} world={world} />
      )}

      <VhsOverlay level={engine.settings.vhs} flash={flashBoost} reduced={layout.reducedMotion} qualityLow={engine.quality === "low"} />
    </div>
  );
}
