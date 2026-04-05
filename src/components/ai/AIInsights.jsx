import React from "react";
import { Sparkles, AlertTriangle, TrendingDown } from "lucide-react";
import { getDistrictInsights } from "../../data/agriStateData";

/**
 * Optional tab: cluster-level AI narrative and recommendations.
 */
export default function AIInsights({ district }) {
  const d = getDistrictInsights(district);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-[#0a180f] p-5 shadow-md">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-500/20 p-2">
            <Sparkles className="h-6 w-6 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI insights — {d.district}</h2>
            <p className="mt-1 text-sm text-gray-400">
              Modelled risk surfaces and agronomic recommendations for the selected district.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-red-500/25 bg-red-950/20 p-4 shadow-md">
          <h3 className="flex items-center gap-2 text-sm font-bold text-red-200">
            <AlertTriangle className="h-4 w-4" />
            High risk zones
          </h3>
          <p className="mt-2 text-2xl font-bold text-white">{d.highRiskZonesHa} ha</p>
          <p className="mt-1 text-[11px] text-gray-400">
            Combined drought stress, NDVI anomaly, and claims frequency.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4 shadow-md">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-200">
            <TrendingDown className="h-4 w-4" />
            Low productivity areas
          </h3>
          <p className="mt-2 text-2xl font-bold text-white">{d.lowProductivityClusters}</p>
          <p className="mt-1 text-[11px] text-gray-400">
            Clusters below district benchmark yield with stable inputs.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-cg-accent/35 bg-cg-panel p-5 shadow-md">
        <h3 className="text-sm font-bold text-cg-accent">Recommendation</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-200">{d.aiRecommendation}</p>
        <p className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
          <span className="font-semibold text-white">Nitrogen advisory:</span> Reduce nitrogen usage by{" "}
          <span className="font-bold text-amber-300">18%</span> in high-overlap clusters where VHI remains
          strong but fertilizer efficiency scores are below the district median.
        </p>
      </div>
    </div>
  );
}
