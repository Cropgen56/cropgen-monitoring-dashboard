import React, { useEffect, useMemo, useRef, useState } from "react";
import * as turf from "@turf/turf";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Layers,
  Loader2,
  ScanLine,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { MAX_DELINEATION_AREA_KM2 } from "../../hooks/useFieldDelineation";
import { useFieldDelineationContext } from "../../context/FieldDelineationContext";
import { useAgriPlatform } from "../../context/AgriPlatformContext";
import { toDatasetDistrict, toOutlineDistrict } from "../../config/districtNames";

const ACRES_PER_HA = 2.471053814671738;

const STEP_HINTS = {
  loadingVillage: "Looking up village boundary…",
  village: "Village selected. Show all farms or draw a smaller area.",
  draw: `Click points inside the blue village outline; click the first point to finish. Max ${MAX_DELINEATION_AREA_KM2} km².`,
};


function ElapsedSeconds({ since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{Math.max(0, Math.round((now - since) / 1000))}s</>;
}

function downloadGeoJson(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sumHa(features) {
  return features.reduce((sum, f) => sum + (Number(f.properties?.area_ha) || 0), 0);
}

/**
 * Whole-taluka detection: every village in the taluka chosen in the top bar, one model
 * run per village, with live progress, stop and resume.
 */
function TalukaDetection({ district, taluka, run, onStart, onStop, onDismiss }) {
  const [showFailed, setShowFailed] = useState(false);
  const isThisTaluka = run && run.taluka === taluka && run.district === district;
  if (!taluka && !run) {
    return (
      <p className="rounded-md border border-dashed border-white/10 px-2.5 py-2 text-[10px] text-gray-500">
        Pick a taluka (and no village) in the top bar to detect fields in every village of that taluka.
      </p>
    );
  }
  const finished = run ? run.done + run.skipped : 0;
  const pct = run?.total ? (finished / run.total) * 100 : 0;
  const remaining = run ? run.total - finished : 0;

  return (
    <div className="space-y-2 rounded-md border border-sky-400/20 bg-sky-400/[0.04] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-200">
        <Layers className="h-3.5 w-3.5" />
        <span className="min-w-0 flex-1 truncate">Whole taluka · {run?.taluka || taluka}</span>
        {run && !run.running && (
          <button type="button" onClick={onDismiss} className="text-gray-500 hover:text-white" aria-label="Dismiss taluka run">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {run && (
        <>
          {run.error ? (
            <p className="text-[10px] text-red-200">{run.error}</p>
          ) : run.listing ? (
            <p className="flex items-center gap-1.5 text-[10px] text-gray-300">
              <Loader2 className="h-3 w-3 animate-spin" /> Listing villages…
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-[10px] text-gray-300">
                <span>
                  <strong className="text-white">{finished}</strong> / {run.total} villages
                  {run.skipped > 0 && <span className="text-gray-500"> ({run.skipped} already saved)</span>}
                </span>
                {run.running && (
                  <span className="tabular-nums text-gray-500">
                    <ElapsedSeconds since={run.startedAt} />
                  </span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-sky-300 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-400">
                {run.fields.toLocaleString("en-IN")} fields found this run
                {run.failed.length > 0 && (
                  <>
                    {" · "}
                    <button type="button" onClick={() => setShowFailed((v) => !v)} className="font-semibold text-red-200 hover:underline">
                      {run.failed.length} failed
                    </button>
                  </>
                )}
              </p>
              {run.noBoundary > 0 && (
                <p className="text-[10px] text-gray-500">
                  {run.noBoundary} list {run.noBoundary === 1 ? "entry" : "entries"} without a village boundary skipped
                </p>
              )}
              {run.running && run.current.length > 0 && (
                <ul className="space-y-1">
                  {run.current.map((c) => (
                    <li key={c.name} className="space-y-0.5">
                      <p className="flex items-center gap-1.5 text-[10px] text-yellow-200">
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        <span className="font-semibold">{c.name}</span>
                        <span className="min-w-0 flex-1 truncate text-gray-400">{c.message}</span>
                        <span className="tabular-nums text-gray-500">{Math.round(c.pct || 0)}%</span>
                      </p>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-yellow-300/80 transition-[width] duration-500" style={{ width: `${c.pct || 2}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {showFailed && run.failed.length > 0 && (
                <ul className="custom-scrollbar max-h-24 space-y-0.5 overflow-y-auto text-[10px] text-red-200/90">
                  {run.failed.map((f) => (
                    <li key={f.name} className="truncate" title={f.error}>
                      {f.name} — {f.error}
                    </li>
                  ))}
                </ul>
              )}
              {!run.running && (
                <p className="text-[10px] text-gray-400">
                  {run.stopped ? "Stopped." : "Finished."}
                  {remaining > 0 || run.failed.length > 0 ? " Run again to continue with the remaining villages." : ""}
                </p>
              )}
            </>
          )}
        </>
      )}

      <div className="flex gap-1.5">
        {run?.running ? (
          <button type="button" className={`${secondaryBtn} inline-flex items-center gap-1`} onClick={onStop}>
            <Square className="h-3 w-3" /> Stop
          </button>
        ) : (
          taluka && (
            <button type="button" className={primaryBtn} onClick={onStart}>
              {isThisTaluka && (remaining > 0 || run.failed.length > 0)
                ? "Continue taluka"
                : `Detect all villages in ${taluka}`}
            </button>
          )
        )}
      </div>
      {!run && (
        <p className="text-[10px] leading-relaxed text-gray-500">
          Runs field detection village by village and saves each result as it finishes. A taluka can take a long
          time; you can stop and continue later.
        </p>
      )}
    </div>
  );
}

const btn = "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition";
const primaryBtn = `${btn} bg-cg-accent text-[#0c2214] hover:brightness-110`;
const secondaryBtn = `${btn} bg-white/5 text-gray-300 hover:bg-white/10`;

/**
 * Map overlay: district → village selection → whole-village or drawn-area
 * field delineation, plus the list of saved detections. Sits over the map,
 * outside <MapContainer>, so it never steals map clicks.
 */
export default function FieldDelineationPanel({ placement = "map" }) {
  const d = useFieldDelineationContext();
  const { reset: resetDelineation } = d;
  const { district, taluka } = useAgriPlatform();
  const { step, village, area, fields, error, runStartedAt, progress, saved, savedFields } = d;
  const [collapsed, setCollapsed] = useState(false);
  const previousDistrictRef = useRef(district);
  const v = village?.properties || {};

  // Leaving the district drops the selected village — unless the district changed
  // *because* a village there was picked (top-bar picker or map click).
  useEffect(() => {
    if (previousDistrictRef.current === district) return;
    previousDistrictRef.current = district;
    if (village && toOutlineDistrict(village.properties?.district) !== district) resetDelineation();
  }, [district, village, resetDelineation]);

  const lastRun = useMemo(() => {
    const feats = fields?.features || [];
    const totalHa = sumHa(feats);
    return { count: feats.length, totalHa, avgHa: feats.length ? totalHa / feats.length : 0 };
  }, [fields]);

  const savedHa = useMemo(() => sumHa(savedFields.features), [savedFields]);
  const villageKm2 = useMemo(() => (village ? turf.area(village) / 1e6 : 0), [village]);
  const active = step !== "idle";
  const panelClassName = placement === "inline"
    ? "w-full rounded-xl border border-yellow-400/25 bg-[#0d1117] text-gray-200 shadow-xl shadow-black/20"
    : "absolute right-3 top-3 z-[1000] w-[min(300px,calc(100%-1.5rem))] rounded-lg border border-yellow-400/30 bg-[#0d1117]/92 text-gray-200 shadow-lg shadow-black/40 backdrop-blur-sm";

  return (
    <div className={panelClassName}>
      <div className="flex items-center gap-2 px-3 py-2">
        <ScanLine className="h-4 w-4 shrink-0 text-yellow-300" />
        <p className="flex-1 text-[12px] font-bold text-white">AI field detection</p>
        {savedFields.features.length > 0 && (
          <span className="rounded bg-yellow-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-200">
            {savedFields.features.length} fields
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand field detection" : "Collapse field detection"}
          className="text-gray-400 hover:text-white"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="custom-scrollbar max-h-[min(48vh,420px)] space-y-2.5 overflow-y-auto border-t border-white/10 px-3 pb-3 pt-2.5">
          {!village && step !== "loadingVillage" && (
            <p className="text-[11px] text-gray-400">
              Choose a district, taluka and village in the top bar, or click a village on the map.
            </p>
          )}

          {village && (
            <div className="rounded-md bg-black/30 px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold text-sky-300">{v.name || "Village"}</span>
              {v.taluka && <> · {v.taluka}</>}
              {v.district && <> · {toOutlineDistrict(v.district)}</>}
              <span className="block text-[10px] text-gray-500">Village area: {villageKm2.toFixed(2)} km²</span>
              {area?.properties?.area_km2 != null && (
                <span className="block text-[10px] text-gray-500">
                  Selected area: {area.properties.area_km2.toFixed(2)} km²
                </span>
              )}
            </div>
          )}

          {!active && (
            <p className="text-[11px] text-gray-400">
              Select a district on the map, choose a village, then show its farms or draw a smaller area.
            </p>
          )}

          {STEP_HINTS[step] && (
            <p className="flex items-start gap-2 text-[11px] text-gray-300">
              {step === "loadingVillage" && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
              {STEP_HINTS[step]}
            </p>
          )}

          {step === "running" && runStartedAt && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-[11px] text-yellow-200">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="min-w-0 flex-1 truncate">{progress?.message || "Starting field detection…"}</span>
                <span className="tabular-nums text-gray-400">
                  <ElapsedSeconds since={runStartedAt} />
                </span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-yellow-300 transition-[width] duration-500"
                  style={{ width: `${progress?.pct ?? 2}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-100">
              {error}
            </p>
          )}

          {step === "done" && (
            <p className="text-[11px] text-gray-300">
              {lastRun.count === 0 ? (
                "No field parcels detected in this area."
              ) : (
                <>
                  Found <strong className="text-yellow-200">{lastRun.count}</strong> fields ·{" "}
                  {lastRun.totalHa.toFixed(1)} ha · avg {(lastRun.avgHa * ACRES_PER_HA).toFixed(2)} ac
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {step === "village" && (
              <button type="button" className={primaryBtn} onClick={d.beginDraw}>
                Draw a smaller area
              </button>
            )}
            {(step === "village" || step === "done") && (
              <button type="button" className={primaryBtn} onClick={d.detectWholeVillage}>
                Show all farms in village
              </button>
            )}
            {step === "village" && villageKm2 > MAX_DELINEATION_AREA_KM2 && (
              <p className="w-full text-[10px] text-sky-200/90">
                This village is larger than {MAX_DELINEATION_AREA_KM2} km², so it is detected in about{" "}
                {Math.ceil(villageKm2 / (MAX_DELINEATION_AREA_KM2 * 0.95))}+ tiles of up to {MAX_DELINEATION_AREA_KM2} km²
                and the results joined. This takes longer than a small area.
              </p>
            )}
            {step === "done" && (
              <button type="button" className={primaryBtn} onClick={d.redraw}>
                Draw another area
              </button>
            )}
            {active && (
              <button
                type="button"
                className={`${secondaryBtn} inline-flex items-center gap-1`}
                onClick={d.reset}
              >
                <X className="h-3 w-3" />
                {step === "running" ? "Cancel" : "Close"}
              </button>
            )}
          </div>

          {/* A selected village is detected on its own; the whole-taluka option only shows
              without one (a taluka run already in progress stays visible so it can be stopped). */}
          {(!village || d.talukaRun?.running) && (
            <TalukaDetection
              district={toDatasetDistrict(district)}
              taluka={taluka}
              run={d.talukaRun}
              onStart={() => d.detectTaluka({ district: toDatasetDistrict(district), taluka })}
              onStop={d.stopTaluka}
              onDismiss={d.dismissTaluka}
            />
          )}

          {saved.length > 0 && (
            <div className="border-t border-white/10 pt-2">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Saved · {savedHa.toFixed(1)} ha
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                    onClick={() => downloadGeoJson(savedFields, "delineated-fields.geojson")}
                    title="Download all as GeoJSON"
                    aria-label="Download all saved fields as GeoJSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-200"
                    onClick={d.clearSaved}
                    title="Clear all saved detections"
                    aria-label="Clear all saved detections"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <ul className="space-y-1">
                {saved.map((r) => {
                  const open = String(fields?.features?.[0]?.properties?.detectionId ?? "") === String(r.id);
                  return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${
                      open ? "bg-yellow-400/10 ring-1 ring-yellow-400/40" : "bg-black/25"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => d.openSaved(r.id)}
                      disabled={step === "running" || step === "loadingVillage"}
                      title={`Open ${r.village?.name || "this detection"}: select the village and its fields`}
                      className="min-w-0 flex-1 truncate text-left hover:text-yellow-100"
                    >
                      {r.village?.name || "Area"}
                      <span className="text-gray-500">
                        {r.village?.taluka ? ` · ${r.village.taluka}` : ""} · {r.fields.features.length} fields ·{" "}
                        {sumHa(r.fields.features).toFixed(1)} ha
                        {r.wholeVillage === false ? " · drawn area" : ""}
                        {r.tiles > 1 ? ` · ${r.tiles} tiles` : ""}
                      </span>
                      {r.incomplete && (
                        <span className="text-amber-200" title="Some tiles failed; open the village and run it again to retry">
                          {" "}
                          · {r.failedTiles} tiles missing
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => d.removeSaved(r.id)}
                      className="text-gray-500 hover:text-red-200"
                      aria-label={`Remove detection for ${r.village?.name || "area"}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                  );
                })}
              </ul>
              <p className="mt-1.5 text-[10px] text-gray-500">Click a saved village to open it for classification.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
