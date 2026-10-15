import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Loader2, MapPin, Ruler, Satellite, Sprout } from "lucide-react";
import FieldDelineationPanel from "../components/delineation/FieldDelineationPanel";
import MaharashtraMap from "../components/map/MaharashtraMap";
import {
  cropIndexFeatureBounds,
  cropIndexFeatureKey,
  cropIndexGeometryPathInBounds,
  cropIndexImageSource,
  cropIndexResultsMappedToFeatures,
} from "../utils/cropIndexImages";
import { calculatePolygonIndex, fetchPolygonAvailability } from "../api/cropMonitoringApi";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import { todayInputValue } from "../utils/dateRangePresets";
import VillageAnalysis from "../components/monitoring/VillageAnalysis";
import { CHANGE_BANDS, HEALTH_BANDS, analyseVillage, pickCompareDate } from "../utils/villageAnalysis";
import { toOutlineDistrict } from "../config/districtNames";

/** Analysis runs only need per-farm stats; a tiny image keeps their responses small. */
const ANALYSIS_IMAGE_PX = 32;
const NO_ANALYSIS = { loading: false, done: 0, total: 0, responses: null, error: "" };

const DEFAULT_RANGE_DAYS = 60;
const CLEAR_SKY_MAX_CLOUD = 20;

function daysAgoInputValue(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return todayInputValue(d);
}

function formatImageDate(value) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function cloudTone(cloud) {
  if (!Number.isFinite(cloud)) return "text-gray-400";
  if (cloud <= 10) return "text-lime-300";
  if (cloud <= 30) return "text-amber-200";
  return "text-red-300";
}

/** Newest clear date that covers every field; else newest full-coverage date; else the least cloudy. */
function pickDefaultDate(items, totalFeatures) {
  const full = items.filter((i) => i.feature_count >= totalFeatures);
  const clear = full.filter((i) => Number(i.cloud_cover) <= CLEAR_SKY_MAX_CLOUD);
  if (clear.length) return clear[0].date;
  if (full.length) return full[0].date;
  return [...items].sort((a, b) => Number(a.cloud_cover) - Number(b.cloud_cover))[0]?.date || "";
}

function FieldMetric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0c1218] p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500">
        {React.createElement(icon, { className: "h-3.5 w-3.5 text-lime-300/80" })}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function legendEntries(legend) {
  if (Array.isArray(legend)) {
    return legend.map((entry, index) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return { label: String(entry), color: "", key: `legend-${index}` };
      }
      if (!entry || typeof entry !== "object") return null;
      return {
        label: entry.label ??
          entry.name ??
          entry.description ??
          [entry.min ?? entry.minimum, entry.max ?? entry.maximum].filter((value) => value != null).join(" – ") ??
          `Class ${index + 1}`,
        color: entry.color ?? entry.colour ?? entry.hex ?? entry.fill ?? "",
        key: String(entry.value ?? entry.label ?? entry.name ?? index),
      };
    }).filter(Boolean);
  }

  if (legend && typeof legend === "object") {
    return Object.entries(legend).map(([label, value]) => {
      if (typeof value === "string") {
        return { label, color: value, key: label };
      }
      if (!value || typeof value !== "object") {
        return { label: `${label}: ${String(value)}`, color: "", key: label };
      }
      return {
        label: value.label ??
          value.name ??
          [value.min ?? value.minimum, value.max ?? value.maximum].filter((item) => item != null).join(" – ") ??
          label,
        color: value.color ?? value.colour ?? value.hex ?? value.fill ?? "",
        key: label,
      };
    });
  }

  return [];
}

function SelectedFarmPanel({ selected, result, indexName, indexDate, panelRef, insight }) {
  const feature = selected?.feature;
  const properties = feature?.properties || {};
  const bounds = cropIndexFeatureBounds(feature);
  const image = cropIndexImageSource(result?.image_base64, result?.image_format);
  const polygonPath = bounds ? cropIndexGeometryPathInBounds(feature, bounds) : "";
  const area = Number(properties.area_ha);
  const perimeter = Number(properties.perimeter_m);
  const location = [
    selected?.village?.name || properties.village,
    selected?.village?.taluka || properties.taluka,
    selected?.village?.district || properties.district,
  ].filter(Boolean).join(" · ");
  const legend = legendEntries(result?.legend);

  return (
    <section
      ref={panelRef}
      className="scroll-mt-20 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg"
      aria-live="polite"
    >
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300/70">
          Selected farm
        </p>
        <h2 className="mt-0.5 text-sm font-bold text-white">
          {selected ? `Field #${properties.field_id ?? "—"}` : "Farm details"}
        </h2>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
            <MapPin className="h-3 w-3 text-lime-300" /> {location}
          </p>
        )}
      </div>

      {!selected ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs font-semibold text-gray-300">Select a farm on the map</p>
          <p className="mt-1 text-[11px] text-gray-500">
            The farm polygon, index image, and field information will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(240px,.9fr)]">
          <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#080d12]">
            {image && polygonPath ? (
              <svg
                viewBox="0 0 1000 1000"
                role="img"
                aria-label={`Index image clipped to field ${properties.field_id ?? ""}`}
                className="max-h-[420px] min-h-56 w-full"
              >
                <defs>
                  <clipPath id="selected-farm-index-clip" clipPathUnits="userSpaceOnUse">
                    <path d={polygonPath} fillRule="evenodd" clipRule="evenodd" />
                  </clipPath>
                </defs>
                <image
                  href={image}
                  x="0"
                  y="0"
                  width="1000"
                  height="1000"
                  preserveAspectRatio="none"
                  clipPath="url(#selected-farm-index-clip)"
                />
                <path
                  d={polygonPath}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : (
              <div className="grid min-h-56 place-items-center px-5 text-center text-[11px] text-gray-500">
                {result
                  ? "Image returned, but this farm boundary could not be drawn."
                  : "No index image is available for this farm yet. Calculate the index to load its image."}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FieldMetric
                icon={Ruler}
                label="Area"
                value={Number.isFinite(area) ? `${area.toFixed(2)} ha` : "—"}
              />
              <FieldMetric
                icon={Ruler}
                label="Perimeter"
                value={Number.isFinite(perimeter) ? `${Math.round(perimeter).toLocaleString("en-IN")} m` : "—"}
              />
              <FieldMetric
                icon={Sprout}
                label="Index"
                value={result?.index_name || indexName || "—"}
              />
              <FieldMetric
                icon={CalendarDays}
                label="Image date"
                value={result?.date || indexDate || "—"}
              />
              {insight?.health && (
                <FieldMetric icon={Sprout} label="Crop health" value={`${insight.health.label} · ${insight.score}/100`} />
              )}
              {Number.isFinite(insight?.changePct) && (
                <FieldMetric
                  icon={Sprout}
                  label="NDVI change"
                  value={`${insight.changePct > 0 ? "+" : ""}${insight.changePct.toFixed(0)}% · ${insight.change?.label ?? ""}`}
                />
              )}
            </div>
            {insight?.alerts?.length > 0 && (
              <div className="space-y-1">
                {insight.alerts.map((a) => (
                  <p
                    key={a.type}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                      a.severity === "high" ? "bg-red-500/15 text-red-200" : "bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    ⚠ {a.type} · {a.detail}
                  </p>
                ))}
              </div>
            )}
            {result?.legend && (
              <div className="rounded-lg border border-white/[0.06] bg-[#0c1218] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {result?.index_name || indexName || "Index"} legend
                </p>
                {legend.length ? (
                  <ul className="space-y-2">
                    {legend.map((entry) => (
                      <li key={entry.key} className="flex items-center gap-2 text-[11px] text-gray-300">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm border border-white/15"
                          style={entry.color ? { backgroundColor: entry.color } : undefined}
                        />
                        <span>{entry.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-gray-500">No legend values were returned for this field.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function CropMonitoringPage() {
  const { fields, saved, village } = useFieldDelineationContext();
  const [range, setRange] = useState(() => ({ start: daysAgoInputValue(DEFAULT_RANGE_DAYS), end: todayInputValue() }));
  const [availability, setAvailability] = useState({ loading: false, items: null, total: 0, error: "" });
  const [calculationDate, setCalculationDate] = useState("");
  const [indexName, setIndexName] = useState("NDVI");
  const [calculation, setCalculation] = useState({ loading: false, response: null, error: "" });
  const [selectedField, setSelectedField] = useState(null);
  const [focusFeature, setFocusFeature] = useState(null);
  const [compareDate, setCompareDate] = useState("");
  const [analysisRun, setAnalysisRun] = useState(NO_ANALYSIS);
  const [colorMode, setColorMode] = useState("image");
  const calculationController = useRef(null);
  const availabilityController = useRef(null);
  const selectedPanelRef = useRef(null);

  // The latest detection run lives only in memory; after a reload (or re-picking the
  // village) fall back to the saved detections for the selected village.
  const savedVillageFields = useMemo(() => {
    const v = village?.properties;
    if (!v) return null;
    const features = saved
      .filter((r) => r.village?.name === v.name && r.village?.taluka === v.taluka && r.village?.district === v.district)
      .flatMap((r) => r.fields?.features || []);
    return features.length ? { type: "FeatureCollection", features } : null;
  }, [saved, village]);
  const polygons = fields?.type === "FeatureCollection" && fields.features?.length ? fields : savedVillageFields;
  const polygonCount = polygons?.features?.length || 0;
  // The multi API reports index_name and date once per response; copy them onto each
  // field's result so per-field consumers (map hover cards, farm panel) have them.
  const indexResults = useMemo(() => {
    const response = calculation.response;
    if (!Array.isArray(response?.results)) return [];
    return response.results.map((r) => ({ index_name: response.index_name, date: response.date, ...r }));
  }, [calculation.response]);
  const mappedIndexResults = useMemo(
    () => cropIndexResultsMappedToFeatures(indexResults, polygons?.features || []),
    [indexResults, polygons?.features],
  );
  const selectedMappedResult = selectedField
    ? mappedIndexResults.find(
        ({ feature }) => cropIndexFeatureKey(feature) === cropIndexFeatureKey(selectedField.feature),
      )?.result
    : null;

  useEffect(() => () => {
    calculationController.current?.abort();
    availabilityController.current?.abort();
  }, []);

  // Dates and results belong to one set of polygons; start over when the farms change.
  useEffect(() => {
    availabilityController.current?.abort();
    calculationController.current?.abort();
    setAvailability({ loading: false, items: null, total: 0, error: "" });
    setCalculation({ loading: false, response: null, error: "" });
    setCalculationDate("");
    setCompareDate("");
    setAnalysisRun(NO_ANALYSIS);
    setColorMode("image");
  }, [polygons]);

  // Map clicks scroll to the farm panel; alert-list clicks scroll to the map, which zooms to the farm.
  const scrollTargetRef = useRef("panel");
  useEffect(() => {
    if (!selectedField) return;
    if (scrollTargetRef.current === "map") {
      document.querySelector(".leaflet-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollTargetRef.current = "panel";
  }, [selectedField]);

  const resetCalculation = () => {
    calculationController.current?.abort();
    setCalculation({ loading: false, response: null, error: "" });
    setAnalysisRun(NO_ANALYSIS);
    setColorMode("image");
  };

  const chooseDate = (date, items = availability.items, total = availability.total) => {
    setCalculationDate(date);
    setCompareDate(pickCompareDate(items, total, date));
  };

  const findAvailableDates = async () => {
    if (!polygons || availability.loading) return;
    availabilityController.current?.abort();
    const controller = new AbortController();
    availabilityController.current = controller;
    resetCalculation();
    setCalculationDate("");
    setAvailability({ loading: true, items: null, total: 0, error: "" });
    try {
      const response = await fetchPolygonAvailability({
        geojson: polygons,
        startDate: range.start,
        endDate: range.end,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const items = (Array.isArray(response?.items) ? response.items : [])
        .filter((i) => i?.date)
        .sort((a, b) => b.date.localeCompare(a.date));
      const total = Number(response?.total_features) || polygonCount;
      setAvailability({ loading: false, items, total, error: "" });
      chooseDate(pickDefaultDate(items, total), items, total);
    } catch (error) {
      if (!controller.signal.aborted) {
        setAvailability({ loading: false, items: null, total: 0, error: error.message || "Could not load available dates." });
      }
    }
  };

  const selectedAvailability = availability.items?.find((i) => i.date === calculationDate) || null;

  /**
   * One click runs the map index (images) plus the village analysis: NDVI on the image date,
   * NDVI on the compare date and NDMI for moisture. Runs that equal the map index are reused.
   */
  const calculateIndex = async () => {
    if (!polygons || !calculationDate || !indexName || calculation.loading) return;
    calculationController.current?.abort();
    const controller = new AbortController();
    calculationController.current = controller;
    const signal = controller.signal;
    const run = (index, date, size) =>
      calculatePolygonIndex({ geojson: polygons, date, indexName: index, signal, size });

    const main = run(indexName, calculationDate);
    const jobs = {
      ndvi: indexName === "NDVI" ? main : run("NDVI", calculationDate, ANALYSIS_IMAGE_PX),
      ndmi: indexName === "NDMI" ? main : run("NDMI", calculationDate, ANALYSIS_IMAGE_PX),
      ...(compareDate ? { ndviPrev: run("NDVI", compareDate, ANALYSIS_IMAGE_PX) } : {}),
    };
    const distinct = new Set([main, ...Object.values(jobs)]);
    let done = 0;
    const tick = () => {
      done += 1;
      if (!signal.aborted) setAnalysisRun((r) => ({ ...r, done }));
    };
    distinct.forEach((p) => p.then(tick, tick));

    setCalculation({ loading: true, response: null, error: "" });
    setAnalysisRun({ loading: true, done: 0, total: distinct.size, responses: null, error: "" });

    const [mainResult, ...settled] = await Promise.allSettled([main, ...Object.values(jobs)]);
    if (signal.aborted) return;
    if (mainResult.status === "fulfilled") {
      setCalculation({ loading: false, response: mainResult.value, error: "" });
    } else {
      setCalculation({ loading: false, response: null, error: mainResult.reason?.message || "Index calculation failed." });
    }
    const responses = {};
    const failures = [];
    Object.keys(jobs).forEach((key, i) => {
      if (settled[i].status === "fulfilled") responses[key] = settled[i].value;
      else failures.push(`${key === "ndviPrev" ? "compare-date NDVI" : key.toUpperCase()}: ${settled[i].reason?.message || "failed"}`);
    });
    setAnalysisRun({
      loading: false,
      done: distinct.size,
      total: distinct.size,
      responses: responses.ndvi ? responses : null,
      error: failures.length ? `Some analysis runs failed — ${failures.join("; ")}` : "",
    });
    if (responses.ndvi) setColorMode("health");
  };

  const analysis = useMemo(
    () => (analysisRun.responses && polygons ? analyseVillage(polygons.features, analysisRun.responses) : null),
    [analysisRun.responses, polygons],
  );
  const vprops = village?.properties || {};
  const analysisMeta = {
    village: vprops.name,
    taluka: vprops.taluka,
    district: toOutlineDistrict(vprops.district),
    date: calculationDate,
    compareDate: analysisRun.responses?.ndviPrev ? compareDate : "",
  };
  const fieldColorByKey = useMemo(() => {
    if (!analysis || colorMode === "image") return undefined;
    const colors = new Map();
    for (const f of analysis.farms) {
      const band = colorMode === "change" ? f.change : f.health;
      if (band) colors.set(f.key, band.color);
    }
    return colors;
  }, [analysis, colorMode]);
  const selectedInsight = selectedField ? analysis?.byKey.get(cropIndexFeatureKey(selectedField.feature)) : null;

  const selectAlertFarm = (farm) => {
    const p = farm.feature.properties || {};
    const key = `${String(p.detectionId ?? "")}:${String(p.field_id ?? "")}`;
    scrollTargetRef.current = "map";
    setSelectedField({ key, feature: farm.feature, village: saved.find((r) => String(r.id) === String(p.detectionId))?.village });
    setFocusFeature(farm.feature);
  };

  const selectFarm = ({ key, feature }) => {
    const detectionId = feature.properties?.detectionId;
    const savedDetection = saved.find((detection) => String(detection.id) === String(detectionId));
    setSelectedField({ key, feature, village: savedDetection?.village });
  };

  return (
    <div className="space-y-4 p-3 sm:p-5 md:p-6">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <MaharashtraMap
          heightClass="h-[min(68vh,660px)]"
          showFieldDelineationPanel={false}
          cropIndexResults={indexResults}
          cropIndexFeatures={polygons?.features || []}
          showCropIndexImages={colorMode === "image"}
          showFieldFills={false}
          fieldColorByKey={fieldColorByKey}
          fieldInsightsByKey={analysis?.byKey}
          legend={
            fieldColorByKey
              ? colorMode === "change"
                ? { title: `NDVI change since ${formatImageDate(analysisMeta.compareDate)}`, items: CHANGE_BANDS }
                : { title: `Crop health · NDVI ${formatImageDate(calculationDate)}`, items: HEALTH_BANDS }
              : null
          }
          focusFeature={focusFeature}
          loadingTask={
            availability.loading
              ? { kind: "dates" }
              : analysisRun.loading
                ? {
                    kind: "index",
                    message: `Village analysis · satellite runs ${analysisRun.done}/${analysisRun.total}`,
                    pct: analysisRun.total ? (analysisRun.done / analysisRun.total) * 100 : undefined,
                  }
                : null
          }
          selectedFieldKey={selectedField?.key || ""}
          onFieldSelect={selectFarm}
        />
        <aside className="space-y-4">
          <FieldDelineationPanel placement="inline" />

          <section className="overflow-hidden rounded-xl border border-sky-300/20 bg-[#0d141b] text-gray-200 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">
                <Satellite className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[12px] font-bold text-white">Field index</h2>
                <p className="text-[10px] text-gray-500">{polygonCount} farm polygons selected</p>
              </div>
            </div>

            <div className="space-y-3 p-3">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <CalendarDays className="h-3 w-3 text-sky-200" />
                  1 · Search satellite images between
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["start", "From", range.end],
                    ["end", "To", todayInputValue()],
                  ].map(([key, label, max]) => (
                    <label key={key} className="space-y-1 text-[9px] text-gray-500">
                      <span>{label}</span>
                      <input
                        type="date"
                        value={range[key]}
                        min={key === "end" ? range.start : undefined}
                        max={max}
                        onChange={(event) => setRange((r) => ({ ...r, [key]: event.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white [color-scheme:dark]"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!polygonCount || !range.start || !range.end || range.start > range.end || availability.loading}
                  onClick={findAvailableDates}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {availability.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {availability.loading ? "Finding available dates…" : "Find available dates"}
                </button>
              </div>

              {availability.error && (
                <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
                  {availability.error}
                </p>
              )}

              {availability.items && (
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400">
                    2 · Choose an image date{" "}
                    <span className="text-gray-500">({availability.items.length} found)</span>
                  </p>
                  {availability.items.length === 0 ? (
                    <p className="rounded-lg border border-white/[0.06] bg-[#0c1218] px-2.5 py-2 text-[10px] text-gray-400">
                      No satellite images for these farms in this range. Try a wider range.
                    </p>
                  ) : (
                    <ul role="listbox" aria-label="Available image dates" className="custom-scrollbar max-h-48 space-y-1 overflow-y-auto pr-1">
                      {availability.items.map((item) => {
                        const cloud = Number(item.cloud_cover);
                        const full = item.feature_count >= availability.total;
                        const selected = item.date === calculationDate;
                        return (
                          <li key={item.date}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                resetCalculation();
                                chooseDate(item.date);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[10px] transition ${
                                selected
                                  ? "border-lime-300/50 bg-lime-300/10 text-white"
                                  : "border-white/[0.06] bg-[#0c1218] text-gray-300 hover:border-white/15"
                              }`}
                            >
                              <span className="flex-1 font-semibold">{formatImageDate(item.date)}</span>
                              <span className={`tabular-nums ${cloudTone(cloud)}`}>
                                {Number.isFinite(cloud) ? `${cloud.toFixed(1)}% cloud` : "cloud n/a"}
                              </span>
                              <span className={`w-[62px] text-right tabular-nums ${full ? "text-gray-400" : "text-amber-200"}`}>
                                {item.feature_count}/{availability.total} fields
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {selectedAvailability && selectedAvailability.feature_count < availability.total && (
                    <p className="text-[10px] text-amber-200">
                      This image covers {selectedAvailability.feature_count} of {availability.total} fields; the rest
                      will have no index.
                    </p>
                  )}
                </div>
              )}

              {availability.items?.length > 0 && calculationDate && (
                <label className="block space-y-1 text-[10px] text-gray-400">
                  <span>3 · Compare with (before / after)</span>
                  <select
                    value={compareDate}
                    onChange={(event) => {
                      resetCalculation();
                      setCompareDate(event.target.value);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white"
                  >
                    <option value="">No comparison</option>
                    {availability.items
                      .filter((item) => item.date < calculationDate)
                      .map((item) => (
                        <option key={item.date} value={item.date}>
                          {formatImageDate(item.date)} · {Number(item.cloud_cover).toFixed(0)}% cloud · {item.feature_count}/
                          {availability.total} fields
                        </option>
                      ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[9px] text-gray-500">
                  <span>Index</span>
                  <select
                    value={indexName}
                    onChange={(event) => {
                      resetCalculation();
                      setIndexName(event.target.value);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white"
                  >
                    {["NDVI", "EVI", "NDWI", "SAVI", "NDMI"].map((index) => (
                      <option key={index} value={index}>{index}</option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                disabled={!polygonCount || !calculationDate || !indexName || calculation.loading}
                onClick={calculateIndex}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lime-300/20 bg-gradient-to-r from-lime-300/90 to-yellow-200/90 px-3 py-2 text-[11px] font-bold text-[#14200e] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {calculation.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {calculation.loading
                  ? "Calculating index…"
                  : calculationDate
                    ? `Calculate ${indexName} for ${formatImageDate(calculationDate)}`
                    : "Calculate index"}
              </button>

              {calculation.error && (
                <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
                  {calculation.error}
                </p>
              )}

              {!polygonCount && (
                <p className="text-[10px] leading-relaxed text-gray-500">
                  Select a village and run AI field detection to send farm polygons to the index API.
                </p>
              )}
            </div>
          </section>

        </aside>
      </div>

      <VillageAnalysis
        analysis={analysis}
        meta={analysisMeta}
        loading={analysisRun.loading ? `Running village analysis — satellite runs ${analysisRun.done}/${analysisRun.total}…` : ""}
        error={analysisRun.error}
        colorMode={colorMode}
        onColorMode={setColorMode}
        onSelectFarm={selectAlertFarm}
        selectedKey={selectedField ? cropIndexFeatureKey(selectedField.feature) : ""}
      />

      <SelectedFarmPanel
        insight={selectedInsight}
        selected={selectedField}
        result={selectedMappedResult}
        indexName={calculation.response?.index_name || indexName}
        indexDate={calculation.response?.date || calculationDate}
        panelRef={selectedPanelRef}
      />
    </div>
  );
}
