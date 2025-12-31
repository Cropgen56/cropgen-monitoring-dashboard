// src/components/TimeSeriesCharts.jsx
import React from "react";
import NDVIChart from "./NDVIChart";
import WaterIndexChart from "./WaterIndexChart";
import { useFieldData } from "../context/FieldDataContext";

export default function TimeSeriesCharts() {
  const { fieldData } = useFieldData();

  // Only show when fieldData exists
  if (!fieldData) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* NDVI Chart - Full Width */}
      <div className="bg-[#0C2214] rounded-xl p-4 sm:p-5 md:px-8 md:py-5 text-white">
        <NDVIChart />
      </div>

      {/* Water Index Chart - Full Width */}
      <div className="bg-[#0C2214] rounded-xl p-4 sm:p-5 md:px-8 md:py-5 text-white">
        <WaterIndexChart />
      </div>
    </div>
  );
}
