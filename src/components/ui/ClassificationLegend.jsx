import React from "react";

/** Crop-class colours aligned with `monitoringDefinitions` CROP_HEX */
export default function ClassificationLegend({ className = "" }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-cg-panel/80 p-3 text-[10px] text-gray-400 ${className}`}
    >
      <span className="font-semibold text-cg-accent">Classification legend:</span> Banana · yellow,
      Soybean · green, Rice · blue, Cotton · purple, Sugarcane · orange.
    </div>
  );
}
