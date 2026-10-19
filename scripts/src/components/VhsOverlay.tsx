import { motion } from "framer-motion";

/* Capa VHS/CRT. Puramente decorativa: nunca intercepta punteros. */
export function VhsOverlay({
  level,
  flash,
  reduced,
  qualityLow,
}: {
  level: "off" | "low" | "full";
  flash: number;
  reduced: boolean;
  qualityLow: boolean;
}) {
  if (level === "off") {
    return <FlashLayer flash={flash} reduced={reduced} />;
  }
  const strong = level === "full" && !qualityLow;
  return (
    <>
      <div
        aria-hidden
        className="rk-scanlines pointer-events-none fixed inset-0 z-30"
        style={{ opacity: strong ? 0.42 : 0.24, mixBlendMode: "multiply" }}
      />
      {!reduced ? (
        <div
          aria-hidden
          className="rk-noise pointer-events-none fixed inset-0 z-30"
          style={{ opacity: strong ? 0.1 : 0.05, mixBlendMode: "soft-light" }}
        />
      ) : null}
      {strong && !reduced ? (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
          <div className="rk-tracking absolute inset-x-0" />
        </div>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30"
        style={{ boxShadow: "inset 0 0 18vh rgba(0,0,0,0.45), inset 0 0 5vh rgba(0,0,0,0.28)" }}
      />
      {strong ? (
        <>
          <div aria-hidden className="pointer-events-none fixed inset-y-0 left-0 z-30 w-[3px]" style={{ background: "rgba(255,79,163,0.4)", mixBlendMode: "screen" }} />
          <div aria-hidden className="pointer-events-none fixed inset-y-0 right-0 z-30 w-[3px]" style={{ background: "rgba(87,232,213,0.4)", mixBlendMode: "screen" }} />
        </>
      ) : null}
      <FlashLayer flash={flash} reduced={reduced} />
    </>
  );
}

function FlashLayer({ flash, reduced }: { flash: number; reduced: boolean }) {
  if (reduced || flash === 0) return null;
  return (
    <motion.div
      key={flash}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40"
      style={{ background: "radial-gradient(120% 90% at 50% 55%, rgba(255,79,163,0) 45%, rgba(255,60,120,0.55) 100%)" }}
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  );
}
