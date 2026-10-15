import React, { useMemo } from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import MaharashtraMap from "../components/map/MaharashtraMap";
import FieldDelineationPanel from "../components/delineation/FieldDelineationPanel";
import { DetectionsByVillageTable } from "../components/delineation/DetectionTables";
import { detectionsInDistrict } from "../utils/delineationStats";

/**
 * The field boundary delineation workspace: pick a village (top bar, map click or place search),
 * then detect all its farms or draw a smaller area. Saved detections feed every other page.
 */
export default function BoundaryDelineationPage() {
  const { district } = useAgriPlatform();
  const { saved, removeSaved } = useFieldDelineationContext();
  const detections = useMemo(() => detectionsInDistrict(saved, district), [saved, district]);

  return (
    <div className="space-y-4 p-3 sm:p-5 md:p-6">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <MaharashtraMap heightClass="h-[min(72vh,700px)]" showFieldDelineationPanel={false} />
        <aside className="space-y-4">
          <FieldDelineationPanel placement="inline" />
          <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4 text-[11px] leading-relaxed text-gray-400">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">How it works</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Choose a district, taluka and village in the top bar, click a village on the map, or search a place.</li>
              <li>Run <span className="text-gray-200">Show all farms in village</span>, or draw a smaller area.</li>
              <li>Detected farms are saved and used by Crop Classification, Crop Monitoring and Farm Report.</li>
            </ol>
          </div>
        </aside>
      </div>

      <DetectionsByVillageTable detections={detections} onRemove={removeSaved} />
    </div>
  );
}
