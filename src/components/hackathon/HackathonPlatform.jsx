import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Satellite,
  AlertTriangle,
  Sparkles,
  MapPinned,
  Droplets,
  Leaf,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import AgriMap from "./AgriMap";
import { useFieldData } from "../../context/FieldDataContext";
import {
  getMaharashtraDemoPlots,
  getJalgaonDemoVillageBoundary,
} from "../../data/maharashtraDemoPlots";
import {
  enrichWashimSoybeanFeatureCollection,
  getWashimAreaOutlineFromFeatureCollection,
} from "../../data/washimSoybeanPlots";
import {
  PLATFORM_TAGLINE,
  stateSummary,
  cropFilters,
  getDistrictInsights,
  getClusterAnalytics,
  getAlertsFeed,
  surveyMeta,
  innovationHighlights,
  governmentUseCases,
} from "../../data/agriStateData";
import {
  MAHARASHTRA_DISTRICTS,
  getTalukas,
  buildVillageOptions,
} from "../../data/maharashtraHierarchy";
import { SOYBEAN_CROP_IMAGE_URL } from "../../data/cropAssets";

function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function isSoybeanCropName(ct) {
  const c = String(ct || "").toLowerCase();
  return c === "soybean" || c === "soyabean";
}

function CropHealthCard({ p }) {
  if (!p) return null;
  const pct = Math.min(
    100,
    Math.max(0, Math.round(Number(p.cropHealthPercent) || 0)),
  );
  const area = Number(p.area_ha);
  const areaStr = Number.isFinite(area) ? area.toFixed(2) : "—";

  return (
    <div className="rounded-xl border border-emerald-900/55 bg-[#0b1a12] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-black/40">
      <h3 className="text-sm font-bold text-white">Crop Health</h3>
      <div className="mt-3 grid grid-cols-[96px_1fr] gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {isSoybeanCropName(p.cropType) ? (
            <img
              src={SOYBEAN_CROP_IMAGE_URL}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-900/35 to-lime-950/50">
              <Leaf className="h-9 w-9 text-cg-accent/85" />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1 text-[11px] leading-snug">
          <p className="text-white/95">
            <span className="text-gray-500">Major Crop :</span>{" "}
            <span className="font-semibold text-white">{p.cropType || "—"}</span>
          </p>
          <p className="text-white/95">
            <span className="text-gray-500">Total Area :</span>{" "}
            <span className="font-semibold text-white">{areaStr} He</span>
          </p>
          <p className="pt-1 text-[11px] text-gray-400">Overall Crop Health</p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-[26px] font-bold leading-none tracking-tight text-white">
              {pct}%
            </span>
            <span className="max-w-[140px] text-[10px] text-gray-500">
              Based on vegetation / NDVI index
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.35)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SoilAnalysisCard({ p }) {
  const s = p?.soilHealth;
  if (!s) return null;
  return (
    <div className="rounded-xl border border-emerald-900/45 bg-[#0b1a12] p-4 ring-1 ring-black/40">
      <h3 className="text-sm font-bold text-white">Soil analysis</h3>
      <dl className="mt-3 space-y-2 text-xs text-gray-300">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">Soil status</dt>
          <dd className="font-medium text-white">{s.healthStatus}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">Health score</dt>
          <dd className="text-white">{s.healthPercentage}%</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">AI / standard yield</dt>
          <dd>
            {s.aiYield} / {s.standardYield}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function HackathonPlatform() {
  const {
    loadSampleFields,
    selectSampleField,
    selectedSampleFieldId,
    setSelectedCrop,
    fieldData,
  } = useFieldData();

  const [platformMode, setPlatformMode] = useState("admin");
  const [district, setDistrict] = useState("Washim");
  const [taluka, setTaluka] = useState("");
  const [village, setVillage] = useState("");
  const [crop, setCrop] = useState("Soybean");
  const [season, setSeason] = useState("Kharif");
  const [year, setYear] = useState(2026);

  const [adminMapLayer, setAdminMapLayer] = useState("default");
  const [surveyMapLayer, setSurveyMapLayer] = useState("crop_class");
  const [showVillageBoundary, setShowVillageBoundary] = useState(true);
  const [showValidation, setShowValidation] = useState(true);
  const [govMode, setGovMode] = useState("g1");
  const [cropYearTab, setCropYearTab] = useState(2026);

  const [villagesByDistrictCatalog, setVillagesByDistrictCatalog] = useState(null);
  const [villageFilter, setVillageFilter] = useState("");

  const [washimSoybeanPlots, setWashimSoybeanPlots] = useState(null);
  const [washimLoadError, setWashimLoadError] = useState(null);

  const basePlots = useMemo(() => getMaharashtraDemoPlots(), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/washim-soybean-plots.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("washim geojson");
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const enriched = enrichWashimSoybeanFeatureCollection(raw);
        setWashimLoadError(null);
        setWashimSoybeanPlots(enriched);
      })
      .catch(() => {
        if (!cancelled) {
          setWashimSoybeanPlots(null);
          setWashimLoadError("Could not load Washim soybean plots (GeoJSON).");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fullPlots = useMemo(() => {
    if (!washimSoybeanPlots?.features?.length) return basePlots;
    return {
      type: "FeatureCollection",
      features: [...basePlots.features, ...washimSoybeanPlots.features],
    };
  }, [basePlots, washimSoybeanPlots]);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/mh-villages-by-district.json")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setVillagesByDistrictCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setVillagesByDistrictCatalog({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlots = useMemo(() => {
    let features = fullPlots.features;
    if (district)
      features = features.filter((f) => f.properties?.district === district);
    if (taluka)
      features = features.filter((f) => f.properties?.taluka === taluka);
    if (village)
      features = features.filter((f) => f.properties?.village === village);
    if (crop)
      features = features.filter(
        (f) =>
          (f.properties?.cropType || "").toLowerCase() === crop.toLowerCase(),
      );
    return { type: "FeatureCollection", features };
  }, [fullPlots, district, taluka, village, crop]);

  const talukaOptions = useMemo(() => getTalukas(district), [district]);

  const demoVillagesInDistrict = useMemo(() => {
    if (!district) return [];
    const set = new Set();
    fullPlots.features.forEach((f) => {
      if (f.properties?.district !== district) return;
      const v = f.properties?.village;
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [district, fullPlots]);

  const villageOptions = useMemo(
    () =>
      buildVillageOptions({
        district,
        taluka,
        districtVillageList: district
          ? villagesByDistrictCatalog?.[district]
          : [],
        demoVillagesInDistrict,
        filterText: villageFilter,
      }),
    [
      district,
      taluka,
      villagesByDistrictCatalog,
      demoVillagesInDistrict,
      villageFilter,
    ],
  );

  const districtVillageCount = useMemo(() => {
    if (!district || !villagesByDistrictCatalog) return -1;
    return villagesByDistrictCatalog[district]?.length ?? 0;
  }, [district, villagesByDistrictCatalog]);

  useEffect(() => {
    loadSampleFields(filteredPlots);
  }, [loadSampleFields, filteredPlots]);

  useEffect(() => {
    if (!selectedSampleFieldId) return;
    const ok = filteredPlots.features.some(
      (f) => f.properties?._id === selectedSampleFieldId,
    );
    if (!ok) selectSampleField(null);
  }, [filteredPlots, selectedSampleFieldId, selectSampleField]);

  useEffect(() => {
    setTaluka("");
    setVillage("");
    setVillageFilter("");
  }, [district]);

  useEffect(() => {
    setVillage("");
  }, [taluka]);

  useEffect(() => {
    setSelectedCrop(crop || "");
  }, [crop, setSelectedCrop]);

  const selectedFeature = useMemo(() => {
    if (!selectedSampleFieldId) return null;
    return fullPlots.features.find(
      (f) => f.properties?._id === selectedSampleFieldId,
    );
  }, [fullPlots, selectedSampleFieldId]);

  const villageBoundary = useMemo(() => {
    if (!showVillageBoundary) return null;
    if (district === "Jalgaon") return getJalgaonDemoVillageBoundary();
    if (district === "Washim" && washimSoybeanPlots)
      return getWashimAreaOutlineFromFeatureCollection(washimSoybeanPlots);
    return null;
  }, [showVillageBoundary, district, washimSoybeanPlots]);

  const mapLayer =
    platformMode === "admin"
      ? adminMapLayer === "risk"
        ? "risk"
        : "default"
      : surveyMapLayer;

  const districtInsights = useMemo(
    () => getDistrictInsights(district),
    [district],
  );

  const clusterRows = useMemo(
    () => getClusterAnalytics(district),
    [district],
  );

  const alertsForDistrict = useMemo(() => getAlertsFeed(district), [district]);

  const yieldCompareData = useMemo(
    () =>
      clusterRows.map((c) => ({
        name: c.clusterId,
        yield: c.yieldPerAcreTon,
        benchmark: c.benchmarkYieldTon,
      })),
    [clusterRows],
  );

  const historicalYield = [
    { y: "2023", current: 11.2, prior: 10.4 },
    { y: "2024", current: 12.1, prior: 11.2 },
    { y: "2025", current: 12.8, prior: 12.1 },
    { y: "2026", current: 13.4, prior: 12.8 },
  ];

  const p = selectedFeature?.properties;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-cg-panel/80 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-cg-muted">
          Integrated platform
        </p>
        <p className="text-sm text-white/95">{PLATFORM_TAGLINE}</p>
      </div>

      {washimLoadError && district === "Washim" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {washimLoadError} Run <code className="text-white/90">npm run data:washim</code> and
          ensure <code className="text-white/90">public/data/washim-soybean-plots.geojson</code>{" "}
          exists.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left — filters */}
        <aside className="custom-scrollbar lg:col-span-3 space-y-3 lg:max-h-[min(72vh,620px)] lg:overflow-y-auto">
          <div className="flex gap-2 rounded-xl border border-white/10 bg-cg-panel p-2">
            <button
              type="button"
              onClick={() => setPlatformMode("admin")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                platformMode === "admin"
                  ? "bg-cg-accent text-[#0c2214]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setPlatformMode("survey")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                platformMode === "survey"
                  ? "bg-cg-accent text-[#0c2214]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <Satellite className="h-4 w-4 shrink-0" />
              Crop Survey
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-cg-panel p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Geography
            </h3>
            <label className="block text-[11px] text-gray-500">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a180f] px-3 py-2 text-sm text-white"
            >
              <option value="">Maharashtra (all)</option>
              {MAHARASHTRA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <label className="block text-[11px] text-gray-500">Taluka</label>
            <select
              value={taluka}
              onChange={(e) => setTaluka(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a180f] px-3 py-2 text-sm text-white"
              disabled={!district}
            >
              <option value="">All talukas</option>
              {talukaOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label className="block text-[11px] text-gray-500">
              Village (searchable — Census / Wikipedia)
            </label>
            <input
              type="search"
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              disabled={!district}
              placeholder="Type to filter…"
              className="mb-3 w-full rounded-lg border border-white/10 bg-[#0a180f] px-3 py-2 text-sm text-white placeholder:text-gray-500 disabled:opacity-40"
            />
            <select
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a180f] px-3 py-2 text-sm text-white"
              disabled={!district}
            >
              <option value="">All villages</option>
              {villageOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {district && villagesByDistrictCatalog && districtVillageCount === 0 && (
              <p className="text-[10px] text-amber-200/90">
                No village list for this district in the bundle. Run{" "}
                <code className="text-cg-accent">node scripts/fetch-mh-villages.mjs</code> to
                regenerate <code className="text-cg-accent">public/data/mh-villages-by-district.json</code>.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-cg-panel p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Crop & time
            </h3>
            <label className="block text-[11px] text-gray-500">Crop</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a180f] px-3 py-2 text-sm text-white"
            >
              <option value="">All crops</option>
              {cropFilters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {crop === "Soybean" && (
              <div className="mt-2 overflow-hidden rounded-lg border border-green-900/40 bg-black/20">
                <img
                  src={SOYBEAN_CROP_IMAGE_URL}
                  alt="Soybean"
                  className="h-24 w-full object-cover object-center"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-500">Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a180f] px-2 py-2 text-xs text-white"
                >
                  {stateSummary.seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a180f] px-2 py-2 text-xs text-white"
                >
                  {stateSummary.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {platformMode === "admin" && (
            <div className="rounded-xl border border-white/10 bg-cg-panel p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Map overlay
              </h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="admLayer"
                  checked={adminMapLayer === "default"}
                  onChange={() => setAdminMapLayer("default")}
                />
                Crop health (green / yellow / red)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="admLayer"
                  checked={adminMapLayer === "risk"}
                  onChange={() => setAdminMapLayer("risk")}
                />
                AI risk zones (drought / over-fertilization / pest)
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={showVillageBoundary}
                  onChange={(e) => setShowVillageBoundary(e.target.checked)}
                />
                Area outline (Jalgaon or Washim demo cluster)
              </label>
            </div>
          )}

          {platformMode === "survey" && (
            <div className="rounded-xl border border-white/10 bg-cg-panel p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Survey layers
              </h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="svLayer"
                  checked={surveyMapLayer === "crop_class"}
                  onChange={() => setSurveyMapLayer("crop_class")}
                />
                Crop classification
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="svLayer"
                  checked={surveyMapLayer === "ndvi"}
                  onChange={() => setSurveyMapLayer("ndvi")}
                />
                NDVI health
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="svLayer"
                  checked={surveyMapLayer === "drought"}
                  onChange={() => setSurveyMapLayer("drought")}
                />
                Drought &amp; stress
              </label>
              <p className="pt-2 text-[10px] leading-relaxed text-gray-500">
                AI Crop Classification Accuracy:{" "}
                <span className="font-semibold text-cg-accent">
                  {surveyMeta.classificationAccuracyPct}%
                </span>
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={showValidation}
                  onChange={(e) => setShowValidation(e.target.checked)}
                />
                Survey validation points (mobile sync)
              </label>
            </div>
          )}

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-100/90">
            <p className="font-semibold text-amber-200">Demo flow</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-gray-300">
              <li>
                Washim + Soybean: ~1.4k plots (KML filtered to Washim area; search
                village / taluka to narrow)
              </li>
              <li>Click any soybean polygon for farmer + PMFBY / Mahadbt</li>
              <li>Switch to Crop Survey → NDVI / drought / classification</li>
              <li>Jalgaon banana demos still available if you change district</li>
            </ol>
          </div>
        </aside>

        {/* Center — map */}
        <section className="lg:col-span-6">
          <AgriMap
            plotData={filteredPlots}
            villageBoundary={villageBoundary}
            mapLayer={mapLayer}
            platformMode={platformMode}
            selectedPlotId={selectedSampleFieldId}
            onPlotClick={(feature) =>
              selectSampleField(feature.properties?._id || null)
            }
            showValidationPoints={
              platformMode === "survey" &&
              showValidation &&
              district === "Jalgaon"
            }
          />
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Healthy
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" /> Moderate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Risk
            </span>
          </div>
        </section>

        {/* Right — panel */}
        <aside className="custom-scrollbar lg:col-span-3 space-y-3 lg:max-h-[min(72vh,620px)] lg:overflow-y-auto">
          {platformMode === "admin" && !p && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-[#0a180f] p-3">
                  <p className="text-[10px] text-gray-500">Farmers registered</p>
                  <p className="text-lg font-bold text-white">
                    {(stateSummary.totalFarmersRegistered / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0a180f] p-3">
                  <p className="text-[10px] text-gray-500">Area (acres)</p>
                  <p className="text-lg font-bold text-white">
                    {(stateSummary.totalAreaAcres / 1_000_000).toFixed(2)}M
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0a180f] p-3">
                  <p className="text-[10px] text-gray-500">Active crop</p>
                  <div className="mt-1 flex items-center gap-2">
                    {crop === "Soybean" && (
                      <img
                        src={SOYBEAN_CROP_IMAGE_URL}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover object-center ring-1 ring-white/15"
                      />
                    )}
                    <p className="text-lg font-bold text-amber-300">
                      {crop || stateSummary.activeCropsHighlight}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0a180f] p-3">
                  <p className="text-[10px] text-gray-500">PMFBY coverage</p>
                  <p className="text-lg font-bold text-emerald-300">
                    {stateSummary.insurancePmfbCoveragePct}%
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0a180f] p-3">
                  <p className="text-[10px] text-gray-500">Mahadbt util.</p>
                  <p className="text-lg font-bold text-white">
                    {stateSummary.schemeUtilizationMahadbtPct}%
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0a180f] p-3">
                  <p className="text-[10px] text-gray-500">Crop loans</p>
                  <p className="text-xs font-bold leading-tight text-white">
                    {formatINR(stateSummary.cropLoanDisbursedCrINR * 10000000)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4 text-cg-accent" />
                  District Insights — {districtInsights.district}
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-gray-300">
                  <li className="flex justify-between">
                    <span>High-risk zones</span>
                    <span className="text-red-300">
                      {districtInsights.highRiskZonesHa} ha
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Low productivity clusters</span>
                    <span>{districtInsights.lowProductivityClusters}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Over-fertilization zones</span>
                    <span className="text-purple-300">
                      {districtInsights.overFertilizationZones}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Water stress</span>
                    <span className="text-orange-300">
                      {districtInsights.waterStressZonesHa} ha
                    </span>
                  </li>
                </ul>
                <p className="mt-3 rounded-lg bg-black/30 p-2 text-[11px] leading-snug text-cg-accent">
                  {districtInsights.aiRecommendation}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">
                  Cluster analytics
                </h3>
                <div className="mt-2 max-h-40 overflow-y-auto text-[11px]">
                  <table className="w-full text-left text-gray-300">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="pb-1 pr-2">Cluster</th>
                        <th className="pb-1">Fert. (kg)</th>
                        <th className="pb-1">Yld t/ac</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusterRows.map((row) => (
                        <tr key={row.clusterId} className="border-t border-white/5">
                          <td className="py-1 pr-2 font-mono text-[10px]">
                            {row.clusterId}
                          </td>
                          <td>{row.fertDistributedKg.toLocaleString()}</td>
                          <td className="text-emerald-300">
                            {row.yieldPerAcreTon}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-orange-200">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts &amp; decisions
                </h3>
                <ul className="mt-2 space-y-2">
                  {alertsForDistrict.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-white/5 bg-black/20 p-2 text-[11px]"
                    >
                      <span
                        className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          a.severity === "high"
                            ? "bg-red-500/30 text-red-200"
                            : "bg-amber-500/25 text-amber-100"
                        }`}
                      >
                        {a.type}
                      </span>
                      <span className="text-gray-200">{a.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {platformMode === "admin" && p && (
            <div className="space-y-3">
              <div className="rounded-xl border border-cg-accent/30 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">Farmer profile</h3>
                <dl className="mt-2 space-y-1 text-xs text-gray-300">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Farmer ID</dt>
                    <dd className="font-mono text-white">{p.farmerId}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="text-white">{p.farmerName}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Mobile</dt>
                    <dd>{p.mobile}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Aadhaar</dt>
                    <dd>{p.aadhaarMasked}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Village / Taluka</dt>
                    <dd>
                      {p.village}, {p.taluka}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapPinned className="h-4 w-4 text-cg-accent" />
                  Land &amp; irrigation
                </h3>
                <dl className="mt-2 space-y-1 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gat / Survey</dt>
                    <dd>
                      {p.gatNo} · {p.surveyNo}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Area</dt>
                    <dd>{p.area_ha} ha</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Irrigation</dt>
                    <dd>{p.irrigationType}</dd>
                  </div>
                </dl>
              </div>

              <CropHealthCard p={p} />
              <SoilAnalysisCard p={p} />

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Leaf className="h-4 w-4 text-cg-accent" />
                  Crop history
                </h3>
                <div className="mt-2 flex gap-1">
                  {[2026, 2025, 2024].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setCropYearTab(y)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold ${
                        cropYearTab === y
                          ? "bg-cg-accent text-[#0c2214]"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-lg font-bold text-amber-200">
                  {p.cropHistory?.[cropYearTab] || "—"}
                </p>
                <p className="text-center text-[10px] text-gray-500">
                  Season {season} · Filter year {year} drives statewide KPIs
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">Finance</h3>
                <p className="mt-1 text-xs text-gray-300">
                  Crop loan:{" "}
                  {p.cropLoan?.availed ? (
                    <>
                      Yes · {formatINR(p.cropLoan.amountINR)}
                    </>
                  ) : (
                    "No"
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  Insurance ({p.insurance?.scheme}):{" "}
                  {p.insurance?.claimed ? "Claim filed / settled" : "No claim"}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">Schemes (Mahadbt)</h3>
                {p.schemesMahadbt?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-gray-300">
                    {p.schemesMahadbt.map((s) => (
                      <li key={s.name} className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="text-emerald-300">
                          {formatINR(s.subsidyINR)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">No records</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => selectSampleField(null)}
                className="w-full rounded-lg border border-white/15 py-2 text-xs text-gray-300 hover:bg-white/5"
              >
                Clear selection
              </button>
            </div>
          )}

          {platformMode === "survey" && (
            <>
              {p && (
                <div className="space-y-3">
                  <CropHealthCard p={p} />
                  <SoilAnalysisCard p={p} />
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">
                  Yield prediction
                </h3>
                <p className="text-[11px] text-gray-500">
                  Predicted yield (ton/acre) vs cluster benchmark — {district}{" "}
                  focus
                </p>
                <div className="mt-3 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yieldCompareData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#0c2214",
                          border: "1px solid #333",
                          fontSize: 11,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="yield" name="Predicted" fill="#79c24a" />
                      <Bar dataKey="benchmark" name="Benchmark" fill="#4b5563" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">
                  Historical vs current (district roll-up)
                </h3>
                <div className="mt-2 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalYield}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="y" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#0c2214",
                          border: "1px solid #333",
                          fontSize: 11,
                        }}
                      />
                      <Line type="monotone" dataKey="current" name="Current" stroke="#79c24a" dot={false} />
                      <Line type="monotone" dataKey="prior" name="Prior yr" stroke="#6b7280" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Droplets className="h-4 w-4 text-sky-400" />
                  Drought &amp; stress legend
                </h3>
                <ul className="mt-2 space-y-1 text-[11px] text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-green-600" /> Low
                    stress (ET within norm)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-orange-500" /> Moderate
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-red-600" /> High (NDVI
                    drop + ET deficit)
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                <h3 className="text-sm font-bold text-purple-100">
                  Innovation stack
                </h3>
                <ul className="mt-2 space-y-2 text-[11px] text-gray-300">
                  {innovationHighlights.map((x) => (
                    <li key={x.key}>
                      <span className="font-semibold text-white">{x.title}</span>
                      <br />
                      {x.detail}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-cg-panel p-4">
                <h3 className="text-sm font-bold text-white">Government use case</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {governmentUseCases.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGovMode(g.id)}
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        govMode === g.id
                          ? "bg-cg-accent text-[#0c2214]"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  {govMode === "g1" &&
                    "Crop area estimation: banana-classified polygons summed with survey validation weights."}
                  {govMode === "g2" &&
                    "Subsidy planning: tie Mahadbt disbursement to cluster fertilizer efficiency scores."}
                  {govMode === "g3" &&
                    "Disaster assessment: combine drought layer with insurance anomaly alerts for rapid desk review."}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {fieldData && (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center text-[11px] text-gray-400">
          Charts below use the selected field:{" "}
          <span className="font-semibold text-cg-accent">
            {fieldData.selectionLabel}
          </span>{" "}
          — {fieldData.selectionSubtitle}
        </div>
      )}
    </div>
  );
}
