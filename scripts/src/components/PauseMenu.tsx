import { Home, Info, Play, RotateCcw } from "lucide-react";
import type { GameMode, HudSnapshot, QualityId, Settings, VhsId } from "../game/types";
import type { ShakeId } from "../game/types";

interface PauseMenuProps {
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  quality: QualityId;
  applyQuality: (q: QualityId) => void;
  hud: HudSnapshot;
  mode: GameMode;
  storageVolatile: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; text: string }>;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="rk-label">{label}</span>
      <div className="flex gap-1" role="group" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.id)}
              className={`rk-pixel flex-1 border-2 px-1.5 py-2 text-[8px] uppercase transition-colors ${
                on ? "border-cheese-500 bg-cheese-500 text-moss-950" : "border-moss-700 bg-moss-900 text-moss-500 hover:border-brass-500 hover:text-parch-100"
              }`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
      {hint ? <span className="text-[10px] leading-tight text-moss-500">{hint}</span> : null}
    </div>
  );
}

function Toggle({ label, on, onChange, hint }: { label: string; on: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex items-center gap-2 border-2 px-2 py-2 text-left transition-colors ${
        on ? "border-toxic-500 bg-toxic-500/12" : "border-moss-700 bg-moss-900"
      }`}
    >
      <span className={`h-4 w-8 shrink-0 border-2 border-moss-950 p-[2px] ${on ? "bg-toxic-500" : "bg-moss-700"}`}>
        <span className={`block h-full w-[12px] bg-moss-950 transition-transform ${on ? "translate-x-[12px]" : ""}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-bold text-parch-100">{label}</span>
        {hint ? <span className="block text-[10px] leading-tight text-moss-500">{hint}</span> : null}
      </span>
    </button>
  );
}

export function PauseMenu({ settings, patch, quality, applyQuality, hud, mode, storageVolatile, onResume, onRestart, onMenu }: PauseMenuProps) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-moss-950/78 p-2" role="dialog" aria-modal="true" aria-label="Menú de pausa">
      <div className="rk-panel rk-panel-lit rk-scroll max-h-full w-full max-w-[620px] overflow-y-auto p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="rk-title text-2xl sm:text-3xl">Pausa tecnica</h2>
            <p className="mt-1 text-[11px] text-moss-500">
              {mode === "survival" ? "Supervivencia rapida" : "Laboratorio de trampas"} · oleada {String(hud.wave).padStart(2, "0")} · {hud.defeated} gatos
              expulsados
            </p>
          </div>
          <button type="button" className="rk-btn" onClick={onResume} aria-label="Continuar la partida">
            <Play className="h-5 w-5" />
            Seguir
          </button>
        </div>

        <div className="mt-3 grid gap-1.5 border-y-2 border-moss-700 py-2 sm:grid-cols-4">
          {[
            ["Puntos", hud.score.toLocaleString("es-CL")],
            ["Quesera", `${hud.lairHp}/${hud.lairMax}`],
            ["Combo max", `x${hud.chainBest}`],
            ["Queso", String(hud.cheese)],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="rk-label">{k}</span>
              <span className="rk-pixel text-[12px] text-cheese-400">{v}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5">
            <span className="rk-title text-sm text-crt-400">Audio</span>
            <Toggle label="Efectos" on={settings.sound} onChange={(v) => patch({ sound: v })} hint="Sintetizador WebAudio propio" />
            <Toggle label="Musica" on={settings.music} onChange={(v) => patch({ music: v })} hint="Bucle retro de mansion" />
            <div className="flex flex-col gap-1">
              <label className="rk-label" htmlFor="vol">
                Volumen {Math.round(settings.volume * 100)}%
              </label>
              <input
                id="vol"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                onChange={(e) => patch({ volume: Number(e.target.value) / 100 })}
                className="h-2 w-full appearance-none bg-moss-700 accent-cheese-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="rk-title text-sm text-crt-400">Render</span>
            <Segmented<QualityId>
              label="Calidad grafica"
              value={settings.autoQuality ? quality : settings.quality}
              options={[
                { id: "low", text: "Bajo" },
                { id: "medium", text: "Medio" },
                { id: "high", text: "Alto" },
              ]}
              onChange={(q) => applyQuality(q)}
              hint={settings.autoQuality ? "Ajuste automatico activo: baja solo si caen los FPS." : "Manual: el automtico esta apagado."}
            />
            <Toggle
              label="Ajuste automatico"
              on={settings.autoQuality}
              onChange={(v) => patch({ autoQuality: v })}
              hint="Baja DPR, sombras y particulas si el dispositivo sufre"
            />
          </div>

          <div className="flex flex-col gap-2.5 sm:col-span-2">
            <span className="rk-title text-sm text-crt-400">Accesibilidad y VHS</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Segmented<ShakeId>
                label="Sacudida de camara"
                value={settings.shake}
                options={[
                  { id: "off", text: "Off" },
                  { id: "low", text: "Suave" },
                  { id: "full", text: "Full" },
                ]}
                onChange={(v) => patch({ shake: v })}
              />
              <Segmented<VhsId>
                label="Efectos VHS"
                value={settings.vhs}
                options={[
                  { id: "off", text: "Off" },
                  { id: "low", text: "Suave" },
                  { id: "full", text: "Full" },
                ]}
                onChange={(v) => patch({ vhs: v })}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Flash de dano" on={settings.flashes} onChange={(v) => patch({ flashes: v })} hint="Destello al recibir golpes" />
              <Toggle label="Estelas de trayectoria" on={settings.trails} onChange={(v) => patch({ trails: v })} hint="Flechas de empuje siempre visibles" />
            </div>
            <p className="flex items-start gap-1.5 text-[10px] leading-snug text-moss-500">
              <Info className="mt-[1px] h-3.5 w-3.5 shrink-0" />
              {storageVolatile
                ? "Almacenamiento bloqueado (modo privado): los records se conservan solo durante esta sesion."
                : "Record, quesos y ajustes se guardan en este navegador. `prefers-reduced-motion` reduce sacudidas y flashes automaticamente."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rk-btn rk-btn-toxic flex-1" onClick={onResume}>
            <Play className="h-5 w-5" />
            Continuar
          </button>
          <button type="button" className="rk-btn rk-btn-ghost flex-1" onClick={onRestart}>
            <RotateCcw className="h-5 w-5" />
            Reiniciar
          </button>
          <button type="button" className="rk-btn rk-btn-ghost flex-1" onClick={onMenu}>
            <Home className="h-5 w-5" />
            Menu
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-moss-500">Esc o P reanudan la partida</p>
      </div>
    </div>
  );
}
