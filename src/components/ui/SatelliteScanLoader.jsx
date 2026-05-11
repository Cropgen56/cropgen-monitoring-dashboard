import React, { useEffect, useState } from "react";

const SCAN_STEPS = [
  { icon: "🛰️", label: "Connecting to satellite…" },
  { icon: "📡", label: "Acquiring field coordinates…" },
  { icon: "🌍", label: "Processing spectral bands…" },
  { icon: "🧮", label: "Computing index values…" },
  { icon: "🗺️", label: "Rendering monitoring layer…" },
];

/**
 * Lightweight overlay: one slow step rotation + CSS indeterminate bar (no high-frequency timers).
 */
export default function SatelliteScanLoader() {
  const [stepIndex, setStepIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 1400);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="absolute inset-0 z-[950] flex items-center justify-center bg-[#04110a]/85 backdrop-blur-[2px]">
      <div className="w-[min(92%,560px)] rounded-2xl border border-emerald-400/25 bg-[#07160d]/90 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-center gap-2 text-emerald-100">
          <span className="text-base" aria-hidden>
            {SCAN_STEPS[stepIndex].icon}
          </span>
          <span className="text-xs font-medium tracking-wide">
            {SCAN_STEPS[reduceMotion ? 0 : stepIndex].label}
          </span>
          {!reduceMotion && (
            <span className="h-3 w-[2px] animate-pulse rounded bg-emerald-300" aria-hidden />
          )}
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          {reduceMotion ? (
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 opacity-90" />
          ) : (
            <div className="agri-loader-indeterminate absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {SCAN_STEPS.map((step, idx) => (
            <span
              key={step.label}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                reduceMotion
                  ? "w-2 bg-white/25"
                  : idx === stepIndex
                    ? "w-5 bg-emerald-400"
                    : idx < stepIndex
                      ? "w-2 bg-emerald-700"
                      : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
