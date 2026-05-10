import React from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import AdminPanel from "../components/admin/AdminPanel";
import DataQualityBanner from "../components/platform/DataQualityBanner";

export default function AdminPage() {
  const s = useAgriPlatform();
  const mapLayer = s.adminMapLayerComputed;

  return (
    <div className="space-y-4 p-5 md:p-6">
      <DataQualityBanner mapDataQuality={s.mapDataQuality} />

      {s.isMaharashtraContext && s.washimLoadError && s.district === "Washim" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {s.washimLoadError}
        </div>
      )}
      {s.isMaharashtraContext && s.jalnaLoadError && s.district === "Jalna" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {s.jalnaLoadError}
        </div>
      )}
      {s.isMaharashtraContext && s.jalnaLoading && s.district === "Jalna" && !s.jalnaLoadError && (
        <div className="rounded-lg border border-cg-accent/35 bg-cg-accent/10 px-3 py-2 text-xs text-cg-accent">
          Loading Jalna banana plots…
        </div>
      )}

      <AdminPanel
        district={s.district}
        crop={s.crop}
        season={s.season}
        year={s.year}
        filteredPlots={s.filteredPlots}
        villageBoundary={s.villageBoundary}
        maharashtraOutline={s.maharashtraOutline}
        maharashtraDistrictsOutline={s.maharashtraDistrictsOutline}
        showMaharashtraOutline={s.isMaharashtraContext}
        indiaCountryOutline={s.indiaCountryOutline}
        indiaStatesOutline={s.indiaStatesOutline}
        indiaSelectedStateCode={s.filterStateCode}
        showIndiaOutlines={s.isIndiaContext}
        onIndiaStateSelect={s.handleIndiaStateBoundaryClick}
        mapLayer={mapLayer}
        mapRegionFallback={s.mapRegionFallback}
        selectedPlotId={s.selectedSampleFieldId}
        onPlotClick={s.handlePlotClick}
        selectedProperties={s.selectedProperties}
        selectSampleField={s.selectSampleField}
        loadedFieldCount={s.loadedFieldCount}
        isLoading={s.washimLoading || s.jalnaLoading || s.districtOutlineLoading}
        governanceRollup={s.governanceRollup}
        governanceInsights={s.governanceInsights}
        adminMapLayer={s.adminMapLayer}
        setAdminMapLayer={s.setAdminMapLayer}
        showVillageBoundary={s.showVillageBoundary}
        setShowVillageBoundary={s.setShowVillageBoundary}
      />

      {s.fieldData && (
        <div className="rounded-lg border border-white/[0.08] bg-[#111820] px-3 py-2 text-center text-[11px] text-gray-400">
          Selected field context:{" "}
          <span className="font-semibold text-cg-accent">{s.fieldData.selectionLabel}</span> —{" "}
          {s.fieldData.selectionSubtitle}
        </div>
      )}
    </div>
  );
}
