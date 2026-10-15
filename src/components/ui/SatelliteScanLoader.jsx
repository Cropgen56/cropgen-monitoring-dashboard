import React, { useEffect, useState } from "react";
import { Orbit } from "lucide-react";

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
    <div
      className={`agri-map-scan absolute inset-0 z-[950] overflow-hidden ${reduceMotion ? "agri-map-scan-reduced" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="agri-map-scan-grid absolute inset-0" aria-hidden />

      {[
        "left-3 top-3 border-l-2 border-t-2",
        "right-3 top-3 border-r-2 border-t-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((className) => (
        <span key={className} className={`agri-map-scan-corner absolute h-6 w-6 ${className}`} aria-hidden />
      ))}

      <div className="agri-map-scan-sweep absolute inset-0" aria-hidden>
        <div className="agri-map-scan-beam absolute inset-x-0 top-0 h-[2px]" />
        <div className="agri-map-scan-trail absolute inset-x-0 top-0 h-32" />
        <div className="absolute right-[12%] top-0 -translate-y-1/2 rounded-xl border border-emerald-300/40 bg-[#07160d]/90 p-2 text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,.32)]">
          <Orbit className="agri-map-satellite-icon h-5 w-5" />
        </div>
      </div>

      {[
        { top: "26%", left: "18%" },
        { top: "53%", left: "69%" },
        { top: "39%", left: "46%" },
        { top: "72%", left: "31%" },
        { top: "21%", left: "78%" },
      ].map((point, index) => (
        <span
          key={`${point.left}-${point.top}`}
          className={`agri-map-scan-point absolute h-2 w-2 rounded-full bg-emerald-300 ${reduceMotion ? "agri-map-scan-point-reduced" : ""}`}
          style={{ ...point, animationDelay: `${index * 320}ms` }}
          aria-hidden
        />
      ))}

      <div className="absolute left-1/2 top-1/2 z-10 w-[min(90%,460px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-emerald-300/25 bg-[#07160d]/85 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-emerald-100">
          <span className="text-sm" aria-hidden>{SCAN_STEPS[reduceMotion ? 0 : stepIndex].icon}</span>
          <span className="text-[11px] font-medium tracking-wide">
            {SCAN_STEPS[reduceMotion ? 0 : stepIndex].label}
          </span>
          {!reduceMotion && <span className="h-3 w-[2px] animate-pulse rounded bg-emerald-300" aria-hidden />}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
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
