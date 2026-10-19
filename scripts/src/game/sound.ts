/* Sintetizador WebAudio propio. Un único AudioContext para toda la app, creado
   tras un gesto real del usuario. Sin archivos de audio externos. */

export type SfxName =
  | "meow"
  | "meowBig"
  | "boing"
  | "fan"
  | "dart"
  | "punch"
  | "clang"
  | "anvil"
  | "slip"
  | "pop"
  | "splash"
  | "hurt"
  | "combo"
  | "coin"
  | "place"
  | "deny"
  | "ui"
  | "start"
  | "pause"
  | "over"
  | "record"
  | "chain";

interface AudioConfig {
  sound: boolean;
  music: boolean;
  volume: number;
}

type WinAudio = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let config: AudioConfig = { sound: true, music: true, volume: 0.7 };
let timer: number | null = null;
let step = 0;
let nextTime = 0;
let lastPlayed = new Map<string, number>();

export function isReady(): boolean {
  return ctx !== null;
}

export function unlock(): void {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  try {
    const Ctor = window.AudioContext ?? (window as WinAudio).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = config.volume;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = config.sound ? 1 : 0;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = config.music ? 0.34 : 0;
    musicBus.connect(master);

    const len = Math.floor(ctx.sampleRate * 0.6);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function configure(next: Partial<AudioConfig>): void {
  config = { ...config, ...next };
  if (!ctx || !master || !sfxBus || !musicBus) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(config.volume, t, 0.05);
  sfxBus.gain.setTargetAtTime(config.sound ? 1 : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(config.music ? 0.34 : 0, t, 0.08);
}

export function currentConfig(): AudioConfig {
  return { ...config };
}

function tone(opts: {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain?: number;
  delay?: number;
  curve?: "exp" | "lin";
  detune?: number;
}): void {
  if (!ctx || !sfxBus) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(Math.max(20, opts.from), t0);
  if (opts.to && opts.to !== opts.from) {
    if (opts.curve === "lin") osc.frequency.linearRampToValueAtTime(Math.max(20, opts.to), t0 + opts.dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.dur);
  }
  if (opts.detune) osc.detune.value = opts.detune;
  const peak = opts.gain ?? 0.22;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.03);
}

function hiss(opts: { dur: number; gain?: number; freq: number; to?: number; q?: number; delay?: number }): void {
  if (!ctx || !sfxBus || !noise) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(opts.freq, t0);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to), t0 + opts.dur);
  filter.Q.value = opts.q ?? 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.03);
}

/** Dispara un efecto sintetizado. `param` sube de 0 a 1 (intensidad, combo...). */
export function play(name: SfxName, param = 0): void {
  if (!ctx || !config.sound) return;
  const key = name;
  const now = ctx.currentTime;
  const prev = lastPlayed.get(key) ?? -1;
  if (now - prev < 0.035 && name !== "combo") return;
  lastPlayed.set(key, now);
  const p = Math.max(0, Math.min(1, param));

  switch (name) {
    case "meow": {
      tone({ type: "sawtooth", from: 520 - p * 80, to: 190, dur: 0.34, gain: 0.13 });
      tone({ type: "sawtooth", from: 260, to: 96, dur: 0.36, gain: 0.1, detune: 22 });
      hiss({ dur: 0.16, freq: 1400, to: 500, gain: 0.05 });
      break;
    }
    case "meowBig": {
      tone({ type: "sawtooth", from: 230, to: 74, dur: 0.62, gain: 0.19 });
      tone({ type: "square", from: 116, to: 60, dur: 0.66, gain: 0.1, detune: 14 });
      hiss({ dur: 0.4, freq: 700, to: 180, gain: 0.09 });
      break;
    }
    case "boing": {
      tone({ type: "triangle", from: 160, to: 900, dur: 0.16, gain: 0.2 });
      tone({ type: "sine", from: 880, to: 300, dur: 0.2, gain: 0.13, delay: 0.14 });
      break;
    }
    case "fan": {
      hiss({ dur: 0.5, freq: 480, to: 900, gain: 0.16, q: 0.7 });
      tone({ type: "sine", from: 84, to: 60, dur: 0.48, gain: 0.1 });
      break;
    }
    case "dart": {
      tone({ type: "square", from: 1250, to: 460, dur: 0.1, gain: 0.13 });
      hiss({ dur: 0.09, freq: 2600, to: 900, gain: 0.07 });
      break;
    }
    case "punch": {
      tone({ type: "sine", from: 240, to: 60, dur: 0.18, gain: 0.28 });
      hiss({ dur: 0.13, freq: 900, gain: 0.17 });
      break;
    }
    case "clang": {
      tone({ type: "square", from: 1750, to: 1150, dur: 0.13, gain: 0.1 });
      tone({ type: "triangle", from: 640, to: 300, dur: 0.3, gain: 0.13, detune: 30 });
      hiss({ dur: 0.2, freq: 3200, to: 1400, gain: 0.1 });
      break;
    }
    case "anvil": {
      tone({ type: "sine", from: 120, to: 42, dur: 0.36, gain: 0.34 });
      tone({ type: "square", from: 2100, to: 700, dur: 0.16, gain: 0.09 });
      hiss({ dur: 0.3, freq: 2200, to: 320, gain: 0.14 });
      break;
    }
    case "slip": {
      tone({ type: "sine", from: 1500, to: 210, dur: 0.34, gain: 0.14 });
      hiss({ dur: 0.3, freq: 3400, to: 800, gain: 0.08 });
      break;
    }
    case "pop": {
      tone({ type: "square", from: 420 + p * 260, to: 1500, dur: 0.09, gain: 0.18 });
      tone({ type: "triangle", from: 900, to: 240, dur: 0.22, gain: 0.12, delay: 0.07 });
      break;
    }
    case "splash": {
      hiss({ dur: 0.36, freq: 1500, to: 380, gain: 0.16, q: 0.5 });
      tone({ type: "sine", from: 620, to: 180, dur: 0.24, gain: 0.08 });
      break;
    }
    case "hurt": {
      tone({ type: "sawtooth", from: 320, to: 80, dur: 0.4, gain: 0.22 });
      hiss({ dur: 0.26, freq: 700, to: 220, gain: 0.12 });
      break;
    }
    case "combo": {
      const n = Math.round(p * 4);
      const base = 520 * Math.pow(1.185, n);
      for (let i = 0; i <= n; i++) {
        tone({ type: "square", from: base * Math.pow(1.26, i), dur: 0.09, gain: 0.13, delay: i * 0.055 });
      }
      break;
    }
    case "chain": {
      for (let i = 0; i < 4; i++) {
        tone({ type: "square", from: 440 * Math.pow(1.5, i * 0.5), dur: 0.12, gain: 0.14, delay: i * 0.07 });
      }
      hiss({ dur: 0.4, freq: 3200, to: 600, gain: 0.1, delay: 0.26 });
      break;
    }
    case "coin": {
      tone({ type: "square", from: 1050, dur: 0.06, gain: 0.11 });
      tone({ type: "square", from: 1560, dur: 0.11, gain: 0.11, delay: 0.06 });
      break;
    }
    case "place": {
      tone({ type: "square", from: 720, to: 980, dur: 0.07, gain: 0.13 });
      hiss({ dur: 0.07, freq: 2400, gain: 0.05 });
      break;
    }
    case "deny": {
      tone({ type: "square", from: 170, to: 110, dur: 0.18, gain: 0.16 });
      break;
    }
    case "ui": {
      tone({ type: "square", from: 880, to: 1180, dur: 0.05, gain: 0.08 });
      break;
    }
    case "start": {
      const notes = [440, 587, 740, 880];
      notes.forEach((f, i) => tone({ type: "square", from: f, dur: 0.16, gain: 0.15, delay: i * 0.11 }));
      break;
    }
    case "pause": {
      tone({ type: "triangle", from: 620, to: 380, dur: 0.16, gain: 0.13 });
      break;
    }
    case "over": {
      const notes = [523, 440, 349, 262];
      notes.forEach((f, i) => tone({ type: "square", from: f, dur: 0.3, gain: 0.16, delay: i * 0.19 }));
      hiss({ dur: 0.7, freq: 500, to: 120, gain: 0.08, delay: 0.6 });
      break;
    }
    case "record": {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => tone({ type: "square", from: f, dur: 0.2, gain: 0.16, delay: i * 0.1 }));
      break;
    }
  }
}

/* ---------------- Música: bucle retro de mansión ---------------- */

const BASS = [55, 55, 82.41, 0, 65.41, 0, 82.41, 98, 55, 0, 82.41, 65.41, 0, 110, 98, 82.41];
const ARP = [220, 0, 261.63, 329.63, 0, 261.63, 0, 392, 220, 0, 329.63, 0, 392, 440, 0, 329.63];

function scheduleStep(at: number, index: number): void {
  if (!ctx || !musicBus) return;
  const i = index % 16;
  const bass = BASS[i];
  if (bass > 0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(bass, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(g).connect(musicBus);
    osc.start(at);
    osc.stop(at + 0.26);
  }
  const arp = ARP[i];
  if (arp > 0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(arp, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.13, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
    osc.connect(g).connect(musicBus);
    osc.start(at);
    osc.stop(at + 0.16);
  }
  if (noise) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = false;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = i % 4 === 2 ? 5200 : 7400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(i % 4 === 2 ? 0.1 : 0.05, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    src.connect(f).connect(g).connect(musicBus);
    src.start(at);
    src.stop(at + 0.09);
  }
}

export function startMusic(): void {
  if (!ctx || !musicBus || timer !== null) return;
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  timer = window.setInterval(() => {
    if (!ctx) return;
    const spb = 60 / 116 / 4;
    while (nextTime < ctx.currentTime + 0.3) {
      scheduleStep(nextTime, step);
      step += 1;
      nextTime += spb;
    }
  }, 60);
}

export function stopMusic(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

export function musicRunning(): boolean {
  return timer !== null;
}

export function duckMusic(active: boolean): void {
  if (!ctx || !musicBus) return;
  musicBus.gain.setTargetAtTime(active ? 0.06 : config.music ? 0.34 : 0, ctx.currentTime, 0.12);
}

export function suspend(): void {
  if (ctx && ctx.state === "running") void ctx.suspend();
}

export function resume(): void {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function dispose(): void {
  stopMusic();
  lastPlayed = new Map<string, number>();
}
