import React, { useEffect, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import AgriMap from "../components/hackathon/AgriMap";
import HealthLegend from "../components/ui/HealthLegend";
import FarmerProfileTabs from "../components/admin-shell/FarmerProfileTabs";
import { getAlertsFeed } from "../data/agriStateData";
import {
  aggregateDistrictGovernance,
  generateGovernanceInsights,
  propsToFeatureCollection,
} from "../data/governanceEngine";
import { MAHARASHTRA_DISTRICTS } from "../data/maharashtraHierarchy";
import {
  getFarmerRegistrySeedRows,
  filterSeedRowsByDistrict,
  FARMER_REGISTRY_SEED_COUNT,
} from "../data/farmerRegistrySeed";

const DEMO_FARMER = {
  farmerName: "Sunil Gawai",
  farmerId: "FR-MH-3104821",
  mobile: "+91 98765 43210",
  village: "Karanja",
  taluka: "Karanja",
  district: "Washim",
  surveyNo: "SN-WH-2020-2045",
  gatNo: "12 / 1",
  area_ha: "1.85",
  cropType: "Soybean",
  cropHealthPercent: 62,
  cropHealth: "Decent",
  governanceImpactScore: 72,
  governanceImpactLabel: "High Risk",
  governanceDiseaseRisk: 78,
  predictedYieldTonPerAcre: 3.1,
  surveyNdviHealth: 0.52,
  irrigationType: "Rainfed",
  sowingDate: "2025-07-12",
  insurance: { claimed: false },
  cropLoan: { availed: true, amountINR: 45000 },
};

function KpiCard({ label, value, sub, trend, trendUp }) {
  return (
    <div className="dashboard-stat-card">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-white tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-amber-200/90">{sub}</p>}
      {trend && (
        <p
          className={`mt-2 flex items-center gap-1 text-[11px] font-semibold ${
            trendUp ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <TrendingUp className={`h-3.5 w-3.5 ${trendUp ? "" : "rotate-180"}`} />
          {trend}
        </p>
      )}
    </div>
  );
}

function scoreColor(score) {
  if (score >= 71) return "text-red-400";
  if (score >= 41) return "text-amber-400";
  return "text-emerald-400";
}

/** Talukas whose max parcel impact in the cohort is ≥ 71 (high / critical band). */
function highRiskTalukaCount(rows) {
  const maxByT = new Map();
  rows.forEach((p) => {
    const t = String(p.taluka || "").trim();
    if (!t) return;
    const g = Number(p.governanceImpactScore) || 0;
    maxByT.set(t, Math.max(maxByT.get(t) ?? 0, g));
  });
  return [...maxByT.values()].filter((x) => x >= 71).length;
}

export default function DashboardOverviewPage() {
  const s = useAgriPlatform();
  const { setAdminMapLayer, governanceRollup: rollup } = s;

  useEffect(() => {
    setAdminMapLayer("impact");
  }, [setAdminMapLayer]);

  const seedRows = useMemo(() => {
    if (s.filterStateCode !== "MH") return [];
    return filterSeedRowsByDistrict(getFarmerRegistrySeedRows(), s.district);
  }, [s.filterStateCode, s.district]);

  const seedRollup = useMemo(() => {
    if (!seedRows.length) return null;
    return aggregateDistrictGovernance(propsToFeatureCollection(seedRows));
  }, [seedRows]);

  const displayRollup = useMemo(() => seedRollup ?? rollup, [seedRollup, rollup]);

  const displayInsights = useMemo(() => {
    const label =
      s.district ||
      (s.filterStateCode === "MH" ? `Maharashtra (${MAHARASHTRA_DISTRICTS.length} districts)` : "");
    return generateGovernanceInsights({ district: label, rollup: displayRollup });
  }, [displayRollup, s.district, s.filterStateCode]);

  const kpis = useMemo(() => {
    const r = displayRollup;
    if (!r) {
      return {
        villages: "—",
        areaHa: "—",
        farmersRisk: "—",
        highTalukas: "—",
        cropStress: "—",
        cropStressLabel: "—",
        alerts: "—",
      };
    }
    const avg = r.avgImpactScore ?? 0;
    const alertsN = Math.min(
      120,
      (r.criticalPlots ?? 0) * 4 + Math.max(0, Math.round((r.plotCount ?? 0) * 0.015)),
    );
    return {
      villages: r.villagesImpacted,
      areaHa: Math.round(r.totalAreaAffectedHa || 0).toLocaleString("en-IN"),
      farmersRisk: (r.moderatePlusPlots ?? 0).toLocaleString("en-IN"),
      highTalukas: seedRows.length ? highRiskTalukaCount(seedRows) : Math.min(36, (r.criticalPlots ?? 0) + 3),
      cropStress: `${avg}%`,
      cropStressLabel: avg > 60 ? "High" : avg > 40 ? "Moderate" : "Elevated",
      alerts: alertsN,
    };
  }, [displayRollup, seedRows]);

  const profile = useMemo(() => {
    if (s.selectedProperties && Object.keys(s.selectedProperties).length) {
      return { ...DEMO_FARMER, ...s.selectedProperties };
    }
    return { ...DEMO_FARMER, district: s.district || DEMO_FARMER.district };
  }, [s.selectedProperties, s.district]);

  const trendData = useMemo(() => {
    const base = displayRollup?.avgImpactScore ?? 45;
    return Array.from({ length: 30 }, (_, i) => ({
      d: i + 1,
      v: Math.round(
        Math.min(100, Math.max(8, base + ((i * 13 + base) % 19) - 9 + (i % 3))),
      ),
    }));
  }, [displayRollup?.avgImpactScore]);

  const donutData = useMemo(() => {
    const cw = displayRollup?.cropWise;
    if (cw && Object.keys(cw).length) {
      return Object.entries(cw).map(([name, v]) => ({
        name: name.length > 12 ? `${name.slice(0, 11)}…` : name,
        value: Math.round(v.stressedHa * 10) / 10 || 0.1,
      }));
    }
    return [{ name: "No cohort data", value: 1 }];
  }, [displayRollup?.cropWise]);

  const DONUT_COLORS = ["#79c24a", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444"];

  const talukaRows = useMemo(() => {
    if (seedRows.length > 0) {
      const byT = new Map();
      seedRows.forEach((p) => {
        const taluka = String(p.taluka || "").trim() || "—";
        if (!byT.has(taluka)) byT.set(taluka, { scores: [], area: 0 });
        const o = byT.get(taluka);
        o.scores.push(Number(p.governanceImpactScore) || 0);
        o.area += Number(p.area_ha) || 0;
      });
      return [...byT.entries()]
        .map(([taluka, v]) => ({
          taluka,
          score: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
          area: `${Math.round(v.area * 100) / 100} ha`,
        }))
        .sort((a, b) => b.score - a.score)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }
    const talukas =
      s.talukaOptions?.length > 1
        ? s.talukaOptions
        : ["Washim", "Risod", "Mangrulpir", "Karanja", "Malegaon", "Manora"];
    const base = displayRollup?.avgImpactScore || 45;
    return talukas
      .map((t, i) => ({
        taluka: t,
        score: Math.min(92, Math.max(40, base + ((i * 17) % 23) - (i % 4) * 5)),
        area: `${(2100 + i * 412).toLocaleString("en-IN")} ha`,
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [seedRows, s.talukaOptions, displayRollup?.avgImpactScore]);

  const alerts = useMemo(() => getAlertsFeed(s.district || "Washim").slice(0, 4), [s.district]);

  const grievancePie = useMemo(() => {
    const r = displayRollup;
    if (!r) {
      return [
        { name: "Open", value: 34, color: "#f97316" },
        { name: "In progress", value: 33, color: "#eab308" },
        { name: "Resolved", value: 33, color: "#22c55e" },
      ];
    }
    const open = Math.min(55, 18 + (r.criticalPlots ?? 0) * 2 + (r.moderatePlusPlots % 7));
    const prog = Math.min(48, 22 + ((r.plotCount ?? 0) % 11));
    let resolved = 100 - open - prog;
    if (resolved < 12) {
      resolved = 12;
    }
    const sum = open + prog + resolved;
    const scale = 100 / sum;
    return [
      { name: "Open", value: Math.round(open * scale), color: "#f97316" },
      { name: "In progress", value: Math.round(prog * scale), color: "#eab308" },
      { name: "Resolved", value: Math.max(12, 100 - Math.round(open * scale) - Math.round(prog * scale)), color: "#22c55e" },
    ];
  }, [displayRollup]);

  const actionStats = useMemo(() => {
    const r = displayRollup;
    if (!r) return { pending: "—", grievances: "—" };
    return {
      pending: Math.max(3, Math.round((r.plotCount ?? 0) * 0.024)),
      grievances: Math.max(2, Math.round((r.criticalPlots ?? 0) * 1.1 + (r.moderatePlusPlots ?? 0) * 0.008)),
    };
  }, [displayRollup]);

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-[1920px] mx-auto">
      {s.filterStateCode === "MH" && (
        <p className="text-[11px] leading-relaxed text-gray-500 -mt-1 mb-1">
          KPIs and charts use the{" "}
          <strong className="text-gray-300">{FARMER_REGISTRY_SEED_COUNT.toLocaleString("en-IN")} farmer</strong>{" "}
          major-crops cohort
          {s.district
            ? ` · district ${s.district} (${seedRows.length.toLocaleString("en-IN")} records)`
            : ` · all ${MAHARASHTRA_DISTRICTS.length} districts (state view)`}
          . The map shows parcel / boundary layers from Quick filters.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Villages impacted" value={kpis.villages} trend="↑ 18% vs last 7 days" trendUp />
        <KpiCard label="Ha. affected" value={`${kpis.areaHa} ha`} trend="↑ 21% vs last 7 days" trendUp />
        <KpiCard label="Farmers at risk" value={kpis.farmersRisk} trend="↑ 16% vs last 7 days" trendUp />
        <KpiCard
          label="High risk talukas"
          value={
            typeof kpis.highTalukas === "number"
              ? String(kpis.highTalukas).padStart(2, "0")
              : kpis.highTalukas
          }
          trend="↑ 3 vs last 7 days"
          trendUp
        />
        <KpiCard
          label="Crop stress (avg.)"
          value={kpis.cropStress}
          sub={kpis.cropStressLabel}
          trend="↑ vs benchmark"
          trendUp={false}
        />
        <KpiCard label="AI alerts generated" value={String(kpis.alerts)} sub="Today" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        <section className="lg:col-span-2 flex flex-col rounded-xl border border-white/[0.08] bg-[#111820] p-3 shadow-lg min-h-[380px]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Impact intelligence map
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {["Impact", "Stress", "Drought", "Yield", "Disease"].map((x) => (
                <span
                  key={x}
                  className="rounded-md border border-white/[0.08] bg-black/30 px-2 py-0.5 text-[10px] text-gray-500"
                >
                  {x}
                </span>
              ))}
            </div>
          </div>
          <div className="relative flex-1 min-h-[320px] rounded-lg overflow-hidden border border-white/[0.06]">
            <AgriMap
              plotData={s.filteredPlots}
              villageBoundary={s.villageBoundary}
              maharashtraOutline={s.maharashtraOutline}
              maharashtraDistrictsBaseOutline={s.maharashtraDistrictsOutline}
              selectedMhDistrict={s.district}
              showMaharashtraOutline={s.isMaharashtraContext}
              indiaCountryOutline={s.indiaCountryOutline}
              indiaStatesOutline={s.indiaStatesOutline}
              indiaSelectedStateCode={s.filterStateCode}
              showIndiaOutlines={s.isIndiaContext}
              onIndiaStateSelect={s.handleIndiaStateBoundaryClick}
              mapLayer={s.adminMapLayerComputed}
              platformMode="admin"
              selectedPlotId={s.selectedSampleFieldId}
              onPlotClick={s.handlePlotClick}
              showValidationPoints={false}
              regionFallback={s.mapRegionFallback}
              isLoading={s.washimLoading || s.jalnaLoading || s.districtOutlineLoading}
            />
          </div>
          <div className="mt-2">
            <HealthLegend />
          </div>
        </section>

        <FarmerProfileTabs profile={profile} district={s.district} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-white">District impact summary</h3>
            <span className="text-[11px] text-gray-500">
              Score{" "}
              <strong className="text-amber-300">{displayRollup?.avgImpactScore ?? "—"}</strong>/100
              {seedRollup ? (
                <span className="text-gray-600"> · cohort n={seedRows.length}</span>
              ) : null}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-[200px] min-h-[180px]">
              <p className="mb-1 text-[10px] font-semibold uppercase text-gray-500">Impact trend (30 days)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="d" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#111820", border: "1px solid #333", fontSize: 11 }}
                    labelFormatter={(x) => `Day ${x}`}
                  />
                  <Line type="monotone" dataKey="v" stroke="#79c24a" strokeWidth={2} dot={false} name="Impact" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[200px] min-h-[180px]">
              <p className="mb-1 text-[10px] font-semibold uppercase text-gray-500">Crop-wise affected area</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111820", border: "1px solid #333", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4">
          <h3 className="text-sm font-bold text-white mb-3">Taluka impact ranking</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-gray-500">
                  <th className="pb-2 pr-2 font-semibold">Rank</th>
                  <th className="pb-2 pr-2 font-semibold">Taluka</th>
                  <th className="pb-2 pr-2 font-semibold">Impact</th>
                  <th className="pb-2 font-semibold">Area</th>
                </tr>
              </thead>
              <tbody>
                {talukaRows.map((r) => (
                  <tr key={r.taluka} className="border-b border-white/[0.04]">
                    <td className="py-2 pr-2 text-gray-400">{r.rank}</td>
                    <td className="py-2 pr-2 font-medium text-gray-200">{r.taluka}</td>
                    <td className={`py-2 pr-2 font-bold ${scoreColor(r.score)}`}>{r.score}</td>
                    <td className="py-2 text-gray-400">{r.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4 lg:col-span-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">AI alerts</h3>
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[11px] text-gray-300"
              >
                <span
                  className={`mr-1.5 inline-block rounded px-1 text-[9px] font-bold uppercase ${
                    a.severity === "high" ? "bg-red-500/25 text-red-300" : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  {a.type}
                </span>
                {a.detail}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">AI recommendations</h3>
          <ul className="space-y-2 text-[11px] text-gray-300">
            {(displayInsights.length
              ? displayInsights
              : ["Priority irrigation support in stressed clusters."]
            ).slice(0, 4).map((line, i) => (
              <li key={i} className="flex gap-2 border-l-2 border-cg-accent/40 pl-2">
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Action center</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Generate district report", color: "bg-emerald-600/90 hover:bg-emerald-500" },
              { label: "Send advisory", color: "bg-sky-600/90 hover:bg-sky-500" },
              { label: "Trigger field verification", color: "bg-amber-600/90 hover:bg-amber-500" },
              { label: "Approve scheme batch", color: "bg-violet-600/90 hover:bg-violet-500" },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                className={`rounded-lg px-2 py-3 text-[10px] font-bold leading-tight text-white shadow-md transition ${b.color}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[10px] text-gray-500">
            <div className="rounded-md bg-black/30 py-2">
              <p className="font-bold text-white text-lg">{actionStats.pending}</p> Pending applications
            </div>
            <div className="rounded-md bg-black/30 py-2">
              <p className="font-bold text-white text-lg">{actionStats.grievances}</p> Open grievances
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Grievance summary</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={grievancePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={58}
                >
                  {grievancePie.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111820", border: "1px solid #333", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
