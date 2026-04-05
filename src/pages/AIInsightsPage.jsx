import React from "react";
import { PLATFORM_TAGLINE } from "../data/agriStateData";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import AIInsights from "../components/ai/AIInsights";

export default function AIInsightsPage() {
  const { district } = useAgriPlatform();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-[#0a180f]/90 to-cg-panel/90 px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          AI layer
        </p>
        <h2 className="mt-1 text-[15px] sm:text-base font-semibold text-white leading-snug">
          Cluster intelligence — uses district filter from the workspace
        </h2>
        <p className="mt-2 text-[11px] text-gray-400">{PLATFORM_TAGLINE}</p>
      </div>
      <AIInsights district={district} />
    </div>
  );
}
