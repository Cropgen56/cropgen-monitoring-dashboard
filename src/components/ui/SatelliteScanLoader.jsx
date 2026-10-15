import React, { useEffect, useState } from "react";
import { Orbit } from "lucide-react";

/** Step hints per task, rotated while the server has not reported its own progress message. */
const TASKS = {
  map: {
    title: "Loading map",
    steps: [{ icon: "🗺️", label: "Loading Maharashtra boundaries…" }],
  },
  village: {
    title: "Finding village",
    steps: [
      { icon: "📍", label: "Locating village…" },
      { icon: "🗺️", label: "Loading village boundary…" },
    ],
  },
  delineation: {
    title: "AI field detection",
    steps: [
      { icon: "🛰️", label: "Fetching satellite imagery…" },
      { icon: "🧠", label: "Running field detection model…" },
      { icon: "✏️", label: "Tracing field boundaries…" },
      { icon: "🗺️", label: "Building field polygons…" },
    ],
  },
  dates: {
    title: "Finding satellite dates",
    steps: [
      { icon: "🛰️", label: "Searching satellite archive…" },
      { icon: "☁️", label: "Checking cloud cover…" },
      { icon: "📅", label: "Matching dates to fields…" },
    ],
  },
  index: {
    title: "Calculating crop index",
    steps: [
      { icon: "🛰️", label: "Connecting to satellite…" },
      { icon: "📡", label: "Acquiring field coordinates…" },
      { icon: "🌍", label: "Processing spectral bands…" },
      { icon: "🧮", label: "Computing index values…" },
      { icon: "🗺️", label: "Rendering monitoring layer…" },
    ],
  },
  classification: {
    title: "Crop classification",
    steps: [
      { icon: "🛰️", label: "Reading satellite time series…" },
      { icon: "🌱", label: "Analysing crop growth…" },
      { icon: "🧮", label: "Classifying crops…" },
      { icon: "📊", label: "Building village summary…" },
    ],
  },
};

function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The one loading overlay for every long map task. Shows the task, elapsed time and,
 * when the API streams it, the real progress message and percentage; otherwise it
 * rotates step hints. Pointer events pass through, so the map stays usable.
 *
 * @param {{ task?: { kind?: keyof TASKS, message?: string, pct?: number, startedAt?: number } }} props
 */
export default function SatelliteScanLoader({ task }) {
  const kind = TASKS[task?.kind] ? task.kind : "index";
  const { title, steps } = TASKS[kind];
  const [stepIndex, setStepIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const startedAt = task?.startedAt || mountedAt;
  const pct = Number.isFinite(task?.pct) ? Math.min(100, Math.max(0, task.pct)) : null;
  const step = steps[reduceMotion ? 0 : stepIndex % steps.length];
  const label = task?.message || step.label;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (!reduceMotion) setStepIndex((prev) => prev + 1);
    }, 1400);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div
      className={`agri-map-scan absolute inset-0 z-[950] overflow-hidden ${reduceMotion ? "agri-map-scan-reduced" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`${title}: ${label}`}
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

      <div className="absolute left-1/2 top-1/2 z-10 w-[min(90%,460px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-emerald-300/25 bg-[#07160d]/85 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/90">{title}</span>
          <span className="text-[10px] tabular-nums text-emerald-100/60">
            {pct != null && <>{Math.round(pct)}% · </>}
            {formatElapsed(now - startedAt)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-emerald-100">
          <span className="text-sm" aria-hidden>{step.icon}</span>
          <span className="min-w-0 truncate text-[11px] font-medium tracking-wide">{label}</span>
          {!reduceMotion && <span className="h-3 w-[2px] shrink-0 animate-pulse rounded bg-emerald-300" aria-hidden />}
        </div>
        {pct != null ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
            {steps.map((s, idx) => {
              const current = stepIndex % steps.length;
              return (
                <span
                  key={s.label}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                    reduceMotion
                      ? "w-2 bg-white/25"
                      : idx === current
                        ? "w-5 bg-emerald-400"
                        : idx < current
                          ? "w-2 bg-emerald-700"
                          : "w-2 bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
