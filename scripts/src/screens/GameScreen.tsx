import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, FlaskConical, Gauge, Info, RotateCcw, Sparkles, Target, Trash2, X, Zap } from "lucide-react";
import { Canvas3D } from "../game/components/Canvas3D";
import { Hud } from "../components/Hud";
import { TrapBar, TrapLegend, TrapIcon } from "../components/TrapBar";
import { TouchControls } from "../components/TouchControls";
import { PauseMenu } from "../components/PauseMenu";
import { TutorialCard } from "../components/TutorialCard";
import { GameOverScreen } from "./GameOverScreen";
import { CATS } from "../game/enemies";
import { TRAPS } from "../game/traps";
import { ROOM_ISO_H, ROOM_ISO_W } from "../game/constants";
import type { CatTypeId, TrapId } from "../game/types";
import type { World } from "../game/simulation";
import type { Engine } from "../hooks/useGameEngine";
import type { LayoutInfo } from "../hooks/useLayout";

/*
 * Encuadres derivados del tamaño real de la sala, no de números fijos: al
 * ampliar la habitación el encuadre se adapta solo y sigue entrando entera.
 * En proyección isométrica la planta ocupa (ancho + fondo) · cos 45° de
 * ancho en pantalla, y la mitad de eso más la altura de pared de alto.
 */
const frame = (padW: number, padH: number) => ({ w: ROOM_ISO_W * padW, h: ROOM_ISO_H * padH });

const VIEW = {
  desktop: frame(1.02, 1.04),
  tabletLandscape: frame(1.0, 0.96),
  rail: frame(0.99, 0.9),
  stacked: frame(0.97, 1.22),
};

function Panel({ title, children, tone = "moss" }: { title: string; children: React.ReactNode; tone?: "moss" | "gold" }) {
  return (
    <section className={`rk-panel p-2.5 ${tone === "gold" ? "rk-panel-lit" : ""}`}>
      <h2 className="rk-title text-[12px] text-crt-400">{title}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function ChainGuide() {
  const chain = ["banana_peel", "glue_patch", "boxing_glove", "anvil"] as const;
  return (
    <div className="flex items-center gap-1">
      {chain.map((id, i) => {
        const t = TRAPS[id];
        return (
          <span key={id} className="flex items-center gap-1">
            <span className="grid h-7 w-7 place-items-center border-2 border-moss-950" style={{ background: t.color, color: "#0b1512" }} title={t.name}>
              <TrapIcon shape={t.shape} className="h-4 w-4" />
            </span>
            {i < chain.length - 1 ? <span className="text-[10px] text-toxic-400">›</span> : null}
          </span>
        );
      })}
      <span className="rk-pixel ml-1 text-[8px] text-cheese-400">x4</span>
    </div>
  );
}

function LabToolbar({ engine, compact = false }: { engine: Engine; compact?: boolean }) {
  const [entry, setEntry] = useState(0);
  // Las entradas cambian con la sala: se leen del mapa activo.
  const entries = engine.activeMap.entries;
  const [cat, setCat] = useState<CatTypeId>("common");
  if (compact) {
    return (
      <div className="rk-panel flex shrink-0 flex-col gap-1 p-1.5">
        <span className="rk-label text-crt-400">Laboratorio libre</span>
        <div className="flex gap-1">
          <select
            aria-label="Tipo de gato de prueba"
            value={cat}
            onChange={(event) => setCat(event.target.value as CatTypeId)}
            className="min-w-0 flex-[2] border border-brass-700 bg-moss-950 px-1.5 py-1.5 text-[11px] text-parch-100"
          >
            {(Object.keys(CATS) as CatTypeId[]).map((id) => <option key={id} value={id}>{CATS[id].name}</option>)}
          </select>
          <select
            aria-label="Entrada de prueba"
            value={entry}
            onChange={(event) => setEntry(Number(event.target.value))}
            className="min-w-0 flex-1 border border-brass-700 bg-moss-950 px-1.5 py-1.5 text-[11px] text-parch-100"
          >
            {entries.map((item, i) => <option key={item.id} value={i}>{item.kind === "door" ? "Puerta" : item.kind === "window" ? "Ventana" : "Conducto"}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          <button type="button" className="rk-btn min-w-0 flex-1 !px-1.5 !py-1.5 text-[11px]" onClick={() => engine.labSpawn(cat, entry)}>Generar</button>
          <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1.5 text-[11px]" onClick={() => engine.labSpawn(cat, entry, 4)}>x4</button>
          <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1.5" onClick={engine.clearCats} aria-label="Quitar todos los gatos de prueba"><X className="h-4 w-4" /></button>
          <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1.5" onClick={engine.labReset} aria-label="Vaciar la habitación de trampas"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  return (
    <Panel title="Laboratorio" tone="gold">
      <div className="grid grid-cols-2 gap-1 @[360px]:grid-cols-3">
        {(Object.keys(CATS) as CatTypeId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => engine.labSpawn(id, entry)}
            className="flex min-w-0 flex-col items-center gap-0.5 border-2 border-moss-700 bg-moss-900 px-1 py-1.5 text-[9px] leading-tight text-parch-300 transition-colors hover:border-toxic-500 hover:text-toxic-400"
            title={CATS[id].blurb}
          >
            <span className="h-3.5 w-3.5 shrink-0 border border-moss-950" style={{ background: CATS[id].color }} />
            <span className="w-full truncate text-center">{CATS[id].name.replace("Gato ", "").replace("Gato", "")}</span>
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {entries.map((e, i) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={entry === i}
            onClick={() => setEntry(i)}
            className={`rk-chip px-1.5 py-1 text-[9px] ${entry === i ? "text-cheese-400" : "text-moss-500 hover:text-parch-100"}`}
          >
            {e.kind === "door" ? "Puerta" : e.kind === "window" ? "Ventana" : "Conducto"}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]" onClick={() => engine.labSpawn("common", entry, 4)}>
          <Sparkles className="h-3.5 w-3.5" />
          Enjambre
        </button>
        <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]" onClick={engine.clearCats}>
          <X className="h-3.5 w-3.5" />
          Sin gatos
        </button>
        <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]" onClick={engine.labReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Vaciar sala
        </button>
      </div>
    </Panel>
  );
}

export function GameScreen({ engine, layout, world }: { engine: Engine; layout: LayoutInfo; world: World | null }) {
  const [contextLost, setContextLost] = useState(false);
  // Reiniciar y salir descartan la partida: se confirman para evitar perderla
  // por un toque accidental en móvil.
  const [confirm, setConfirm] = useState<"restart" | "quit" | null>(null);

  // Escape cierra la confirmación antes de llegar al atajo global de pausa.
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setConfirm(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [confirm]);
  const phase = engine.phase;
  const paused = phase === "paused";
  const interactive = (phase === "prep" || phase === "playing") && !paused;
  const helpers = phase === "prep" || engine.mode === "lab";
  const selected = engine.selected;
  const coarse = layout.coarse;
  const preset = layout.preset;
  // En vertical los controles táctiles van en una franja propia (sin solapes);
  // en apaisado se superponen al Canvas porque no cabe otra fila.
  const overlayControls = preset !== "mobile-portrait" && preset !== "tablet-portrait";
  const showTouch = coarse && (phase === "prep" || phase === "playing");
  const dockTouch = showTouch && !overlayControls;
  const view =
    preset === "desktop" ? VIEW.desktop : preset === "tablet-landscape" ? VIEW.tabletLandscape : preset === "mobile-landscape" || preset === "short-landscape" ? VIEW.rail : VIEW.stacked;

  // En vertical el veredicto de colocación vive en el dock táctil: no se duplica.
  const inTutorial = engine.tutorialIndex !== null;
  const inputKind = engine.padConnected ? "pad" : coarse ? "touch" : "keyboard";
  const tutorialCard = (compact: boolean) =>
    engine.tutorialIndex !== null ? (
      <TutorialCard
        index={engine.tutorialIndex}
        input={inputKind}
        compact={compact}
        onNext={engine.tutorialNext}
        onPlay={() => engine.openBriefing("survival")}
        onMenu={engine.goMenu}
      />
    ) : null;

  const placeNote =
    engine.interaction.hover
      ? { text: `${engine.interaction.ok ? "Colocar" : "No se puede"}: ${engine.interaction.reason}`, ok: engine.interaction.ok }
      : selected
        ? { text: `Apunta una casilla de ${engine.surface === "floor" ? "suelo" : engine.surface === "wall" ? "pared" : "techo"}`, ok: false }
        : null;

  const hudNode = (
    <Hud
      hud={engine.hud}
      mode={engine.mode}
      phase={phase}
      paused={paused}
      sound={engine.settings.sound}
      music={engine.settings.music}
      highScore={engine.progress.highScore}
      variant={layout.hud === "micro" ? "strip" : layout.hud === "compact" ? "compact" : "float"}
      padConnected={engine.padConnected}
      placeNote={dockTouch ? null : placeNote}
      onPause={engine.togglePause}
      onToggleSound={() => engine.patchSettings({ sound: !engine.settings.sound })}
      onToggleMusic={() => engine.patchSettings({ music: !engine.settings.music })}
    />
  );

  const bar = (
    <TrapBar
      surface={engine.surface}
      onSurface={engine.pickSurface}
      selected={selected}
      onSelect={engine.selectTrap}
      unlocked={engine.mode === "lab" ? Object.keys(TRAPS) as TrapId[] : engine.unlocked}
      cheese={engine.hud.cheese}
      totalCheese={engine.progress.totalCheese}
      orientation={layout.panel === "sheet" ? "row" : "column"}
      reduced={layout.reducedMotion}
      onCancel={engine.cancelPlacement}
    />
  );

  const canvasBox = (
    <div className="rk-panel relative min-h-0 overflow-hidden !border-moss-700">
      <Canvas3D
        world={world}
        quality={engine.quality}
        interactive={interactive}
        helpers={helpers}
        surface={engine.surface}
        selectedDef={selected ? TRAPS[selected] : null}
        hover={engine.interaction.hover}
        hoverOk={engine.interaction.ok}
        pending={engine.interaction.pending !== null}
        trails={engine.settings.trails}
        freeCam={engine.mode === "lab" && !coarse}
        padActive={engine.padConnected}
        reducedMotion={layout.reducedMotion}
        view={view}
        shake={engine.shake}
        keys={engine.keys}
        joy={engine.joy}
        padMove={engine.padMove}
        onHover={engine.hoverTarget}
        onTap={engine.tapTarget}
        onContextLost={setContextLost}
      />

      {/* HUD flotante sobre la escena */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{ paddingTop: `max(0.35rem, ${layout.safe.top}px)` }}
      >
        {hudNode}
      </div>

      {/* Bandea de eventos */}
      <AnimatePresence>
        {engine.banner ? (
          <motion.div
            key={engine.banner.id}
            initial={{ opacity: 0, y: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-none absolute left-1/2 top-[86px] z-20 -translate-x-1/2 border-2 px-3 py-1.5 text-center rk-pixel text-[10px] ${
              engine.banner.tone === "bad"
                ? "border-vhs-500 bg-moss-950/90 text-vhs-500"
                : engine.banner.tone === "gold"
                  ? "border-cheese-500 bg-moss-950/90 text-cheese-400"
                  : "border-toxic-500 bg-moss-950/90 text-toxic-400"
            }`}
          >
            {engine.banner.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Cuenta atrás de preparación */}
      {phase === "prep" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex flex-col items-center gap-1.5 px-2">
          <div className="rk-panel flex items-center gap-3 px-3 py-1.5">
            <Target className="h-4 w-4 text-cheese-400" />
            <span className="text-[11px] text-parch-300">
              Prepara la habitacion · <strong className="rk-pixel text-[12px] text-cheese-400">{Math.ceil(engine.hud.prepLeft)}s</strong>
            </span>
            <button type="button" className="rk-btn pointer-events-auto !px-2 !py-1 text-[10px]" onClick={engine.beginNow}>
              Empezar ya
            </button>
          </div>
        </div>
      ) : null}

      {coarse && overlayControls ? (
        <TouchControls
          joy={engine.joy}
          onFire={engine.fireNearest}
          onRemove={engine.removeHovered}
          onCancel={engine.cancelPlacement}
          canCancel={engine.interaction.pending !== null}
          compact={layout.hud === "micro"}
          safe={layout.safe}
          layout="rail"
        />
      ) : null}

      {engine.interaction.pending ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ bottom: overlayControls ? 130 : 12 }}
        >
          <span className="rk-chip px-2 py-1 text-[9px] text-crt-400">Toca de nuevo para confirmar</span>
        </div>
      ) : null}

      {paused ? (
        <PauseMenu
          settings={engine.settings}
          patch={engine.patchSettings}
          quality={engine.quality}
          applyQuality={engine.applyQuality}
          hud={engine.hud}
          mode={engine.mode}
          storageVolatile={engine.storageVolatile}
          onResume={() => engine.setPaused(false)}
          onRestart={engine.restart}
          onMenu={engine.goMenu}
        />
      ) : null}

      {confirm ? (
        <div
          className="absolute inset-0 z-50 grid place-items-center bg-moss-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={confirm === "restart" ? "Confirmar reinicio" : "Confirmar salida"}
        >
          <div className="rk-panel rk-panel-lit max-w-[400px] p-4 text-center">
            <h2 className="rk-title text-lg">{confirm === "restart" ? "¿Reiniciar la partida?" : "¿Salir al menú?"}</h2>
            <p className="mt-2 text-[12px] text-parch-300">
              {confirm === "restart"
                ? "Perderás las trampas colocadas y la puntuación de esta ronda."
                : "Se descartará esta partida. El récord guardado no cambia."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rk-btn flex-1"
                onClick={() => {
                  const action = confirm;
                  setConfirm(null);
                  if (action === "restart") engine.restart();
                  else engine.goMenu();
                }}
              >
                {confirm === "restart" ? "Reiniciar" : "Salir"}
              </button>
              <button type="button" className="rk-btn rk-btn-ghost flex-1" onClick={() => setConfirm(null)} autoFocus>
                Seguir jugando
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {contextLost ? (
        <div className="absolute inset-0 z-50 grid place-items-center bg-moss-950/92 p-4 text-center">
          <div>
            <p className="rk-title text-xl text-vhs-500">Se perdio el contexto WebGL</p>
            <p className="mt-2 text-[12px] text-parch-300">El navegador liberó el acelerador grafico. Recarga para volver a la mansion.</p>
            <button type="button" className="rk-btn mt-3" onClick={() => window.location.reload()}>
              <RotateCcw className="h-5 w-5" />
              Recargar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const status = (
    <div className="flex min-h-0 flex-col gap-1.5 rk-scroll overflow-y-auto">
      {tutorialCard(false)}
      <Panel title={engine.mode === "survival" ? "Objetivo" : "Modo libre"}>
        <p className="text-[11px] leading-snug text-parch-300">
          {engine.mode === "survival"
            ? "Defiende la quesera 90 s. Cada gato que la muerde roba queso y la deja ciega de golpe."
            : "Practica sin reloj: genera gatos, coloca las 16 trampas y estudia los empujes."}
        </p>
        {/* Diagnóstico y contexto de la sala. El contador de trampas vive en el
            HUD (grupo Taller), junto al queso, que es donde se decide gastar. */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
          <span className="rk-chip flex items-center gap-1 px-1.5 py-1.5 text-[11px] text-moss-500">
            <Gauge className="h-3 w-3" /> {engine.hud.fps} fps
          </span>
          <span className="rk-chip flex items-center gap-1 px-1.5 py-1.5 text-[11px] text-cheese-400">
            <Target className="h-3 w-3" /> {engine.activeMap.name}
          </span>
        </div>
      </Panel>

      <Panel title="Cadena modelo">
        <ChainGuide />
        <p className="mt-1.5 text-[10px] leading-snug text-moss-500">
          Mezcla superficies: repetir la misma trampa no suma variedad. Si el inventor esta cerca del golpe, <span className="text-cheese-400">CHEESE BONUS</span>.
        </p>
      </Panel>

      <Panel title="Ultima jugada">
        {engine.hud.lastPlay ? (
          <p className="text-[11px] text-parch-300">
            <span className="rk-pixel text-[11px] text-toxic-400">+{engine.hud.lastPlay.points}</span> · {engine.hud.lastPlay.label} · combo x
            {engine.hud.lastPlay.chain}
          </p>
        ) : (
          <p className="text-[11px] text-moss-500">Sin impactos todavia. Abre con cascara y pegamento.</p>
        )}
      </Panel>

      {inTutorial ? null : engine.mode === "lab" ? <LabToolbar engine={engine} /> : null}

      <Panel title="Ajustes rapidos">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]" onClick={engine.togglePause}>
            Pausa <span className="rk-pixel text-[8px] opacity-70">P</span>
          </button>
          <button
            type="button"
            className={`rk-btn !px-2 !py-1 text-[10px] ${engine.settings.trails ? "" : "rk-btn-ghost"}`}
            onClick={() => engine.patchSettings({ trails: !engine.settings.trails })}
            aria-pressed={engine.settings.trails}
          >
            <Eye className="h-3.5 w-3.5" />
            Estelas
          </button>
          <button
            type="button"
            className={`rk-btn !px-2 !py-1 text-[10px] ${engine.settings.vhs !== "off" ? "" : "rk-btn-ghost"}`}
            onClick={() => engine.patchSettings({ vhs: engine.settings.vhs === "off" ? "full" : engine.settings.vhs === "full" ? "low" : "off" })}
          >
            VHS {engine.settings.vhs === "off" ? "off" : engine.settings.vhs}
          </button>
          <button
            type="button"
            className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]"
            onClick={engine.removeHovered}
            aria-label="Retirar la trampa apuntada"
            title="Retira la trampa apuntada (X). Devuelve el 85% del queso en la preparación."
          >
            <Trash2 className="h-3.5 w-3.5" />
            Retirar
          </button>
          <button
            type="button"
            className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]"
            onClick={() => setConfirm("restart")}
            aria-label="Reiniciar la partida desde el principio"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar
          </button>
          <button
            type="button"
            className="rk-btn rk-btn-ghost !px-2 !py-1 text-[10px]"
            onClick={() => setConfirm("quit")}
            aria-label="Salir al menú principal"
          >
            <X className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
        <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-moss-500">
          <Info className="mt-[1px] h-3 w-3 shrink-0" />
          {coarse ? "Toca una casilla para apuntar y toca de nuevo para colocar." : "Clic para colocar; 1/2/3 cambian de categoria; Espacio dispara la manual."}
        </p>
      </Panel>
    </div>
  );

  const legend = (
    <div className="rk-panel px-2 py-1.5">
      <TrapLegend />
      {engine.hud.lastPlay ? null : (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-moss-500">
          <Zap className="h-3 w-3 text-cheese-500" /> {engine.hud.cheese} quesos disponibles
        </p>
      )}
    </div>
  );

  return (
    <div
      data-testid="game-screen"
      data-traps-live={engine.hud.trapsLive}
      data-cheese={engine.hud.cheese}
      data-prep-left={Math.ceil(engine.hud.prepLeft)}
      data-time-left={Math.ceil(engine.hud.timeLeft)}
      data-pad={engine.padConnected ? `${engine.padTarget?.surface ?? "-"}:${engine.padTarget?.side ?? "-"}:${engine.padTarget?.index ?? "-"}` : "off"}
      className="relative h-full w-full rk-mansion"
      style={{ paddingLeft: layout.safe.left, paddingRight: layout.safe.right }}
    >
      {preset === "desktop" || preset === "tablet-landscape" ? (
        <div
          className="mx-auto grid h-full max-w-[1680px] gap-2 p-2"
          /* La sala es ancha en isométrica: se le cede espacio a la escena y
             los paneles laterales se quedan en lo justo para ser legibles. */
          style={{ gridTemplateColumns: preset === "desktop" ? "minmax(200px,236px) minmax(0,1fr) minmax(264px,310px)" : "minmax(176px,206px) minmax(0,1fr) minmax(240px,286px)" }}
        >
          {status}
          {canvasBox}
          <div className="flex min-h-0 flex-col gap-2">
            {legend}
            <div className="rk-panel min-h-0 flex-1 p-2">{bar}</div>
          </div>
        </div>
      ) : preset === "mobile-landscape" || preset === "short-landscape" ? (
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(200px,246px)] gap-1.5 p-1.5">
          {canvasBox}
          <div className="flex min-h-0 flex-col gap-1.5">
            {inTutorial ? tutorialCard(true) : engine.mode === "lab" ? <LabToolbar engine={engine} compact /> : null}
            <div className="rk-panel min-h-0 flex-1 p-1.5">{bar}</div>
          </div>
        </div>
      ) : (
        <div
          className="grid h-full min-w-0 gap-1.5 p-1.5"
          style={{
            paddingBottom: `max(0.375rem, ${layout.safe.bottom}px)`,
            gridTemplateColumns: "minmax(0,1fr)",
            gridTemplateRows: showTouch ? "minmax(0,1fr) auto auto auto" : "minmax(0,1fr) auto auto",
          }}
        >
          {canvasBox}
          {showTouch ? (
            <TouchControls
              joy={engine.joy}
              onFire={engine.fireNearest}
              onRemove={engine.removeHovered}
              onCancel={engine.cancelPlacement}
              canCancel={engine.interaction.pending !== null}
              compact={layout.hud === "micro"}
              safe={layout.safe}
              layout="dock"
              hint={placeNote ? placeNote.text : undefined}
            />
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
            {inTutorial ? (
              tutorialCard(layout.profile === "mobile")
            ) : engine.mode === "lab" ? (
              <LabToolbar engine={engine} compact={layout.profile === "mobile"} />
            ) : null}
            {bar}
          </div>
        </div>
      )}

      {phase === "over" ? (
        <GameOverScreen
          result={engine.result ?? { mode: engine.mode, score: 0, comboBest: 0, chainBest: 0, cheese: 0, defeated: 0, waves: 1, reason: "quit", lairHp: 0, perfect: false, newRecord: false, rankLabel: "-" }}
          progress={engine.progress}
          unlocked={engine.unlocked}
          mode={engine.mode}
          onRetry={engine.restart}
          onLab={() => engine.startRun("lab")}
          onMenu={engine.goMenu}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
        <span className="rk-chip hidden px-2 py-0.5 text-[8px] text-moss-500 lg:inline-flex">
          <FlaskConical className="mr-1 h-3 w-3" /> Raton-Kagero · {engine.quality}
        </span>
      </div>
    </div>
  );
}


