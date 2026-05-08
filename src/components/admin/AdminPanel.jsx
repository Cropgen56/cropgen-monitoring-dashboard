import React, { useMemo, useState } from "react";
import { AlertTriangle, MapPinned, Sparkles } from "lucide-react";
import AgriMap from "../hackathon/AgriMap";
import HealthLegend from "../ui/HealthLegend";
import PanelSkeleton from "../ui/PanelSkeleton";
import { useFieldData } from "../../context/FieldDataContext";
import {
  stateSummary,
  getDistrictInsights,
  getClusterAnalytics,
  getAlertsFeed,
} from "../../data/agriStateData";
import { CropHealthCard, SoilAnalysisCard, formatINR } from "../hackathon/fieldDetailCards";

const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "farmer_mapping", label: "Farmer mapping" },
  { id: "schemes", label: "Schemes" },
  { id: "alerts", label: "Alerts" },
  { id: "actions", label: "Actions" },
];

const PRIORITY_DESK = [
  {
    id: "p1",
    title: "Drought risk",
    severity: "High",
    detail: "NDVI stress pattern in cluster — review irrigation scheduling.",
    box: "border-red-800/50 bg-red-950/35",
  },
  {
    id: "p2",
    title: "Pest alert",
    severity: "Medium",
    detail: "Scouting recommended on adjacent plots (demo signal).",
    box: "border-amber-700/50 bg-amber-950/30",
  },
  {
    id: "p3",
    title: "Low yield warning",
    severity: "Medium",
    detail: "Predicted yield below district benchmark — verify inputs.",
    box: "border-lime-800/40 bg-lime-950/20",
  },
];

const ACTION_ITEMS = [
  { id: "ac1", label: "Mark for inspection", border: "border-amber-500/60" },
  { id: "ac2", label: "Approve subsidy (PM-KISAN)", border: "border-emerald-500/60" },
  { id: "ac3", label: "Send advisory", border: "border-sky-500/60" },
  { id: "ac4", label: "Flag high risk", border: "border-red-600/60" },
];

function aiRiskScore(p) {
  if (!p) return 33;
  const tags = p.aiRiskTags || [];
  let base = 28;
  if (tags.includes("high_risk_zone")) base += 40;
  if (tags.includes("moderate_et_deficit")) base += 12;
  if (tags.includes("over_fertilization")) base += 8;
  return Math.min(99, Math.round(base));
}

function productivityScore(p) {
  if (!p) return 85;
  const v = Number(p.cropHealthPercent ?? p.vhi ?? 70);
  return Math.min(100, Math.max(0, Math.round(v)));
}

function row(label, value, valueClass = "text-white text-right") {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={`min-w-0 ${valueClass}`}>{value}</dd>
    </div>
  );
}

/**
 * Government admin: sub-tabs (dashboard, farmer mapping, schemes, alerts, actions).
 */
export default function AdminPanel({
  district,
  crop,
  season,
  year,
  filteredPlots,
  villageBoundary,
  mapLayer,
  mapRegionFallback,
  selectedPlotId,
  onPlotClick,
  selectedProperties: p,
  selectSampleField,
  loadedFieldCount,
  isLoading = false,
}) {
  const { governmentPrograms } = useFieldData();
  const [adminTab, setAdminTab] = useState("farmer_mapping");
  const [schemePick, setSchemePick] = useState("PM-KISAN");
  const [schemeNotice, setSchemeNotice] = useState("");
  const [schemeDecision, setSchemeDecision] = useState({});

  const districtInsights = useMemo(() => getDistrictInsights(district), [district]);
  const clusterRows = useMemo(() => getClusterAnalytics(district), [district]);
  const alertsForDistrict = useMemo(() => getAlertsFeed(district), [district]);

  const govSchemesList = useMemo(() => {
    const fromPlot = p?.schemesMahadbt?.length
      ? p.schemesMahadbt.map((s) => ({
          name: s.name,
          subsidy: s.subsidyINR,
          status: "active",
          key: s.name,
        }))
      : null;
    if (fromPlot) return fromPlot;
    return governmentPrograms.schemes.map((s) => ({
      name: s.name,
      subsidy: s.amount,
      status: s.status,
      key: s.name,
    }));
  }, [p, governmentPrograms.schemes]);

  const insuranceBlock = useMemo(() => {
    const prov = p?.insurance?.scheme || governmentPrograms.insurance.provider;
    const claimed = p?.insurance?.claimed;
    const status =
      claimed === true ? "claimed" : claimed === false ? "no claim" : governmentPrograms.insurance.status;
    const amt = governmentPrograms.insurance.amount;
    return { prov, status, amt };
  }, [p, governmentPrograms.insurance]);

  const loanBlock = useMemo(() => {
    if (p?.cropLoan?.availed) {
      return { status: "active", amount: p.cropLoan.amountINR };
    }
    return { status: governmentPrograms.loan.status, amount: governmentPrograms.loan.amount };
  }, [p, governmentPrograms.loan]);

  const pillClass = (id) =>
    `rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
      adminTab === id
        ? "bg-cg-accent text-[#0c2214] shadow-md"
        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="lg:col-span-9 space-y-4 min-w-0">
      {/* Header */}
      <div className="rounded-xl border border-[#1a3a22] bg-[#0a120d]/90 px-4 py-4 shadow-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cg-accent">
          Government admin
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Dashboard, farmer records, schemes &amp; alerts — data from FieldDataContext
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Admin sections">
          {ADMIN_TABS.map((t) => (
            <button key={t.id} type="button" className={pillClass(t.id)} onClick={() => setAdminTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard */}
      {adminTab === "dashboard" && (
        <div className="space-y-4 ">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
              <p className="text-[10px] text-gray-500">Total farmers</p>
              <p className="text-xl font-bold text-amber-200">
                {(stateSummary.totalFarmersRegistered / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
              <p className="text-[10px] text-gray-500">Total land area</p>
              <p className="text-xl font-bold text-white">
                {(stateSummary.totalAreaAcres / 1_000_000).toFixed(2)}M ac
              </p>
            </div>
            <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
              <p className="text-[10px] text-gray-500">Insurance coverage</p>
              <p className="text-xl font-bold text-emerald-400">
                {stateSummary.insurancePmfbCoveragePct}%
              </p>
            </div>
            <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
              <p className="text-[10px] text-gray-500">Scheme utilization</p>
              <p className="text-xl font-bold text-lime-300">
                {stateSummary.schemeUtilizationMahadbtPct}%
              </p>
            </div>
            <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md col-span-2 md:col-span-1">
              <p className="text-[10px] text-gray-500">Loan distribution</p>
              <p className="text-sm font-bold text-amber-200">
                {formatINR(stateSummary.cropLoanDisbursedCrINR * 10000000)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3 col-span-2 md:col-span-3">
              <p className="text-[10px] text-amber-200/90">
                Rule-based alerts across loaded fields:{" "}
                <strong className="text-amber-100">{loadedFieldCount}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-cg-accent" />
              District — {districtInsights.district}
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-gray-300">
              <li className="flex justify-between">
                <span>High-risk zones</span>
                <span className="text-red-300">{districtInsights.highRiskZonesHa} ha</span>
              </li>
              <li className="flex justify-between">
                <span>Low productivity clusters</span>
                <span>{districtInsights.lowProductivityClusters}</span>
              </li>
            </ul>
            <p className="mt-3 rounded-lg bg-black/40 p-2 text-[11px] text-cg-accent border border-white/5">
              {districtInsights.aiRecommendation}
            </p>
          </div>

          <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
            <h3 className="text-sm font-bold text-white">Cluster analytics</h3>
            <div className="mt-2 max-h-40 overflow-y-auto text-[11px]">
              <table className="w-full text-left text-gray-300">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-1 pr-2">Cluster</th>
                    <th className="pb-1">Yld t/ac</th>
                  </tr>
                </thead>
                <tbody>
                  {clusterRows.map((row) => (
                    <tr key={row.clusterId} className="border-t border-white/5">
                      <td className="py-1 pr-2 font-mono text-[10px]">{row.clusterId}</td>
                      <td className="text-emerald-300">{row.yieldPerAcreTon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-500/25 bg-orange-950/15 p-4 shadow-md">
            <h3 className="text-sm font-bold text-orange-200">Operational alerts</h3>
            <ul className="mt-2 space-y-2">
              {alertsForDistrict.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-white/5 bg-black/25 p-2 text-[11px] text-gray-200"
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
                  {a.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Farmer mapping — map + detail */}
      {adminTab === "farmer_mapping" && (
        <div className="grid gap-4 lg:grid-cols-9 ">
          <section className="lg:col-span-6 space-y-2 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Farmer mapping
            </p>
            <AgriMap
              plotData={filteredPlots}
              villageBoundary={villageBoundary}
              mapLayer={mapLayer}
              platformMode="admin"
              selectedPlotId={selectedPlotId}
              onPlotClick={onPlotClick}
              showValidationPoints={false}
              regionFallback={mapRegionFallback}
              isLoading={isLoading}
            />
            <HealthLegend />
          </section>

          <aside className="custom-scrollbar lg:col-span-3 space-y-3 lg:max-h-[min(78vh,720px)] lg:overflow-y-auto">
            {isLoading && <PanelSkeleton blocks={4} />}

            {!isLoading && (
              <>
            {/* Crop title card — mockup */}
            <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 text-center shadow-md">
              <p className="text-lg font-bold text-amber-200">{crop || "All crops"}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Season {season} · Filter year {year}
              </p>
            </div>

            {!p && (
              <p className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-center text-[11px] text-gray-500">
                Select a plot on the map to load farmer profile, land, and government data.
              </p>
            )}

            {p && (
              <>
                <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
                  <h3 className="text-sm font-bold text-white">Farmer profile</h3>
                  <dl className="mt-3 space-y-2">
                    {row("Name", p.farmerName)}
                    {row("Mobile", p.mobile)}
                    {row("Aadhaar", p.aadhaarMasked || "XXXX XXXX 1234", "font-mono text-[11px] text-right text-gray-200")}
                    {row("Village / Taluka", `${p.village}, ${p.taluka}`)}
                    {row("District", p.district || district)}
                  </dl>
                </div>

                <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <MapPinned className="h-4 w-4 text-cg-accent" />
                    Land
                  </h3>
                  <dl className="mt-3 space-y-2">
                    {row("Survey / Gat", `${p.surveyNo} · ${p.gatNo || "—"}`)}
                    {row("Area", `${p.area_ha} ha`)}
                    {row("Irrigation", p.irrigationType)}
                  </dl>
                </div>

                <CropHealthCard p={p} />
                <SoilAnalysisCard p={p} />

                {/* Government data — mockup layout */}
                <div className="rounded-2xl border border-emerald-800/40 bg-[#081208] p-4 shadow-md">
                  <h3 className="text-sm font-bold text-white">Government data</h3>

                  <div className="mt-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
                      Insurance
                    </p>
                    {row("Provider", insuranceBlock.prov)}
                    {row(
                      "Status",
                      insuranceBlock.status,
                      insuranceBlock.status === "claimed" ? "text-amber-300 font-semibold text-right" : "text-right text-gray-200",
                    )}
                    {row("Claim / coverage", formatINR(insuranceBlock.amt), "text-emerald-400 font-semibold text-right")}
                  </div>

                  <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">Loan</p>
                    {row("Status", loanBlock.status)}
                    {row("Amount", formatINR(loanBlock.amount), "text-right text-white")}
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 mb-2">
                      Schemes
                    </p>
                    <div className="grid gap-2">
                      {govSchemesList.map((s) => (
                        <div
                          key={s.key}
                          className="rounded-xl border border-white/10 bg-black/30 p-3 flex justify-between items-start gap-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{s.name}</p>
                            <p className="text-[11px] text-gray-500">
                              Subsidy: {s.subsidy != null ? formatINR(s.subsidy) : "—"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${
                              String(s.status).toLowerCase() === "received"
                                ? "bg-lime-500/25 text-lime-200"
                                : "bg-slate-700 text-slate-200"
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-3 text-center shadow-md">
                    <p className="text-[10px] text-gray-500">AI risk score</p>
                    <p className="text-2xl font-bold text-amber-200">{aiRiskScore(p)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-3 text-center shadow-md">
                    <p className="text-[10px] text-gray-500">Productivity</p>
                    <p className="text-2xl font-bold text-lime-400">{productivityScore(p)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => selectSampleField(null)}
                  className="w-full rounded-2xl border border-white/15 bg-[#0a180f] py-2.5 text-xs text-gray-300 shadow-md hover:bg-white/5"
                >
                  Clear selection
                </button>
              </>
            )}
              </>
            )}
          </aside>
        </div>
      )}

      {/* Schemes management */}
      {adminTab === "schemes" && (
        <div className="space-y-4  max-w-2xl">
          <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Add / update scheme</p>
            <select
              value={schemePick}
              onChange={(e) => setSchemePick(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-[#071008] px-3 py-2 text-sm text-white"
            >
              <option value="PM-KISAN">PM-KISAN</option>
              <option value="Soil Health Card">Soil Health Card</option>
              <option value="Micro irrigation">Micro irrigation</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSchemeNotice(`Applied “${schemePick}” to workflow (demo).`);
                setTimeout(() => setSchemeNotice(""), 3500);
              }}
              className="mt-3 w-full rounded-xl bg-cg-accent py-3 text-sm font-bold text-[#0c2214] shadow-md hover:brightness-110"
            >
              Apply scheme
            </button>
            {schemeNotice && (
              <p className="mt-2 text-center text-[11px] text-lime-300">{schemeNotice}</p>
            )}
          </div>

          {govSchemesList.map((s) => {
            const dec = schemeDecision[s.key];
            return (
              <div
                key={s.key}
                className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md relative"
              >
                <span
                  className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${
                    String(s.status).toLowerCase() === "received"
                      ? "bg-lime-500/30 text-lime-100"
                      : "bg-sky-900/60 text-sky-100"
                  }`}
                >
                  {dec || s.status}
                </span>
                <p className="text-base font-bold text-white pr-24">{s.name}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Subsidy: {s.subsidy != null ? formatINR(s.subsidy) : "—"}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSchemeDecision((o) => ({ ...o, [s.key]: "approved" }))}
                    className="flex-1 rounded-lg bg-emerald-900/50 py-2 text-xs font-semibold text-emerald-100 border border-emerald-700/40 hover:bg-emerald-800/50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemeDecision((o) => ({ ...o, [s.key]: "rejected" }))}
                    className="flex-1 rounded-lg bg-red-950/60 py-2 text-xs font-semibold text-red-100 border border-red-800/40 hover:bg-red-900/50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alerts */}
      {adminTab === "alerts" && (
        <div className="space-y-4  max-w-3xl">
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/10 px-4 py-3 text-[11px] text-amber-100/90">
            Rule-based alerts across loaded fields: <strong>{loadedFieldCount}</strong>
          </div>

          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Priority desk alerts (demo)
          </h3>
          <div className="grid gap-3 md:grid-cols-1">
            {PRIORITY_DESK.map((x) => (
              <div key={x.id} className={`rounded-2xl border p-4 shadow-md ${x.box}`}>
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-white">{x.title}</span>
                  <span className="text-[10px] uppercase text-gray-400">{x.severity}</span>
                </div>
                <p className="mt-2 text-[11px] text-gray-300 leading-relaxed">{x.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">Insurance</p>
            <dl className="mt-2 space-y-2 text-xs">
              {row("Provider", governmentPrograms.insurance.provider)}
              {row("Status", governmentPrograms.insurance.status, "text-amber-300 font-semibold text-right")}
              {row("Claim amount", formatINR(governmentPrograms.insurance.amount), "text-emerald-400 text-right")}
            </dl>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 shadow-md overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">Alerts</p>
            <div className="mt-3 flex rounded-lg border border-white/10 bg-black/30">
              <div className="w-1 bg-amber-400 shrink-0" />
              <div className="p-3 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">DROUGHT</span>
                  <span className="text-gray-500">medium</span>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  Water index below 0.2 — irrigation / soil moisture review recommended.
                </p>
                <span className="mt-2 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-gray-500">
                  RULE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {adminTab === "actions" && (
        <div className="space-y-3 max-w-2xl ">
          {ACTION_ITEMS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`w-full rounded-2xl border-2 ${a.border} bg-[#0a180f] px-4 py-4 text-left text-sm font-medium text-white shadow-md hover:bg-white/5 transition`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
