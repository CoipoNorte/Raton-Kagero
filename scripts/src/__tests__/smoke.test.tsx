import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { JSDOM } from "jsdom";

/* Prueba de humo: monta el árbol completo de componentes con un DOM
   real para detectar errores de importación, ciclos y referencias a
   módulos que no existen, sin abrir un navegador. */

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

beforeAll(() => {
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).navigator = dom.window.navigator;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).SVGElement = dom.window.SVGElement;
  (globalThis as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;
  (globalThis as any).CanvasRenderingContext2D = dom.window.CanvasRenderingContext2D;
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
  (globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  (globalThis as any).matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  (globalThis as any).AudioContext = undefined;
  (globalThis as any).localStorage = dom.window.localStorage;
});

afterAll(() => {
  dom.window.close();
});

describe("humo: modulo completo de la app", () => {
  it("importa App sin errores de modulo", async () => {
    const mod = await import("../App");
    expect(typeof mod.default).toBe("function");
  });

  it("importa todas las pantallas y componentes", async () => {
    const screens = await Promise.all([
      import("../screens/StartScreen"),
      import("../screens/GameScreen"),
      import("../screens/GameOverScreen"),
    ]);
    const comps = await Promise.all([
      import("../components/Hud"),
      import("../components/TrapBar"),
      import("../components/PauseMenu"),
      import("../components/TouchControls"),
      import("../components/VhsOverlay"),
    ]);
    for (const s of screens) {
      expect(Object.values(s).some((v) => typeof v === "function")).toBe(true);
    }
    for (const c of comps) {
      expect(Object.values(c).some((v) => typeof v === "function")).toBe(true);
    }
  });

  it("importa el mundo, entidades y componentes 3D", async () => {
    const mods = await Promise.all([
      import("../game/simulation"),
      import("../game/components/Canvas3D"),
      import("../game/components/Room"),
      import("../game/components/Fx"),
      import("../game/components/TrapPreview"),
      import("../game/entities/MouseInventor"),
      import("../game/entities/ZombieCat"),
      import("../game/entities/TrapEntity"),
      import("../game/logic"),
      import("../game/traps"),
      import("../game/enemies"),
      import("../game/constants"),
      import("../game/storage"),
      import("../game/sound"),
      import("../game/random"),
      import("../game/textures"),
    ]);
    expect(mods.length).toBe(16);
  });

  it("importa los hooks", async () => {
    const [layout, engine] = await Promise.all([
      import("../hooks/useLayout"),
      import("../hooks/useGameEngine"),
    ]);
    expect(typeof layout.useLayout).toBe("function");
    expect(typeof layout.useElementSize).toBe("function");
    expect(typeof engine.useGameEngine).toBe("function");
  });
});
