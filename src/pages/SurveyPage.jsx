import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import MaharashtraMap from "../components/map/MaharashtraMap";
import { DetectedFieldsTable } from "../components/delineation/DetectionTables";
import { detectionsInDistrict } from "../utils/delineationStats";

function downloadGeoJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/geo+json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Crop monitoring workspace: satellite map with field detection, and the detected field list. */
export default function SurveyPage() {
  const { district } = useAgriPlatform();
  const { saved } = useFieldDelineationContext();
  const detections = useMemo(() => detectionsInDistrict(saved, district), [saved, district]);

  const exportFields = () =>
    downloadGeoJson(
      { type: "FeatureCollection", features: detections.flatMap((r) => r.fields.features) },
      `fields-${district || "maharashtra"}.geojson`,
    );

  return (
    <div className="space-y-4 p-5 md:p-6">
      <MaharashtraMap heightClass="h-[min(70vh,680px)]" />
      <DetectedFieldsTable
        detections={detections}
        actions={
          detections.length > 0 && (
            <button
              type="button"
              onClick={exportFields}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-black/30 px-3 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/[0.06]"
            >
              <Download className="h-3.5 w-3.5" /> GeoJSON
            </button>
          )
        }
      />
    </div>
  );
}
