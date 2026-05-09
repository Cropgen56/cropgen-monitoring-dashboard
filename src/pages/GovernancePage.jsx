import React, { useMemo } from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import DataQualityBanner from "../components/platform/DataQualityBanner";
import DocumentAIMock from "../components/governance/DocumentAIMock";
import { listPriorityFarmers, governanceHeatColor } from "../data/governanceEngine";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { downloadCsv, buildDistrictGovernanceRows, buildFarmerExportRows } from "../utils/reportExport";
import { Sparkles, Target, Users } from "lucide-react";

export default function GovernancePage() {
  const s = useAgriPlatform();
  const rollup = s.governanceRollup;
  const insights = s.governanceInsights;

  const priorityList = useMemo(
    () => listPriorityFarmers(s.filteredPlots, 55),
    [s.filteredPlots],
  );

  const cropChartData = useMemo(() => {
    if (!rollup?.cropWise) return [];
    return Object.entries(rollup.cropWise).map(([name, v]) => ({
      crop: name.length > 10 ? `${name.slice(0, 9)}…` : name,
      ha: Math.round(v.ha * 100) / 100,
      stressedHa: Math.round(v.stressedHa * 100) / 100,
    }));
  }, [rollup]);

  return (
    <div className="space-y-4 p-5 md:p-6">
      <DataQualityBanner mapDataQuality={s.mapDataQuality} />

      <div className="space-y-4 min-w-0 max-w-[2000px]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111820] p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Avg impact</p>
              <p className="text-2xl font-bold text-amber-200">{rollup?.avgImpactScore ?? "—"}</p>
              <p className="text-[10px] text-gray-500 mt-1">0–100 composite</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#111820] p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Villages impacted</p>
              <p className="text-2xl font-bold text-white">{rollup?.villagesImpacted ?? 0}</p>
              <p className="text-[10px] text-gray-500 mt-1">Moderate+ stress</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#111820] p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Area affected</p>
              <p className="text-2xl font-bold text-sky-200">
                {rollup?.totalAreaAffectedHa != null ? `${rollup.totalAreaAffectedHa} ha` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-[10px] text-red-200/80 uppercase tracking-wide">Critical parcels</p>
              <p className="text-2xl font-bold text-red-200">{rollup?.criticalPlots ?? 0}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-cg-accent/30 bg-[#111820] p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-cg-accent" />
              AI governance insights
            </h3>
            <ul className="mt-3 space-y-2">
              {insights.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs text-gray-300 leading-relaxed border-l-2 border-cg-accent/40 pl-3"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111820] p-4 min-h-[260px]">
              <h3 className="text-sm font-bold text-white mb-3">Crop-wise area &amp; stressed ha</h3>
              {cropChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cropChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                    <XAxis dataKey="crop" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0c2214",
                        border: "1px solid #334433",
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="ha" fill="#3b82f6" name="Total ha" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stressedHa" fill="#f97316" name="Stressed ha" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-500 py-8 text-center">Load plot polygons to see distribution.</p>
              )}
            </div>

            <DocumentAIMock />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111820] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Target className="h-4 w-4 text-orange-400" />
                Priority farmers (impact ≥ 55)
              </h3>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `cropgen-priority-${s.district || "export"}.csv`,
                    priorityList.map((x) => ({
                      id: x.id,
                      farmer: x.name,
                      village: x.village,
                      crop: x.crop,
                      impact: x.score,
                      band: x.band,
                    })),
                  )
                }
                className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/15"
              >
                Export CSV
              </button>
            </div>
            {priorityList.length === 0 ? (
              <p className="text-xs text-gray-500">No high-priority parcels in current filter.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {priorityList.map((x) => {
                  const col = governanceHeatColor(x.score);
                  return (
                    <li
                      key={x.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/25 px-3 py-2 text-[11px]"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Users className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                        <span className="truncate text-gray-200">{x.name}</span>
                        <span className="text-gray-500 truncate">{x.village}</span>
                      </span>
                      <span
                        className="shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold"
                        style={{ background: `${col.fill}44`, color: "#fff" }}
                      >
                        {x.score} · {x.band}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `cropgen-district-rollup-${s.district || "all"}.csv`,
                  buildDistrictGovernanceRows(rollup, s.district),
                )
              }
              className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
            >
              District impact report (CSV)
            </button>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `cropgen-farmers-${s.district || "all"}.csv`,
                  buildFarmerExportRows(s.filteredPlots),
                )
              }
              className="rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-900/40"
            >
              Farmer / verification export (CSV)
            </button>
          </div>
      </div>
    </div>
  );
}
