import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace } from "three";
import type { PopWord } from "./types";
import { POP_WORDS } from "./constants";

/* Texturas procedurales de baja resolución con dithering Bayer 4x4.
   Se crean una sola vez y se comparten durante toda la sesión. */

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function makeTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function ditherFill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: readonly string[],
  seedShift = 0,
) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (x + seedShift) & 3;
      const level = BAYER[idx + ((y & 3) << 2)] / 16;
      const c = Math.min(colors.length - 1, Math.floor(level * colors.length));
      const hex = colors[c];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const o = (y * w + x) << 2;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const cache = new Map<string, CanvasTexture>();
function cached(key: string, build: () => CanvasTexture): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const made = build();
  cache.set(key, made);
  return made;
}

/**
 * Devuelve una copia de la textura repetida según el tamaño real de la
 * superficie, para que la baldosa mida siempre lo mismo en unidades de
 * mundo. Evita el papel pintado estirado y que cada pared tenga una escala
 * distinta. La copia comparte la imagen, así que no cuesta memoria extra.
 */
export function tiled(base: CanvasTexture, worldWidth: number, worldHeight: number, tile: number): CanvasTexture {
  const tex = base.clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(worldWidth / tile)), Math.max(1, Math.round(worldHeight / tile)));
  return tex;
}

export function wallpaperTexture(): CanvasTexture {
  return cached("wallpaper", () =>
    makeTexture(
      32,
      32,
      (ctx, w, h) => {
        ditherFill(ctx, w, h, ["#1c3a2c", "#1c3a2c", "#204232", "#244a37"]);
        ctx.fillStyle = "#2a5741";
        for (let x = 0; x < w; x += 8) ctx.fillRect(x, 0, 2, h);
        ctx.fillStyle = "#d8a24a";
        for (let y = 4; y < h; y += 16) {
          for (let x = 0; x < w; x += 16) {
            ctx.fillRect(x + 4, y, 3, 3);
            ctx.fillRect(x + 3, y + 1, 5, 1);
          }
        }
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, h - 3, w, 3);
      },
    ),
  );
}

export function floorTexture(): CanvasTexture {
  return cached("floor", () =>
    makeTexture(
      32,
      32,
      (ctx, w, h) => {
        ditherFill(ctx, w, h, ["#6b4520", "#79502a", "#8a5c31", "#96683a"]);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, w, 1);
        ctx.fillRect(0, 16, w, 1);
        ctx.fillRect(10, 0, 1, 16);
        ctx.fillRect(24, 16, 1, 16);
      },
    ),
  );
}

export function cheeseTexture(): CanvasTexture {
  return cached("cheese", () =>
    makeTexture(32, 32, (ctx, w, h) => {
      ditherFill(ctx, w, h, ["#ffcf3f", "#ffcf3f", "#f0b52c", "#e8a01f"]);
      ctx.fillStyle = "#b87b13";
      const holes: number[][] = [
        [6, 7, 3],
        [20, 5, 2],
        [13, 18, 4],
        [25, 22, 3],
        [4, 24, 2],
      ];
      for (const [x, y, r] of holes) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  );
}

export function gridTexture(): CanvasTexture {
  return cached("grid", () =>
    makeTexture(32, 32, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(198,249,106,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = "rgba(87,232,213,0.14)";
      ctx.fillRect(2, 2, w - 4, h - 4);
    }),
  );
}

export function starTexture(): CanvasTexture {
  return cached("star", () =>
    makeTexture(24, 24, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 10 : 4.2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0a1310";
      ctx.stroke();
    }),
  );
}

export function wordTexture(word: PopWord): CanvasTexture {
  return cached(`word:${word}`, () =>
    makeTexture(256, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const text = POP_WORDS[word] ?? word;
      const size = text.length > 9 ? 24 : 32;
      ctx.font = `${size}px "Press Start 2P", "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#0a1310";
      ctx.strokeText(text, w / 2, h / 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, w / 2, h / 2);
    }),
  );
}
