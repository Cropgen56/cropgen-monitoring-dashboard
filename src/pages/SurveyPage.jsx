import React from "react";
import { PLATFORM_TAGLINE } from "../data/agriStateData";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import PlatformFilterSidebar from "../components/platform/PlatformFilterSidebar";
import CropSurveyPanel from "../components/survey/CropSurveyPanel";
import PageHero from "../components/ui/PageHero";
import DataQualityBanner from "../components/platform/DataQualityBanner";

export default function SurveyPage() {
  const s = useAgriPlatform();
  const mapLayer = s.surveyMapLayer;

  return (
    <div className="space-y-4">
      <PageHero
        accent="sky"
        eyebrow="Satellite crop monitoring"
        title="Classification, NDVI, stress layers, and yield benchmarks"
        description={PLATFORM_TAGLINE}
      />

      <DataQualityBanner mapDataQuality={s.mapDataQuality} />

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
          isLoading={s.washimLoading || s.jalnaLoading}
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
