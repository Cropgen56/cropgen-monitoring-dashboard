import React, { useMemo } from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import MaharashtraMap from "../components/map/MaharashtraMap";
import { DetectionsByVillageTable } from "../components/delineation/DetectionTables";
import { ACRES_PER_HA, detectionsInDistrict, summarizeDetections } from "../utils/delineationStats";

function KpiCard({ label, value, sub }) {
  return (
    <div className="dashboard-stat-card">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-white tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-500">{sub}</p>}
    </div>
  );
}

/** Overview built only from live field-delineation results. */
export default function DashboardOverviewPage() {
  const { district } = useAgriPlatform();
  const { saved, removeSaved } = useFieldDelineationContext();

  const detections = useMemo(() => detectionsInDistrict(saved, district), [saved, district]);
  const stats = useMemo(() => summarizeDetections(detections), [detections]);
  const scope = district ? `${district} district` : "All Maharashtra";

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-[1920px] mx-auto">
      <p className="-mt-1 text-[11px] leading-relaxed text-gray-500">
        Figures come from AI field detection runs ({scope}). Click a district on the map to focus it, or search a
        place to start a detection.
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Villages mapped" value={stats.villages} sub={scope} />
        <KpiCard label="Fields detected" value={stats.fields.toLocaleString("en-IN")} />
        <KpiCard label="Area mapped" value={`${stats.areaHa.toFixed(1)} ha`} sub={`${(stats.areaHa * ACRES_PER_HA).toFixed(1)} ac`} />
        <KpiCard
          label="Average field size"
          value={stats.fields ? `${(stats.avgFieldHa * ACRES_PER_HA).toFixed(2)} ac` : "—"}
          sub={stats.fields ? `${stats.avgFieldHa.toFixed(3)} ha` : undefined}
        />
      </div>

      <section className="rounded-xl border border-white/[0.08] bg-[#111820] p-3 shadow-lg">
        <h3 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-gray-400">
          Field boundary map
        </h3>
        <MaharashtraMap />
      </section>

      <DetectionsByVillageTable detections={detections} onRemove={removeSaved} />
    </div>
  );
}
