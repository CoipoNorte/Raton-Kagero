import { useCallback, useEffect, useMemo, useState } from "react";

/* Medida real del contenedor + perfil de dispositivo. No depende sólo de la
   orientación: usa lado menor, altura disponible y puntero grueso. */

export type DeviceProfile = "mobile" | "tablet" | "desktop";
export type LayoutPreset = "mobile-portrait" | "mobile-landscape" | "tablet-portrait" | "tablet-landscape" | "desktop" | "short-landscape";

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutInfo {
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  minSide: number;
  profile: DeviceProfile;
  coarse: boolean;
  shortLandscape: boolean;
  reducedMotion: boolean;
  safe: SafeArea;
  preset: LayoutPreset;
  panel: "sheet" | "rail" | "column";
  hud: "micro" | "compact" | "full";
  showSecondary: boolean;
}

let safeCache: SafeArea | null = null;

function readSafeArea(): SafeArea {
  if (safeCache) return safeCache;
  const fallback: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === "undefined") return fallback;
  try {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;right:0;bottom:0;visibility:hidden;pointer-events:none;" +
      "padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);" +
      "padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const px = (v: string) => Number.parseFloat(v) || 0;
    const area: SafeArea = {
      top: px(cs.paddingTop),
      right: px(cs.paddingRight),
      bottom: px(cs.paddingBottom),
      left: px(cs.paddingLeft),
    };
    document.body.removeChild(probe);
    safeCache = area;
    return area;
  } catch {
    return fallback;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function classify(width: number, height: number): { profile: DeviceProfile; preset: LayoutPreset; short: boolean } {
  const minSide = Math.min(width, height);
  const portrait = height >= width;
  const short = height < 500 && width > height * 1.25;
  const isDesktop = width >= 1200 && minSide >= 620;
  const isMobile = minSide < 600;

  if (isDesktop) return { profile: "desktop", preset: "desktop", short };
  if (isMobile) {
    if (short) return { profile: "mobile", preset: "short-landscape", short };
    return { profile: "mobile", preset: portrait ? "mobile-portrait" : "mobile-landscape", short };
  }
  return { profile: "tablet", preset: portrait ? "tablet-portrait" : "tablet-landscape", short };
}

export function useLayout(target: React.RefObject<HTMLElement | null>): LayoutInfo {
  const [size, setSize] = useState(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 700 : window.innerHeight,
  }));
  const [coarse, setCoarse] = useState(false);
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onCoarse = () => setCoarse(mq.matches);
    const onReduced = () => setReduced(rm.matches);
    onCoarse();
    onReduced();
    mq.addEventListener("change", onCoarse);
    rm.addEventListener("change", onReduced);
    return () => {
      mq.removeEventListener("change", onCoarse);
      rm.removeEventListener("change", onReduced);
    };
  }, []);

  useEffect(() => {
    const node = target.current;
    const measure = () => {
      const rect = node ? node.getBoundingClientRect() : null;
      const w = rect && rect.width > 0 ? rect.width : window.innerWidth;
      const h = rect && rect.height > 0 ? rect.height : window.innerHeight;
      setSize((prev) => (Math.abs(prev.width - w) < 1 && Math.abs(prev.height - h) < 1 ? prev : { width: w, height: h }));
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (node && "ResizeObserver" in window) {
      ro = new ResizeObserver(measure);
      ro.observe(node);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      visual?.removeEventListener("resize", measure);
    };
  }, [target]);

  const safe = useMemo(readSafeArea, []);
  const { profile, preset, short } = useMemo(() => classify(size.width, size.height), [size.width, size.height]);

  const panel: LayoutInfo["panel"] = preset === "desktop" ? "column" : preset === "tablet-landscape" ? "rail" : "sheet";
  const hud: LayoutInfo["hud"] = short || preset === "mobile-landscape" ? "micro" : profile === "mobile" ? "compact" : "full";

  return {
    width: size.width,
    height: size.height,
    orientation: size.height >= size.width ? "portrait" : "landscape",
    minSide: Math.min(size.width, size.height),
    profile,
    coarse,
    shortLandscape: short,
    reducedMotion: reduced,
    safe,
    preset,
    panel,
    hud,
    showSecondary: hud === "full",
  };
}

/** Mide el tamaño real de un nodo (para el Canvas y para el raycasting). */
export function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState({ width: 1, height: 1 });
  const cb = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    setRect((prev) => (Math.abs(prev.width - r.width) < 1 && Math.abs(prev.height - r.height) < 1 ? prev : { width: r.width, height: r.height }));
  }, [ref]);
  useEffect(() => {
    cb();
    const node = ref.current;
    let ro: ResizeObserver | null = null;
    if (node && "ResizeObserver" in window) {
      ro = new ResizeObserver(cb);
      ro.observe(node);
    }
    window.addEventListener("resize", cb);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", cb);
    };
  }, [cb]);
  return rect;
}
