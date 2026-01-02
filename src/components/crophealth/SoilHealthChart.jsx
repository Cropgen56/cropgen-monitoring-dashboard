import React from "react";
import soilTemperature from "../../assets/soil-temperature1.svg";
import soilMoisture from "../../assets/soil-moisture.svg";
import soilLayerImage from "../../assets/soil-layer.svg";
import leftVector from "../../assets/Vector 143.png";
import rightVector from "../../assets/Vector 144.png";
import st from "../../assets/st.png";
import soil_Moisture from "../../assets/vector (5).png";

const SoilHealthChart = () => {
  const soilData = {
    surface: { temperature: "24", moisture: "0.22" },
    subsoil: { temperature: "22", moisture: "0.25" },
    parentMaterial: { temperature: "20", moisture: "0.28" },
  };

  return (
    <div
      className="w-full max-w-full sm:max-w-[500px] lg:max-w-[600px] mx-auto p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl mt-2 sm:mt-3"
      style={{ backgroundColor: "#0C2214" }}
    >
      <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 md:gap-4 mt-1 sm:mt-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-cg-accent/20 border border-cg-accent/30 rounded-lg shadow-md p-1.5 sm:p-2">
          <img src={soilTemperature} alt="Soil Temperature" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
          <div className="flex flex-col items-center">
            <span className="text-white font-medium text-[9px] sm:text-[10px] whitespace-nowrap">Temperature</span>
            <span className="text-cg-accent font-bold text-[10px] sm:text-xs">{soilData.surface.temperature}°C</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-cg-accent/20 border border-cg-accent/30 rounded-lg shadow-md p-1.5 sm:p-2">
          <img src={soilMoisture} alt="Soil Moisture" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
          <div className="flex flex-col items-center">
            <span className="font-medium text-[9px] sm:text-[10px] text-white whitespace-nowrap">Moisture</span>
            <span className="text-cg-accent font-bold text-[10px] sm:text-xs">{soilData.surface.moisture} m³/m³</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex flex-col items-center gap-1 w-[35%] sm:w-[40%]">
          <h2 className="text-cg-accent text-[10px] sm:text-xs font-bold text-center">Subsoil (5cm)</h2>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-2 sm:mb-4">
            <div className="flex items-center gap-1 p-1 sm:p-1.5">
              <img src={st} alt="Soil Temperature" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 object-contain" />
              <div className="flex flex-col gap-0.5 sm:gap-1 items-start">
                <span className="text-gray-300 font-medium text-[8px] sm:text-[9px] whitespace-nowrap">Temperature</span>
                <span className="text-white font-semibold text-[9px] sm:text-[10px]">{soilData.subsoil.temperature}°C</span>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 sm:p-1.5">
              <img src={soil_Moisture} alt="Soil Moisture" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 object-contain" />
              <div className="flex flex-col gap-0.5 sm:gap-1 items-start">
                <span className="text-gray-300 font-medium text-[8px] sm:text-[9px] whitespace-nowrap">Moisture</span>
                <span className="text-white font-semibold text-[9px] sm:text-[10px]">{soilData.subsoil.moisture} m³/m³</span>
              </div>
            </div>
          </div>

          <h2 className="text-cg-accent font-bold text-[10px] sm:text-xs text-center">Parent Material (15cm)</h2>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 lg:gap-4">
            <div className="flex items-center gap-1 p-1 sm:p-1.5">
              <img src={st} alt="Soil Temperature" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 object-contain" />
              <div className="flex flex-col gap-0.5 sm:gap-1 items-start">
                <span className="text-gray-300 font-medium text-[8px] sm:text-[9px] whitespace-nowrap">Temperature</span>
                <span className="text-white font-semibold text-[9px] sm:text-[10px]">{soilData.parentMaterial.temperature}°C</span>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 sm:p-1.5">
              <img src={soil_Moisture} alt="Soil Moisture" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 object-contain" />
              <div className="flex flex-col gap-0.5 sm:gap-1 items-start">
                <span className="text-gray-300 font-medium text-[8px] sm:text-[9px] whitespace-nowrap">Moisture</span>
                <span className="text-white font-semibold text-[9px] sm:text-[10px]">{soilData.parentMaterial.moisture} m³/m³</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-[10%] flex justify-center relative">
          <div className="relative w-[2px] h-[80px] sm:h-[100px] bg-gray-500">
            <span className="absolute top-0 left-full w-2 sm:w-4 h-[2px] bg-gray-500"></span>
            <span className="absolute top-1/2 left-full w-2 sm:w-4 h-[2px] bg-gray-500 -translate-y-1/2"></span>
            <span className="absolute bottom-0 left-full w-2 sm:w-4 h-[2px] bg-gray-500"></span>
          </div>
          <div className="absolute top-0 right-[-8px] sm:right-[-4px] ml-1 sm:ml-2 h-full flex flex-col justify-around gap-8 sm:gap-10">
            <span className="text-[8px] sm:text-[9px] text-gray-300">5cm</span>
            <span className="text-[8px] sm:text-[9px] text-gray-300">15cm</span>
          </div>
        </div>

        <div className="relative w-[45%] sm:w-[50%] h-auto">
          <img src={soilLayerImage} alt="Soil Layer Graph" className="w-full h-[150px] sm:h-[180px] md:h-[200px]" />
          <img src={leftVector} alt="left vector" className="absolute top-1 left-[20%] sm:left-[15%] w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18" />
          <img src={rightVector} alt="right vector" className="absolute top-0 right-[15%] sm:right-[15%] w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18" />
        </div>
      </div>
    </div>
  );
};

export default SoilHealthChart;
