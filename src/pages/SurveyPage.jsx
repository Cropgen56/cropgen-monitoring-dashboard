import React from "react";
import { PLATFORM_TAGLINE } from "../data/agriStateData";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import PlatformFilterSidebar from "../components/platform/PlatformFilterSidebar";
import CropSurveyPanel from "../components/survey/CropSurveyPanel";

export default function SurveyPage() {
  const s = useAgriPlatform();
  const mapLayer = s.surveyMapLayer;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-[#0a180f]/90 to-cg-panel/90 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Satellite crop monitoring
            </p>
            <h2 className="mt-1 text-[15px] sm:text-base font-semibold text-white leading-snug">
              Classification, NDVI, stress layers, and yield benchmarks
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed sm:max-w-sm lg:text-right">
            {PLATFORM_TAGLINE}
          </p>
        </div>
      </div>

      {s.washimLoadError && s.district === "Washim" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {s.washimLoadError}
        </div>
      )}
      {s.jalnaLoadError && s.district === "Jalna" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {s.jalnaLoadError}
        </div>
      )}
      {s.jalnaLoading && s.district === "Jalna" && !s.jalnaLoadError && (
        <div className="rounded-lg border border-cg-accent/35 bg-cg-accent/10 px-3 py-2 text-xs text-cg-accent">
          Loading Jalna banana plots…
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <PlatformFilterSidebar variant="survey" {...s} />
        <CropSurveyPanel
          district={s.district}
          filteredPlots={s.filteredPlots}
          villageBoundary={s.villageBoundary}
          mapLayer={mapLayer}
          mapRegionFallback={s.mapRegionFallback}
          selectedPlotId={s.selectedSampleFieldId}
          onPlotClick={s.handlePlotClick}
          showValidationPoints={s.showValidation && s.district === "Jalgaon"}
          yieldCompareData={s.yieldCompareData}
          historicalYield={s.historicalYield}
          selectedProperties={s.selectedProperties}
        />
      </div>

      {s.fieldData && (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center text-[11px] text-gray-400">
          Charts below use the selected field:{" "}
          <span className="font-semibold text-cg-accent">{s.fieldData.selectionLabel}</span> —{" "}
          {s.fieldData.selectionSubtitle}
        </div>
      )}
    </div>
  );
}
