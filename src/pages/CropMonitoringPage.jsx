import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Layers,
  Loader2,
  MapPin,
  Ruler,
  Satellite,
  Sprout,
  X,
} from "lucide-react";
import FieldDelineationPanel from "../components/delineation/FieldDelineationPanel";
import MaharashtraMap from "../components/map/MaharashtraMap";
import FarmImageMap from "../components/map/FarmImageMap";
import SearchSelect from "../components/admin-shell/SearchSelect";
import {
  cropIndexFeatureKey,
  cropIndexImageSource,
  cropIndexResultsMappedToFeatures,
} from "../utils/cropIndexImages";
import { calculatePolygonIndex, fetchPolygonAvailability } from "../api/cropMonitoringApi";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import { todayInputValue } from "../utils/dateRangePresets";
import VillageAnalysis from "../components/monitoring/VillageAnalysis";
import { CHANGE_BANDS, COLOR_MODES, HEALTH_BANDS, analyseVillage, pickCompareDate } from "../utils/villageAnalysis";
import * as turf from "@turf/turf";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import { toDatasetDistrict, toOutlineDistrict } from "../config/districtNames";
import { readUploadedFields } from "../utils/uploadedFields";

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
        percent: Number(entry.percent) || 0,
        hectares: entry.hectares == null ? NaN : Number(entry.hectares),
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

/** Census code identifies a village exactly (names repeat and can be blank); older rows only have the name. */
function isSameVillage(row, v) {
  if (!row?.village || !v) return false;
  if (row.village.taluka !== v.taluka || row.village.district !== v.district) return false;
  return row.village.censusCode && v.census_code
    ? String(row.village.censusCode) === String(v.census_code)
    : row.village.name === v.name;
}

/**
 * Merges saved detection rows into one collection. The result only changes when the set of
 * rows does, so saving an unrelated detection (e.g. a background taluka run) doesn't reset
 * dates and results for the farms being worked on.
 */
function useRowsCollection(rows) {
  const key = rows.map((r) => r.id).join(",");
  return useMemo(() => {
    const features = rows.flatMap((r) => r.fields?.features || []);
    return features.length ? { type: "FeatureCollection", features } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Upload a GeoJSON of farm boundaries to monitor instead of AI-detected fields. */
function UploadFieldsPanel({ upload, active, error, loading, onFile, onClear, onUse }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const pick = (file) => file && onFile(file);
  const totalHa = upload?.fields.features.reduce((sum, f) => sum + (Number(f.properties.area_ha) || 0), 0) || 0;

  return (
    <section className="overflow-hidden rounded-xl border border-lime-300/20 bg-[#0d141b] text-gray-200 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-300/10 text-lime-200">
          <FileUp className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[12px] font-bold text-white">Upload farm boundaries</h2>
          <p className="text-[10px] text-gray-500">Monitor your own GeoJSON polygons</p>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {upload ? (
          <div className="flex items-start gap-2 rounded-lg border border-lime-300/25 bg-lime-300/[0.06] px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-white" title={upload.name}>{upload.name}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {upload.fields.features.length} farms · {totalHa.toFixed(2)} ha
                {upload.skipped > 0 && ` · ${upload.skipped} non-polygon features skipped`}
              </p>
              {active ? (
                <p className="mt-0.5 text-[10px] text-lime-200/80">Monitoring these farms.</p>
              ) : (
                <button type="button" onClick={onUse} className="mt-0.5 text-[10px] font-semibold text-lime-300 hover:underline">
                  Monitor these farms
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClear}
              title="Remove uploaded file"
              className="rounded-md p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files?.[0]);
          }}
          disabled={loading}
          className={`flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center transition disabled:opacity-50 ${
            dragging ? "border-lime-300/70 bg-lime-300/10" : "border-white/15 bg-[#0c1218] hover:border-lime-300/40"
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-lime-200" /> : <FileUp className="h-4 w-4 text-lime-200" />}
          <span className="text-[11px] font-semibold text-gray-200">
            {upload ? "Replace file" : "Drop a .geojson file or browse"}
          </span>
          <span className="text-[9px] text-gray-500">Polygon / MultiPolygon features in WGS 84 (lng, lat)</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          className="hidden"
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {error && (
          <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

/** Searchable farm dropdown with previous / next, for stepping through farms while working. */
function FarmPicker({ options, value, onChange, compact = false }) {
  const index = options.findIndex((o) => o.value === value);
  const step = (delta) => {
    if (!options.length) return;
    const next = index < 0 ? 0 : (index + delta + options.length) % options.length;
    onChange(options[next].value);
  };
  const navButton = "grid h-10 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-[#111820] text-gray-300 transition hover:border-lime-300/40 hover:text-white disabled:opacity-40";
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "w-full"}`}>
      <button type="button" className={navButton} onClick={() => step(-1)} disabled={!options.length} title="Previous farm">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <SearchSelect
        label="Farm"
        placeholder={options.length ? `Select farm (${options.length})` : "No farms loaded"}
        options={options}
        value={value}
        onChange={onChange}
        disabled={!options.length}
        emptyText="No farm matches"
        className={compact ? "w-64" : "flex-1"}
      />
      <button type="button" className={navButton} onClick={() => step(1)} disabled={!options.length} title="Next farm">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SelectedFarmPanel({ selected, result, indexName, indexDate, panelRef, insight, farmOptions, farmValue, onFarmChange }) {
  const feature = selected?.feature;
  const properties = feature?.properties || {};
  const [view, setView] = useState("index");
  const [opacity, setOpacity] = useState(0.85);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const area = Number(properties.area_ha);
  const perimeter = Number(properties.perimeter_m);
  const location = [
    selected?.village?.name || properties.village || (properties.source === "upload" ? properties.name : ""),
    selected?.village?.taluka || properties.taluka,
    selected?.village?.district || properties.district,
  ].filter(Boolean).join(" · ");
  const legend = legendEntries(result?.legend);
  const present = legend.filter((entry) => entry.percent > 0).sort((a, b) => b.percent - a.percent);
  const shownLegend = showAllClasses || !present.length ? legend : present;
  const hasImage = Boolean(cropIndexImageSource(result?.image_base64, result?.image_format));
  const label = result?.index_name || indexName || "Index";

  return (
    <section
      ref={panelRef}
      className="scroll-mt-20 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300/70">Selected farm</p>
          <h2 className="mt-0.5 text-sm font-bold text-white">
            {selected ? `Field #${properties.field_id ?? "—"}` : "Farm details"}
          </h2>
          {location && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
              <MapPin className="h-3 w-3 text-lime-300" /> {location}
            </p>
          )}
        </div>
        {farmOptions.length > 0 && (
          <FarmPicker options={farmOptions} value={farmValue} onChange={onFarmChange} compact />
        )}
      </div>

      {!selected ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs font-semibold text-gray-300">Select a farm on the map or from the dropdown</p>
          <p className="mt-1 text-[11px] text-gray-500">
            The farm on satellite imagery, its index image, and field information will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
          <div className="space-y-2">
            <FarmImageMap
              feature={feature}
              fieldKey={selected.key}
              result={hasImage ? result : null}
              showIndex={view === "index"}
              opacity={opacity}
              className="h-[min(56vh,460px)] min-h-64"
            />
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.06] bg-[#0c1218] px-3 py-2">
              <div className="flex rounded-md border border-white/10 p-0.5 text-[10px] font-semibold">
                {[
                  ["index", `${label} on satellite`],
                  ["satellite", "Satellite only"],
                ].map(([key, text]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    disabled={key === "index" && !hasImage}
                    className={`rounded px-2.5 py-1 transition disabled:opacity-40 ${
                      view === key ? "bg-lime-300/15 text-lime-100" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
              {hasImage && view === "index" && (
                <label className="flex min-w-[160px] flex-1 items-center gap-2 text-[10px] text-gray-400">
                  <Layers className="h-3.5 w-3.5 text-lime-300/80" />
                  Index opacity
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                    className="flex-1 accent-lime-300"
                  />
                  <span className="w-8 text-right tabular-nums text-gray-300">{Math.round(opacity * 100)}%</span>
                </label>
              )}
              {!hasImage && (
                <span className="text-[10px] text-gray-500">
                  {result ? "No index image returned for this farm." : "Calculate an index to overlay it on the satellite image."}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FieldMetric icon={Ruler} label="Area" value={Number.isFinite(area) ? `${area.toFixed(2)} ha` : "—"} />
              <FieldMetric
                icon={Ruler}
                label="Perimeter"
                value={Number.isFinite(perimeter) ? `${Math.round(perimeter).toLocaleString("en-IN")} m` : "—"}
              />
              <FieldMetric icon={Sprout} label="Index" value={label} />
              <FieldMetric icon={CalendarDays} label="Image date" value={result?.date || indexDate || "—"} />
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label} classes</p>
                  {present.length > 0 && present.length < legend.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllClasses((v) => !v)}
                      className="text-[10px] font-semibold text-lime-300/80 hover:text-lime-200"
                    >
                      {showAllClasses ? "Only in this farm" : `All ${legend.length} classes`}
                    </button>
                  )}
                </div>
                {present.length > 0 && (
                  <div className="mb-2.5 flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    {present.map((entry) => (
                      <span
                        key={entry.key}
                        title={`${entry.label} · ${entry.percent.toFixed(1)}%`}
                        style={{ width: `${entry.percent}%`, backgroundColor: entry.color || "#64748b" }}
                      />
                    ))}
                  </div>
                )}
                {shownLegend.length ? (
                  <ul className="grid gap-1.5">
                    {shownLegend.map((entry) => (
                      <li key={entry.key} className="flex items-center gap-2 text-[11px] text-gray-300">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm border border-white/15"
                          style={entry.color ? { backgroundColor: entry.color } : undefined}
                        />
                        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                        {entry.percent > 0 && (
                          <span className="tabular-nums text-gray-400">
                            {Number.isFinite(entry.hectares) ? `${entry.hectares.toFixed(2)} ha · ` : ""}
                            {entry.percent < 1 ? "<1" : Math.round(entry.percent)}%
                          </span>
                        )}
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
  const [indexOpacity, setIndexOpacity] = useState(0.86);
  const [upload, setUpload] = useState(null);
  const [uploadState, setUploadState] = useState({ loading: false, error: "" });
  const calculationController = useRef(null);
  const availabilityController = useRef(null);
  const selectedPanelRef = useRef(null);

  // Village scope: every saved detection of the selected village (whole-village and drawn
  // areas). The latest run is always saved, so this already includes it; the in-memory run
  // is only the fallback for one that found no fields.
  const villageProps = village?.properties;
  const villageRows = useMemo(
    () => (villageProps ? saved.filter((r) => isSameVillage(r, villageProps)) : []),
    [saved, villageProps],
  );
  const savedVillageFields = useRowsCollection(villageRows);
  const detectedPolygons =
    savedVillageFields || (fields?.type === "FeatureCollection" && fields.features?.length ? fields : null);

  // Taluka scope: every saved detection in the taluka picked in the top bar (or the selected
  // village's taluka), e.g. after "Detect all villages in taluka".
  const { district: platformDistrict, taluka: platformTaluka } = useAgriPlatform();
  const scopeTaluka = platformTaluka || villageProps?.taluka || "";
  const scopeDistrict = platformTaluka ? toDatasetDistrict(platformDistrict) : villageProps?.district || "";
  const talukaRows = useMemo(
    () => (scopeTaluka ? saved.filter((r) => r.village?.taluka === scopeTaluka && r.village?.district === scopeDistrict) : []),
    [saved, scopeTaluka, scopeDistrict],
  );
  const talukaCollection = useRowsCollection(talukaRows);
  const talukaVillageCount = useMemo(
    () => new Set(talukaRows.map((r) => r.village?.censusCode || r.village?.name)).size,
    [talukaRows],
  );

  // What is being monitored. "auto" follows the selection: the selected village, else an
  // uploaded file, else the whole taluka. Loading a file selects it explicitly. Picking a different village returns to "auto", so a
  // selected village is always what gets monitored.
  const [scope, setScope] = useState("auto");
  const villageIdentity = villageProps ? `${villageProps.district}|${villageProps.taluka}|${villageProps.census_code || villageProps.name}` : "";
  useEffect(() => setScope("auto"), [villageIdentity, scopeTaluka]);
  const available = { upload: Boolean(upload), village: Boolean(villageProps || detectedPolygons), taluka: Boolean(talukaCollection) };
  const autoScope = villageProps
    ? "village"
    : upload
      ? "upload"
      : detectedPolygons
        ? "village"
        : talukaCollection
          ? "taluka"
          : "village";
  const activeScope = scope !== "auto" && available[scope] ? scope : autoScope;
  const polygons =
    activeScope === "upload" ? upload.fields : activeScope === "taluka" ? talukaCollection : detectedPolygons;
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
    // A farm from the previous set isn't part of this one.
    setSelectedField(null);
  }, [polygons]);

  // Map clicks scroll to the farm panel; alert-list clicks scroll to the map, which zooms to the farm.
  const scrollTargetRef = useRef("panel");
  useEffect(() => {
    if (!selectedField) return;
    if (scrollTargetRef.current === "none") {
      // Picked from a dropdown: stay where the user is working.
    } else if (scrollTargetRef.current === "map") {
      document.querySelector(".leaflet-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollTargetRef.current = "panel";
  }, [selectedField]);

  const loadUpload = async (file) => {
    setUploadState({ loading: true, error: "" });
    try {
      const { fields: uploaded, skipped } = await readUploadedFields(file);
      setUpload({ name: file.name, fields: uploaded, skipped, key: `${file.name}-${Date.now()}` });
      setScope("upload");
      setUploadState({ loading: false, error: "" });
    } catch (error) {
      setUploadState({ loading: false, error: error.message || "Could not read the file." });
    }
  };

  const clearUpload = () => {
    setUpload(null);
    setScope("auto");
    setUploadState({ loading: false, error: "" });
  };

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
      setAvailability({ loading: false, items, total, failed: Number(response?.failed_features) || 0, error: "" });
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
      const missing = Number(mainResult.value?.failed_features) || 0;
      setCalculation({
        loading: false,
        response: mainResult.value,
        error: "",
        warning: missing
          ? `${missing.toLocaleString("en-IN")} of ${polygonCount.toLocaleString("en-IN")} fields have no ${indexName} image: the server dropped part of the request. Calculate again to retry them.`
          : "",
      });
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
  };

  const analysis = useMemo(
    () => (analysisRun.responses && polygons ? analyseVillage(polygons.features, analysisRun.responses) : null),
    [analysisRun.responses, polygons],
  );
  const vprops = village?.properties || {};
  const analysisMeta = activeScope === "taluka" ? {
    village: `${scopeTaluka} taluka`,
    taluka: "",
    district: toOutlineDistrict(scopeDistrict),
    date: calculationDate,
    compareDate: analysisRun.responses?.ndviPrev ? compareDate : "",
  } : activeScope === "upload" ? {
    village: upload.name.replace(/\.(geo)?json$/i, ""),
    date: calculationDate,
    compareDate: analysisRun.responses?.ndviPrev ? compareDate : "",
  } : {
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

  const chooseScope = (next) => {
    setScope(next);
    const target = next === "taluka" ? talukaCollection : next === "upload" ? upload?.fields : detectedPolygons;
    if (target?.features?.length) setFocusFeature(turf.bboxPolygon(turf.bbox(target)));
  };

  const selectAlertFarm = (farm) => {
    const p = farm.feature.properties || {};
    const key = `${String(p.detectionId ?? "")}:${String(p.field_id ?? "")}`;
    scrollTargetRef.current = "map";
    setSelectedField({ key, feature: farm.feature, village: saved.find((r) => String(r.id) === String(p.detectionId))?.village });
    setFocusFeature(farm.feature);
  };

  const farmOptions = useMemo(
    () =>
      (polygons?.features || []).map((feature) => {
        const p = feature.properties || {};
        const farm = analysis?.byKey.get(cropIndexFeatureKey(feature));
        const area = Number(p.area_ha);
        const hint = [
          Number.isFinite(area) ? `${area.toFixed(2)} ha` : "",
          farm?.health ? `${farm.health.label} · ${farm.score}` : "",
          farm?.alerts?.length ? `⚠ ${farm.alerts.length}` : "",
        ].filter(Boolean).join(" · ");
        // Field ids restart per village, so whole-taluka options name the village too.
        const name =
          p.source === "upload" && p.name ? ` · ${p.name}` : activeScope === "taluka" && p.village ? ` · ${p.village}` : "";
        return {
          value: cropIndexFeatureKey(feature),
          label: `Field #${p.field_id ?? "—"}${name}`,
          hint,
          search: `${p.field_id ?? ""} ${p.name ?? ""} ${p.village ?? ""} ${hint}`,
          feature,
        };
      }),
    [polygons, analysis, activeScope],
  );

  const pickFarm = (value) => {
    const option = farmOptions.find((o) => o.value === value);
    if (!option) return;
    const p = option.feature.properties || {};
    scrollTargetRef.current = "none";
    setSelectedField({
      key: `${String(p.detectionId ?? "")}:${String(p.field_id ?? "")}`,
      feature: option.feature,
      village: saved.find((r) => String(r.id) === String(p.detectionId))?.village,
    });
    setFocusFeature(option.feature);
  };
  const selectedFarmValue = selectedField ? cropIndexFeatureKey(selectedField.feature) : "";
  // Every field shares one class scheme, so the first result's legend labels the map.
  const indexLegendItems = useMemo(
    () => legendEntries(indexResults.find((r) => r.legend)?.legend).filter((entry) => entry.color),
    [indexResults],
  );
  const mapModes = COLOR_MODES.filter((m) => m.id === "image" || (analysis && (m.id !== "change" || analysisMeta.compareDate)));

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
          cropIndexOpacity={indexOpacity}
          showFieldFills={false}
          fieldColorByKey={fieldColorByKey}
          fieldInsightsByKey={analysis?.byKey}
          legend={
            fieldColorByKey
              ? colorMode === "change"
                ? { title: `NDVI change since ${formatImageDate(analysisMeta.compareDate)}`, items: CHANGE_BANDS }
                : { title: `Crop health · NDVI ${formatImageDate(calculationDate)}`, items: HEALTH_BANDS }
              : indexLegendItems.length
                ? {
                    title: `${calculation.response?.index_name || indexName} · ${formatImageDate(calculation.response?.date || calculationDate)}`,
                    items: indexLegendItems,
                  }
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
          uploadedFields={upload?.fields || null}
          uploadedFieldsKey={upload?.key || ""}
        />
        <aside className="space-y-4">
          {polygonCount > 0 && (
            <section className="rounded-xl border border-white/[0.08] bg-[#0d141b] p-3 shadow-xl shadow-black/20">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[12px] font-bold text-white">Work on a farm</h2>
                {selectedField && (
                  <button
                    type="button"
                    onClick={() => setSelectedField(null)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <FarmPicker options={farmOptions} value={selectedFarmValue} onChange={pickFarm} />
              {indexResults.length > 0 && (
                <div className="mt-3 flex rounded-lg border border-white/10 bg-[#0c1218] p-0.5" role="radiogroup" aria-label="Map view">
                  {mapModes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={colorMode === m.id}
                      onClick={() => setColorMode(m.id)}
                      className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                        colorMode === m.id ? "bg-lime-300/15 text-lime-100" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {m.id === "image" ? `${calculation.response?.index_name || indexName} image` : m.label}
                    </button>
                  ))}
                </div>
              )}
              {indexResults.length > 0 && colorMode === "image" && (
                <label className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                  <Layers className="h-3.5 w-3.5 text-sky-200" />
                  Index opacity
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={indexOpacity}
                    onChange={(event) => setIndexOpacity(Number(event.target.value))}
                    className="flex-1 accent-lime-300"
                  />
                  <span className="w-8 text-right tabular-nums text-gray-300">{Math.round(indexOpacity * 100)}%</span>
                </label>
              )}
            </section>
          )}

          <UploadFieldsPanel
            upload={upload}
            active={activeScope === "upload"}
            onUse={() => chooseScope("upload")}
            error={uploadState.error}
            loading={uploadState.loading}
            onFile={loadUpload}
            onClear={clearUpload}
          />

          <FieldDelineationPanel placement="inline" />
        </aside>
      </div>

      <section className="overflow-hidden rounded-xl border border-sky-300/20 bg-[#0d141b] text-gray-200 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">
            <Satellite className="h-4 w-4" />
          </span>
          <h2 className="text-[12px] font-bold text-white">Field index</h2>
          <span className="text-[10px] text-gray-500">
            {polygonCount.toLocaleString("en-IN")} farm polygons{" "}
            {activeScope === "upload"
              ? "from uploaded file"
              : activeScope === "taluka"
                ? `in ${talukaVillageCount} villages of ${scopeTaluka}`
                : villageProps?.name
                  ? `in ${villageProps.name}`
                  : "selected"}
          </span>
          {[available.upload, available.village, Boolean(scopeTaluka)].filter(Boolean).length > 1 && (
            <div className="ml-auto flex flex-wrap rounded-lg border border-white/10 bg-[#0c1218] p-0.5" role="radiogroup" aria-label="Monitoring scope">
              {[
                available.village && ["village", villageProps?.name ? `Village · ${villageProps.name}` : "Village"],
                scopeTaluka && [
                  "taluka",
                  talukaCollection
                    ? `Whole taluka · ${scopeTaluka} (${talukaCollection.features.length.toLocaleString("en-IN")})`
                    : `Whole taluka · ${scopeTaluka}`,
                ],
                available.upload && ["upload", `File · ${upload.name}`],
              ].filter(Boolean).map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={activeScope === key}
                  disabled={!available[key]}
                  title={key === "taluka" && !talukaCollection ? "Run “Detect all villages” in the field detection panel first" : undefined}
                  onClick={() => chooseScope(key)}
                  className={`max-w-[220px] truncate rounded-md px-2.5 py-1 text-[10px] font-semibold transition disabled:opacity-40 ${
                    activeScope === key ? "bg-sky-300/15 text-sky-100" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          {!polygonCount && (
            <span className="text-[10px] text-amber-200/80">
              · Upload a GeoJSON or run AI field detection to load farm polygons.
            </span>
          )}
        </div>

        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(250px,auto)_minmax(0,1fr)_minmax(200px,240px)_minmax(190px,auto)] lg:divide-x lg:divide-white/[0.06]">
          {/* 1 · Date range */}
          <div className="space-y-1.5 lg:pr-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
              <CalendarDays className="h-3 w-3 text-sky-200" />1 · Search images between
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["start", "From", range.end],
                ["end", "To", todayInputValue()],
              ].map(([key, label, max]) => (
                <label key={key} className="space-y-0.5 text-[9px] text-gray-500">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {availability.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {availability.loading ? "Finding available dates…" : "Find available dates"}
            </button>
          </div>

          {/* 2 · Image date */}
          <div className="min-w-0 space-y-1.5 lg:px-3">
            <p className="text-[10px] font-semibold text-gray-400">
              2 · Choose an image date
              {availability.items && <span className="font-normal text-gray-500"> ({availability.items.length} found)</span>}
            </p>
            {availability.error ? (
              <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
                {availability.error}
              </p>
            ) : !availability.items ? (
              <p className="grid h-[68px] place-items-center rounded-lg border border-dashed border-white/10 px-3 text-center text-[10px] text-gray-500">
                {availability.loading ? "Searching Sentinel-2 images…" : "Find available dates to list satellite images here."}
              </p>
            ) : availability.items.length === 0 ? (
              <p className="grid h-[68px] place-items-center rounded-lg border border-white/[0.06] bg-[#0c1218] px-3 text-center text-[10px] text-gray-400">
                No satellite images for these farms in this range. Try a wider range.
              </p>
            ) : (
              <ul
                role="listbox"
                aria-label="Available image dates"
                aria-orientation="horizontal"
                className="custom-scrollbar flex gap-1.5 overflow-x-auto pb-1"
              >
                {availability.items.map((item) => {
                  const cloud = Number(item.cloud_cover);
                  const full = item.feature_count >= availability.total;
                  const selected = item.date === calculationDate;
                  return (
                    <li key={item.date} className="shrink-0">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          resetCalculation();
                          chooseDate(item.date);
                        }}
                        className={`flex h-[60px] w-[108px] flex-col justify-between rounded-lg border px-2 py-1.5 text-left text-[10px] transition ${
                          selected
                            ? "border-lime-300/60 bg-lime-300/10 text-white"
                            : "border-white/[0.06] bg-[#0c1218] text-gray-300 hover:border-white/20"
                        }`}
                      >
                        <span className="font-semibold">{formatImageDate(item.date)}</span>
                        <span className={`tabular-nums ${cloudTone(cloud)}`}>
                          {Number.isFinite(cloud) ? `${cloud.toFixed(1)}% cloud` : "cloud n/a"}
                        </span>
                        <span className={`tabular-nums ${full ? "text-gray-500" : "text-amber-200"}`}>
                          {item.feature_count}/{availability.total} fields
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {availability.failed > 0 && (
              <p className="text-[10px] text-amber-200">
                {availability.failed.toLocaleString("en-IN")} fields could not be checked for dates (the server
                failed for them). Search again to retry them.
              </p>
            )}
            {selectedAvailability && selectedAvailability.feature_count < availability.total && (
              <p className="text-[10px] text-amber-200">
                This image covers {selectedAvailability.feature_count} of {availability.total} fields; the rest will have
                no index.
              </p>
            )}
          </div>

          {/* 3 · Compare + index */}
          <div className="space-y-1.5 lg:px-3">
            <p className="text-[10px] font-semibold text-gray-400">3 · Compare &amp; index</p>
            <label className="block space-y-0.5 text-[9px] text-gray-500">
              <span>Compare with (before)</span>
              <select
                value={compareDate}
                disabled={!availability.items?.length || !calculationDate}
                onChange={(event) => {
                  resetCalculation();
                  setCompareDate(event.target.value);
                }}
                className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white disabled:opacity-40"
              >
                <option value="">No comparison</option>
                {(availability.items || [])
                  .filter((item) => item.date < calculationDate)
                  .map((item) => (
                    <option key={item.date} value={item.date}>
                      {formatImageDate(item.date)} · {Number(item.cloud_cover).toFixed(0)}% cloud · {item.feature_count}/
                      {availability.total} fields
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-0.5 text-[9px] text-gray-500">
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

          {/* 4 · Calculate */}
          <div className="flex flex-col justify-end gap-1.5 lg:pl-3">
            <p className="text-[10px] font-semibold text-gray-400">4 · Run</p>
            <button
              type="button"
              disabled={!polygonCount || !calculationDate || !indexName || calculation.loading}
              onClick={calculateIndex}
              className="inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-lg border border-lime-300/20 bg-gradient-to-r from-lime-300/90 to-yellow-200/90 px-3 py-2 text-[11px] font-bold text-[#14200e] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {calculation.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {calculation.loading
                ? "Calculating index…"
                : calculationDate
                  ? `Calculate ${indexName} · ${formatImageDate(calculationDate)}`
                  : "Calculate index"}
            </button>
          </div>
        </div>

        {calculation.warning && (
          <p className="mx-3 mb-3 rounded-lg border border-amber-300/20 bg-amber-400/10 px-2.5 py-2 text-[10px] text-amber-100">
            {calculation.warning}
          </p>
        )}
        {calculation.error && (
          <p role="alert" className="mx-3 mb-3 rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
            {calculation.error}
          </p>
        )}
      </section>

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
        farmOptions={farmOptions}
        farmValue={selectedFarmValue}
        onFarmChange={pickFarm}
      />
    </div>
  );
}
