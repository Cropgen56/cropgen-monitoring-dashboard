import React, { useEffect, useState } from "react";

const SCAN_STEPS = [
  { icon: "🛰️", label: "Connecting to satellite..." },
  { icon: "📡", label: "Acquiring field coordinates..." },
  { icon: "🌍", label: "Processing spectral bands..." },
  { icon: "🧮", label: "Computing index values..." },
  { icon: "🗺️", label: "Rendering monitoring layer..." },
];

export default function SatelliteScanLoader() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 900);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.min(95, prev + Math.random() * 5));
    }, 350);
    return () => clearInterval(progressTimer);
  }, []);

  return (
    <div className="absolute inset-0 z-[950] flex items-center justify-center bg-[#04110a]/85 backdrop-blur-[2px]">
      <div className="w-[min(92%,560px)] rounded-2xl border border-emerald-400/25 bg-[#07160d]/90 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-center gap-2 text-emerald-100">
          <span className="text-base">{SCAN_STEPS[stepIndex].icon}</span>
          <span className="text-xs font-medium tracking-wide">{SCAN_STEPS[stepIndex].label}</span>
          <span className="h-3 w-[2px] animate-pulse rounded bg-emerald-300" />
        </div>

        <div className="h-[4px] w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {SCAN_STEPS.map((step, idx) => (
            <span
              key={step.label}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === stepIndex
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
