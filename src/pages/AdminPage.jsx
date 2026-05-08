import React from "react";
import { PLATFORM_TAGLINE } from "../data/agriStateData";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import PlatformFilterSidebar from "../components/platform/PlatformFilterSidebar";
import AdminPanel from "../components/admin/AdminPanel";
import PageHero from "../components/ui/PageHero";
import DataQualityBanner from "../components/platform/DataQualityBanner";

export default function AdminPage() {
  const s = useAgriPlatform();
  const mapLayer = s.adminMapLayerComputed;

  return (
    <div className="space-y-4">
      <PageHero
        accent="emerald"
        eyebrow="Government console"
        title="KPIs, farmer mapping, schemes, alerts, and desk actions"
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
        <PlatformFilterSidebar variant="admin" {...s} />
        <AdminPanel
          district={s.district}
          crop={s.crop}
          season={s.season}
          year={s.year}
          filteredPlots={s.filteredPlots}
          villageBoundary={s.villageBoundary}
          mapLayer={mapLayer}
          mapRegionFallback={s.mapRegionFallback}
          selectedPlotId={s.selectedSampleFieldId}
          onPlotClick={s.handlePlotClick}
          selectedProperties={s.selectedProperties}
          selectSampleField={s.selectSampleField}
          loadedFieldCount={s.loadedFieldCount}
          isLoading={s.washimLoading || s.jalnaLoading}
        />
      </div>

      {s.fieldData && (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center text-[11px] text-gray-400">
          Selected field context:{" "}
          <span className="font-semibold text-cg-accent">{s.fieldData.selectionLabel}</span> —{" "}
          {s.fieldData.selectionSubtitle}
        </div>
      )}
    </div>
  );
}
