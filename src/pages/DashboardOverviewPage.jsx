import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
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

/** Read-only overview of field-delineation results; detection itself lives on the Boundary Delineation page. */
export default function DashboardOverviewPage() {
  const { district } = useAgriPlatform();
  const { saved } = useFieldDelineationContext();

  const detections = useMemo(() => detectionsInDistrict(saved, district), [saved, district]);
  const stats = useMemo(() => summarizeDetections(detections), [detections]);
  const scope = district ? `${district} district` : "All Maharashtra";

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-5 max-w-[1920px] mx-auto">
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
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Field boundary map <span className="font-medium normal-case tracking-normal text-gray-500">· {scope}</span>
          </h3>
          <Link
            to="/boundary-delineation"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cg-accent/30 bg-cg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-cg-accent hover:bg-cg-accent/20"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Boundary delineation
          </Link>
        </div>
        <MaharashtraMap showFieldDelineationPanel={false} showPlaceSearch={false} />
      </section>

      <DetectionsByVillageTable detections={detections} />
    </div>
  );
}
