import React, { useEffect, useMemo, useState } from "react";
import * as turf from "@turf/turf";
import { ChevronDown, ChevronUp, Download, Loader2, ScanLine, Trash2, X } from "lucide-react";
import { MAX_DELINEATION_AREA_KM2 } from "../../hooks/useFieldDelineation";
import { useFieldDelineationContext } from "../../context/FieldDelineationContext";

const ACRES_PER_HA = 2.471053814671738;

const STEP_HINTS = {
  pickVillage: "Click on the map to load that village's boundary.",
  loadingVillage: "Looking up village boundary…",
  village: "Village loaded. Draw an area inside it to detect fields.",
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

const btn = "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition";
const primaryBtn = `${btn} bg-cg-accent text-[#0c2214] hover:brightness-110`;
const secondaryBtn = `${btn} bg-white/5 text-gray-300 hover:bg-white/10`;

/**
 * Map overlay: village lookup (village-boundary API) → draw area → field delineation
 * (boundary-delineation API), plus the list of saved detections. Sits over the map,
 * outside <MapContainer>, so it never steals map clicks.
 */
export default function FieldDelineationPanel() {
  const d = useFieldDelineationContext();
  const { step, village, area, fields, error, runStartedAt, progress, saved, savedFields } = d;
  const [collapsed, setCollapsed] = useState(false);
  const v = village?.properties || {};

  const lastRun = useMemo(() => {
    const feats = fields?.features || [];
    const totalHa = sumHa(feats);
    return { count: feats.length, totalHa, avgHa: feats.length ? totalHa / feats.length : 0 };
  }, [fields]);

  const savedHa = useMemo(() => sumHa(savedFields.features), [savedFields]);
  const villageKm2 = useMemo(() => (village ? turf.area(village) / 1e6 : 0), [village]);
  const canDetectWholeVillage = villageKm2 > 0 && villageKm2 <= MAX_DELINEATION_AREA_KM2;
  const active = step !== "idle";

  return (
    <div className="absolute right-3 top-3 z-[1000] w-[min(300px,calc(100%-1.5rem))] rounded-lg border border-yellow-400/30 bg-[#0d1117]/92 text-gray-200 shadow-lg shadow-black/40 backdrop-blur-sm">
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
          {village && (
            <div className="rounded-md bg-black/30 px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold text-sky-300">{v.name || "Village"}</span>
              {v.taluka && <> · {v.taluka}</>}
              {v.district && <> · {v.district}</>}
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
              Search a place or pick a village, then draw an area to detect field boundaries from satellite
              imagery.
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
            {(step === "idle" || step === "village") && (
              <button type="button" className={step === "idle" ? primaryBtn : secondaryBtn} onClick={d.start}>
                {step === "idle" ? "Pick village on map" : "Pick another village"}
              </button>
            )}
            {step === "village" && (
              <button type="button" className={primaryBtn} onClick={d.beginDraw}>
                Draw area
              </button>
            )}
            {(step === "village" || step === "draw" || step === "done") && canDetectWholeVillage && (
              <button type="button" className={step === "village" ? secondaryBtn : primaryBtn} onClick={d.detectWholeVillage}>
                Detect whole village
              </button>
            )}
            {step === "done" && (
              <button type="button" className={primaryBtn} onClick={d.redraw}>
                Draw another area
              </button>
            )}
            {active && step !== "village" && step !== "pickVillage" && (
              <button type="button" className={secondaryBtn} onClick={d.start}>
                Change village
              </button>
            )}
            {active && (
              <button type="button" className={`${secondaryBtn} inline-flex items-center gap-1`} onClick={d.reset}>
                <X className="h-3 w-3" />
                {step === "running" ? "Cancel" : "Close"}
              </button>
            )}
          </div>

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
                {saved.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded bg-black/25 px-2 py-1 text-[11px]">
                    <span className="min-w-0 flex-1 truncate">
                      {r.village?.name || "Area"}
                      <span className="text-gray-500">
                        {" "}
                        · {r.fields.features.length} fields · {sumHa(r.fields.features).toFixed(1)} ha
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => d.removeSaved(r.id)}
                      className="text-gray-500 hover:text-red-200"
                      aria-label={`Remove detection for ${r.village?.name || "area"}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
