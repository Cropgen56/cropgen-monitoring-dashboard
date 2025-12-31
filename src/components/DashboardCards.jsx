import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import ndviIcon from "../assets/ndvi-graph.png";
import areaIcon from "../assets/area.png";
import healthyIcon from "../assets/healthy.png";
import warningIcon from "../assets/warning.png";

const ACRE_TO_HECTARE = 0.404685642;

const DATA = {
  avgNDVI: "0.62",
  healthyFarms: "12 of 15",
  lowIndexFarms: "3",
};

export default function DashboardCards({ selectedCrop }) {
  const { farms } = useSelector((state) => state.farm);

  const totalArea = useMemo(() => {
    if (!Array.isArray(farms)) return 0;

    return farms
      .filter((farm) => {
        if (!selectedCrop) return true;      
        return farm.cropName === selectedCrop;
      })
      .reduce((sum, farm) => {
        const acre = Number(farm.acre || 0);
        return sum + acre * ACRE_TO_HECTARE;
      }, 0);
  }, [farms, selectedCrop]);


  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
      <div className="bg-[#0C2214] rounded-xl p-4 shadow-xl flex justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">Avg. NDVI Value</p>
          <p className="text-white text-xl font-semibold">
            {DATA.avgNDVI}
          </p>
        </div>
        <img src={ndviIcon} className="w-14 h-14 object-contain" />
      </div>

      <div className="bg-[#0C2214] rounded-xl p-4 shadow-xl flex justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">Total Area</p>
          <p className="text-white text-xl font-semibold">
            {totalArea.toFixed(2)}
          </p>
          <span className="text-green-400 text-xs">Hectares</span>
        </div>
        <img src={areaIcon} className="w-14 h-14 object-contain" />
      </div>

      <div className="bg-[#0C2214] rounded-xl p-4 shadow-xl flex justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">Healthy Farms</p>
          <p className="text-white text-xl font-semibold">
            {DATA.healthyFarms}
          </p>
        </div>
        <img src={healthyIcon} className="w-12 h-12 object-contain" />
      </div>

      <div className="bg-[#0C2214] rounded-xl p-4 shadow-xl flex justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">Low Index Farms</p>
          <p className="text-white text-xl font-semibold">
            {DATA.lowIndexFarms}
          </p>
        </div>
        <img src={warningIcon} className="w-12 h-12 object-contain" />
      </div>
    </div>
  );
}
