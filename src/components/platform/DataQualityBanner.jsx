import React from "react";
import { MAP_DATA_MODE } from "../../data/monitoringDefinitions";

/**
 * Explains when the map shows district outline only vs plot polygons (demo scope).
 */
export default function DataQualityBanner({ mapDataQuality }) {
  if (!mapDataQuality?.hint) return null;
  if (mapDataQuality.mode === MAP_DATA_MODE.FIELD_POLYGONS) return null;

  const isOutline = mapDataQuality.mode === MAP_DATA_MODE.DISTRICT_OUTLINE;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
        isOutline
          ? "border-amber-500/35 bg-amber-950/20 text-amber-100/95"
          : "border-white/15 bg-black/25 text-gray-400"
      }`}
      role="status"
    >
      <span className={`font-semibold ${isOutline ? "text-amber-200" : "text-gray-300"}`}>
        Map scope:{" "}
      </span>
      {mapDataQuality.hint}
    </div>
  );
}
