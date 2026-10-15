import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as turf from "@turf/turf";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  Layers,
  Loader2,
  MapPin,
  Mountain,
  RefreshCw,
  Search,
  Sparkles,
  Sprout,
} from "lucide-react";
import MaharashtraMap from "../components/map/MaharashtraMap";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import {
  fetchCropHealth,
  fetchNutrients,
  fetchSoilCarbon,
  fetchTerrain,
  fetchVegetationSeries,
  fetchWaterSeries,
} from "../api/cropMonitoringApi";
import { classifyVillageStream, fieldPredictionsById } from "../api/cropClassificationApi";
import { cropCandidates, cropClassificationColor } from "../utils/cropClassificationColors";
import { cropIndexImageSource } from "../utils/cropIndexImages";
import { getDateRangePresets } from "../utils/dateRangePresets";
import { toOutlineDistrict } from "../config/districtNames";

const ACRES_PER_HA = 2.471053814671738;

const farmKey = (feature) =>
  `${String(feature?.properties?.detectionId ?? "")}:${String(feature?.properties?.field_id ?? "")}`;

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function useElapsed(running) {
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setStartedAt(Date.now());
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return running && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

/**
 * Runs `load(signal)` whenever `key` changes (null key = idle) and on retry().
 * Each report section owns one, so slow analyses never hold up the fast ones.
 */
function useSection(key, load) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  // Keep the latest loader (it closes over the selected farm) without making it a dependency.
  useLayoutEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    if (!key) {
      setState({ status: "idle", data: null, error: "" });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ status: "loading", data: null, error: "" });
    loadRef
      .current(ctrl.signal)
      .then((data) => !ctrl.signal.aborted && setState({ status: "ready", data, error: "" }))
      .catch((e) => {
        if (!ctrl.signal.aborted) setState({ status: "error", data: null, error: e?.message || "Request failed." });
      });
    return () => ctrl.abort();
  }, [key, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

function Section({ icon, title, subtitle, section, className = "", children }) {
  const elapsed = useElapsed(section.status === "loading");
  return (
    <section className={`overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg ${className}`}>
      <header className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cg-accent/10 text-cg-accent">
          {React.createElement(icon, { className: "h-4 w-4" })}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-white">{title}</h3>
          {subtitle && <p className="truncate text-[10px] text-gray-500">{subtitle}</p>}
        </div>
        {section.status === "ready" && (
          <button
            type="button"
            onClick={section.retry}
            title="Reload this section"
            aria-label={`Reload ${title}`}
            className="rounded-md p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </header>
      <div className="p-4">
        {section.status === "loading" && (
          <div className="space-y-2.5" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-[11px] text-emerald-200/80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analysing satellite data… <span className="tabular-nums text-gray-500">{elapsed}s</span>
            </p>
            <div className="h-2 w-3/4 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
          </div>
        )}
        {section.status === "error" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-400/20 bg-red-950/30 p-3 text-[11px] text-red-100" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <p className="flex-1">{section.error}</p>
            <button type="button" onClick={section.retry} className="shrink-0 rounded-md bg-white/10 px-2 py-1 font-semibold hover:bg-white/15">
              Retry
            </button>
          </div>
        )}
        {section.status === "ready" && children(section.data)}
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone = "text-white" }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0c1218] p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</p>
      <p className={`mt-1 text-[15px] font-bold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-500">{sub}</p>}
    </div>
  );
}

function scoreTone(score) {
  if (!Number.isFinite(score)) return { text: "text-gray-300", bar: "#64748b" };
  if (score >= 70) return { text: "text-lime-300", bar: "#a3e635" };
  if (score >= 50) return { text: "text-amber-200", bar: "#fbbf24" };
  return { text: "text-red-300", bar: "#f87171" };
}

function ClassBar({ classes }) {
  return (
    <>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {classes.map((c) => (
          <span key={c.label} style={{ width: `${c.percent}%`, background: c.color }} title={`${c.label}: ${c.percent.toFixed(1)}%`} />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
        {classes.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c.color }} />
            <span className="flex-1 truncate text-gray-300">{c.label}</span>
            <span className="tabular-nums text-gray-500">
              {Number.isFinite(c.hectares) ? `${c.hectares.toFixed(2)} ha · ` : ""}
              {c.percent < 1 && c.percent > 0 ? "<1" : Math.round(c.percent)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function SeriesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-[11px] shadow-xl">
      <p className="font-semibold text-gray-200">{formatDate(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold tabular-nums">{Number(p.value).toFixed(3)}</span>
          {p.payload?.[`${p.dataKey}Status`] && (
            <span className="text-gray-400"> · {p.payload[`${p.dataKey}Status`]}</span>
          )}
        </p>
      ))}
    </div>
  );
}

const SOC_CLASS_COLORS = {
  "Very Low": "#b45309",
  Low: "#d97706",
  Medium: "#ca8a04",
  High: "#65a30d",
  "Very High": "#15803d",
};

export default function FarmReportPage() {
  const { village, fields, saved } = useFieldDelineationContext();
  const periods = useMemo(() => getDateRangePresets().filter((p) => p.id !== "custom"), []);
  const [periodId, setPeriodId] = useState("current-kharif");
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const period = periods.find((p) => p.id === periodId) || periods[0];

  // Farms of the selected village: the latest run if there is one, else every saved detection for it.
  const farms = useMemo(() => {
    if (fields?.features?.length) return fields.features;
    const v = village?.properties;
    if (!v) return [];
    return saved
      .filter((r) => r.village?.name === v.name && r.village?.taluka === v.taluka && r.village?.district === v.district)
      .flatMap((r) => r.fields?.features || []);
  }, [fields, saved, village]);

  const farm = useMemo(() => farms.find((f) => farmKey(f) === selectedKey) || null, [farms, selectedKey]);
  useEffect(() => {
    if (selectedKey && !farm) setSelectedKey("");
  }, [farm, selectedKey]);

  const visibleFarms = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...farms].sort((a, b) => Number(a.properties?.field_id) - Number(b.properties?.field_id));
    return q ? sorted.filter((f) => `field ${f.properties?.field_id}`.includes(q)) : sorted;
  }, [farms, query]);

  const p = farm?.properties || {};
  const geometry = farm?.geometry;
  const areaHa = Number(p.area_ha) > 0 ? Number(p.area_ha) : farm ? turf.area(farm) / 1e4 : null;
  const perimeterM = Number(p.perimeter_m) > 0 ? Number(p.perimeter_m) : farm ? turf.length(turf.polygonToLine(farm), { units: "meters" }) : null;
  const detection = saved.find((r) => String(r.id) === String(p.detectionId));

  // The satellite API validates dates in UTC; after midnight IST the browser's "today" is a
  // day ahead of the server's, so cap end dates at the UTC date.
  const utcToday = new Date().toISOString().slice(0, 10);
  const range = {
    startDate: period.startDate,
    endDate: period.endDate > utcToday ? utcToday : period.endDate,
  };
  // One key per analysis run (farm + dates); null while no farm is selected.
  const runKey = farm ? `${selectedKey}|${range.startDate}|${range.endDate}` : null;

  const health = useSection(runKey, (signal) => fetchCropHealth({ geometry, date: range.endDate, signal }));
  const series = useSection(runKey, async (signal) => {
    const [veg, water] = await Promise.all([
      fetchVegetationSeries({ geometry, ...range, signal }),
      fetchWaterSeries({ geometry, ...range, signal }),
    ]);
    return { veg, water };
  });
  const nutrients = useSection(runKey, (signal) => fetchNutrients({ geometry, date: range.endDate, signal }));
  const soil = useSection(runKey, (signal) => fetchSoilCarbon({ geometry, ...range, signal }));
  const terrain = useSection(runKey, (signal) => fetchTerrain({ geometry, ...range, signal }));
  const classification = useSection(runKey, async (signal) => {
    const result = await classifyVillageStream({
      village,
      fields: { type: "FeatureCollection", features: [farm] },
      ...range,
      signal,
    });
    const predictions = fieldPredictionsById(result);
    return predictions[String(p.field_id)] || Object.values(predictions)[0] || null;
  });

  const seriesData = useMemo(() => {
    if (series.status !== "ready") return [];
    const byDate = new Map();
    for (const [key, s] of [["ndvi", series.data.veg], ["ndmi", series.data.water]]) {
      for (const point of s?.timeseries || []) {
        // Explicit nulls (not missing keys) so connectNulls bridges dates only one index has.
        const row = byDate.get(point.date) || { date: point.date, ndvi: null, ndmi: null };
        row[key] = point.value;
        row[`${key}Status`] = point.status;
        byDate.set(point.date, row);
      }
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [series.status, series.data]);

  const selectFromMap = useCallback(({ key }) => setSelectedKey(key), []);

  const location = [p.village || village?.properties?.name, p.taluka, toOutlineDistrict(p.district)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4 p-3 sm:p-5 md:p-6">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <MaharashtraMap
          heightClass="h-[min(56vh,540px)]"
          showFieldDelineationPanel={false}
          selectedFieldKey={selectedKey}
          onFieldSelect={selectFromMap}
          focusFeature={farm}
        />

        <aside className="flex max-h-[min(56vh,540px)] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FileText className="h-4 w-4 text-cg-accent" />
              Farms
              {farms.length > 0 && <span className="text-[11px] font-normal text-gray-500">· {farms.length}</span>}
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-gray-500">
              {village ? location || village.properties?.name : "Select a village in the top bar"}
            </p>
            {farms.length > 0 && (
              <label className="mt-2.5 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0c1218] px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search farm number…"
                  aria-label="Search farms"
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-white placeholder:text-gray-500 focus:outline-none"
                />
              </label>
            )}
          </div>
          {farms.length === 0 ? (
            <p className="px-4 py-8 text-center text-[11px] leading-relaxed text-gray-500">
              {village
                ? "No detected farms for this village yet. Run “Show all farms in village” on Crop Classification or Crop Monitoring first."
                : "Choose a district, taluka and village in the top bar to list its detected farms."}
            </p>
          ) : (
            <ul className="custom-scrollbar flex-1 divide-y divide-white/[0.04] overflow-y-auto" role="listbox" aria-label="Detected farms">
              {visibleFarms.map((f) => {
                const key = farmKey(f);
                const ha = Number(f.properties?.area_ha);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={key === selectedKey}
                      onClick={() => setSelectedKey(key)}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-[11px] transition ${
                        key === selectedKey ? "bg-cg-accent/10 text-white" : "text-gray-300 hover:bg-white/[0.03]"
                      }`}
                    >
                      <Sprout className={`h-3.5 w-3.5 ${key === selectedKey ? "text-cg-accent" : "text-gray-600"}`} />
                      <span className="flex-1 font-medium">Farm / Field {f.properties?.field_id}</span>
                      {Number.isFinite(ha) && ha > 0 && <span className="tabular-nums text-gray-500">{ha.toFixed(2)} ha</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {!farm ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0d141b] px-6 py-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-600" />
          <p className="mt-3 text-[13px] font-semibold text-gray-200">Select a farm to build its report</p>
          <p className="mt-1 text-[11px] text-gray-500">
            Click a farm on the map or pick one from the list. Crop health, vegetation and water trends, nutrients,
            soil carbon, terrain and crop classification load for it.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#14231a] to-[#0d1117] p-4 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cg-accent">Farm report</p>
                <h2 className="mt-1 text-xl font-bold text-white">Farm / Field {p.field_id}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <MapPin className="h-3.5 w-3.5" /> {location || "—"}
                </p>
              </div>
              <label className="flex w-full min-w-0 items-center gap-2 text-[10px] text-gray-400 sm:w-auto">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                Season
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-[#0c1218] px-2.5 py-1.5 text-[11px] text-white sm:max-w-[320px] sm:flex-none"
                >
                  {periods.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <Stat label="Farm area" value={areaHa ? `${areaHa.toFixed(2)} ha` : "—"} sub={areaHa ? `${(areaHa * ACRES_PER_HA).toFixed(2)} acres` : null} tone="text-lime-300" />
              <Stat label="Perimeter" value={perimeterM ? `${Math.round(perimeterM).toLocaleString("en-IN")} m` : "—"} sub="Mapped boundary" tone="text-sky-300" />
              <Stat label="Detected" value={formatDate(detection?.createdAt)} sub="AI field detection" />
              <Stat label="Analysis period" value={formatDate(range.startDate)} sub={`to ${formatDate(range.endDate)}`} />
            </div>
          </section>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Section icon={HeartPulse} title="Crop health" subtitle={`As of ${formatDate(range.endDate)}`} section={health}>
              {(d) => {
                const score = Number(d.health);
                const tone = scoreTone(score);
                return (
                  <div className="flex flex-wrap items-center gap-5">
                    <div
                      className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
                      style={{ background: `conic-gradient(${tone.bar} ${Math.max(0, Math.min(100, score || 0)) * 3.6}deg, rgba(255,255,255,.07) 0)` }}
                      role="img"
                      aria-label={`Health score ${score} of 100`}
                    >
                      <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-[#111820] text-center">
                        <div>
                          <p className={`text-xl font-bold tabular-nums ${tone.text}`}>{Number.isFinite(score) ? score : "—"}</p>
                          <p className="text-[9px] text-gray-500">/ 100</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid min-w-[200px] flex-1 grid-cols-2 gap-2">
                      <Stat label="Status" value={d.status || "—"} tone={tone.text} />
                      <Stat label="Stress" value={d.stress || "—"} />
                      <Stat label="Growth stage" value={d.stage || "—"} />
                      <Stat label="NDVI · NDRE" value={`${Number(d.ndvi).toFixed(2)} · ${Number(d.ndre).toFixed(2)}`} />
                    </div>
                  </div>
                );
              }}
            </Section>

            <Section icon={Sparkles} title="Crop classification" subtitle="Predicted crop and yield for this farm" section={classification}>
              {(pred) => {
                if (!pred) return <p className="text-[11px] text-gray-400">No classification was returned for this farm.</p>;
                const candidates = cropCandidates(pred);
                const total = candidates.reduce((s, c) => s + c.score, 0) || 1;
                const y = pred.yield_prediction || {};
                const score = Number(pred.best_score);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="Classified crop" value={pred.best_crop || "—"} tone="text-lime-300" sub={pred.season_label || pred.season} />
                      <Stat label="Classification score" value={Number.isFinite(score) ? `${(score <= 1 ? score * 100 : score).toFixed(1)}%` : "—"} />
                      <Stat label="Predicted yield" value={Number.isFinite(Number(y.estimated_yield_tonnes)) ? `${Number(y.estimated_yield_tonnes).toFixed(2)} t` : "—"} />
                      <Stat label="Yield deficit" value={Number.isFinite(Number(y.yield_deficit_pct)) ? `${Number(y.yield_deficit_pct).toFixed(1)}%` : "—"} sub={y.damage_category} />
                    </div>
                    {candidates.length > 0 && (
                      <ClassBar
                        classes={candidates.map((c) => ({
                          label: c.crop,
                          percent: (c.score / total) * 100,
                          color: cropClassificationColor(c.crop).fill,
                        }))}
                      />
                    )}
                  </div>
                );
              }}
            </Section>

            <Section
              icon={Droplets}
              title="Vegetation & water index"
              subtitle="NDVI (vegetation) and NDMI (moisture) through the season"
              section={series}
              className="lg:col-span-2"
            >
              {(d) => (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                    {[["NDVI", d.veg?.summary, "text-lime-300"], ["NDMI", d.water?.summary, "text-sky-300"]].flatMap(([name, s, tone]) =>
                      ["min", "mean", "max"].map((k) => (
                        <Stat key={`${name}-${k}`} label={`${name} ${k}`} value={Number.isFinite(Number(s?.[k])) ? Number(s[k]).toFixed(3) : "—"} tone={tone} />
                      )),
                    )}
                  </div>
                  {seriesData.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No clear satellite observations in this period.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seriesData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={(v) => formatDate(v).slice(0, 6)} tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="rgba(255,255,255,.12)" />
                          <YAxis domain={[-0.2, 1]} tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="rgba(255,255,255,.12)" />
                          <Tooltip content={<SeriesTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                          <Line type="monotone" dataKey="ndvi" name="NDVI" isAnimationActive={false} stroke="#a3e635" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                          <Line type="monotone" dataKey="ndmi" name="NDMI" isAnimationActive={false} stroke="#38bdf8" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section icon={FlaskConical} title="Nutrient availability" subtitle={`Satellite-estimated N · P · K, ${formatDate(range.endDate)}`} section={nutrients}>
              {(d) => (
                <div className="space-y-3">
                  {[
                    ["Nitrogen (N)", d.nutrients?.nitrogen],
                    ["Phosphorus (P)", d.nutrients?.phosphorous],
                    ["Potassium (K)", d.nutrients?.potassium],
                  ].map(([label, n]) => {
                    const score = Number(n?.health_score);
                    const tone = scoreTone(score);
                    return (
                      <div key={label}>
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="text-gray-300">{label}</span>
                          <span className={`font-semibold tabular-nums ${tone.text}`}>
                            {Number.isFinite(score) ? `${score.toFixed(0)} / 100` : "—"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, score || 0))}%`, background: tone.bar }} />
                        </div>
                        {n?.source_index && <p className="mt-0.5 text-[9px] text-gray-500">From {n.source_index} · factor {n.factor}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section icon={Layers} title="Soil organic carbon" subtitle="Bare-soil scenes in the season" section={soil}>
              {(d) => {
                const s = d.soc_stats || {};
                const classes = Object.entries(s.classes || {}).map(([label, c]) => ({
                  label,
                  percent: Number(c.pct_area) || 0,
                  hectares: Number(c.ha),
                  color: SOC_CLASS_COLORS[label] || "#64748b",
                }));
                const img = cropIndexImageSource(d.image_base64);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Mean SOC" value={Number.isFinite(Number(s.mean_pct)) ? `${Number(s.mean_pct).toFixed(2)}%` : "—"} tone="text-amber-200" />
                      <Stat label="Range" value={`${Number(s.min_pct).toFixed(2)}–${Number(s.max_pct).toFixed(2)}%`} />
                      <Stat label="Confidence" value={s.confidence || "—"} sub={d.date ? `Scene ${formatDate(d.date)}` : null} />
                    </div>
                    {classes.length > 0 && <ClassBar classes={classes} />}
                    {img && <img src={img} alt="Soil organic carbon map of this farm" className="max-h-80 w-full rounded-lg border border-white/[0.06] bg-white object-contain" />}
                  </div>
                );
              }}
            </Section>

            <Section icon={Mountain} title="Terrain" subtitle="Elevation and slope" section={terrain}>
              {(d) => {
                const layers = Array.isArray(d.layers) ? d.layers : [];
                const elevation = layers.find((l) => l.layer === "elevation");
                return (
                  <div className="space-y-3">
                    {elevation?.legend && (
                      <div className="grid grid-cols-3 gap-2">
                        <Stat label="Lowest" value={`${Number(elevation.legend.min).toFixed(1)} m`} />
                        <Stat label="Highest" value={`${Number(elevation.legend.max).toFixed(1)} m`} />
                        <Stat label="Relief" value={`${(Number(elevation.legend.max) - Number(elevation.legend.min)).toFixed(1)} m`} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {layers.slice(0, 4).map((l) => {
                        const img = cropIndexImageSource(l.image_base64);
                        return img ? (
                          <figure key={l.layer} className="overflow-hidden rounded-lg border border-white/[0.06] bg-black/30">
                            <img src={img} alt={`${l.name} map of this farm`} className="w-full" />
                            <figcaption className="px-2 py-1 text-[10px] text-gray-400">{l.name}</figcaption>
                          </figure>
                        ) : null;
                      })}
                    </div>
                    {Array.isArray(d.warnings) && d.warnings.length > 0 && (
                      <p className="text-[10px] text-amber-200/80">{d.warnings.join(" · ")}</p>
                    )}
                  </div>
                );
              }}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
