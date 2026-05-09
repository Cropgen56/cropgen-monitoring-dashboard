import React from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import CropSurveyPanel from "../components/survey/CropSurveyPanel";
import DataQualityBanner from "../components/platform/DataQualityBanner";
import SoilHealth from "../components/SoilHealth";
import TimeSeriesCharts from "../components/TimeSeriesCharts";

export default function SurveyPage() {
  const s = useAgriPlatform();
  const mapLayer = s.surveyMapLayer;

  return (
    <div className="space-y-4 p-5 md:p-6">
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

      <CropSurveyPanel
        district={s.district}
        filteredPlots={s.filteredPlots}
        villageBoundary={s.villageBoundary}
        maharashtraOutline={s.maharashtraOutline}
        mapLayer={mapLayer}
        mapRegionFallback={s.mapRegionFallback}
        selectedPlotId={s.selectedSampleFieldId}
        onPlotClick={s.handlePlotClick}
        showValidationPoints={s.showValidation && s.district === "Jalgaon"}
        yieldCompareData={s.yieldCompareData}
        historicalYield={s.historicalYield}
        selectedProperties={s.selectedProperties}
        isLoading={s.washimLoading || s.jalnaLoading}
        setSurveyMapLayer={s.setSurveyMapLayer}
        showValidation={s.showValidation}
        setShowValidation={s.setShowValidation}
      />

      {s.fieldData && (
        <div className="rounded-lg border border-white/[0.08] bg-[#111820] px-3 py-2 text-center text-[11px] text-gray-400">
          Charts use the selected field:{" "}
          <span className="font-semibold text-cg-accent">{s.fieldData.selectionLabel}</span> —{" "}
          {s.fieldData.selectionSubtitle}
        </div>
      )}

      <div className="space-y-4 pt-2">
        <SoilHealth />
        <TimeSeriesCharts />
      </div>
    </div>
  );
}
