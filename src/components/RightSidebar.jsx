import React, { useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  TrendingUp,
  TrendingDown,
  MapPin,
  Trash2,
} from "lucide-react";

const normalizeCropName = (name = "") => {
  return name.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
};

const formatCropLabel = (name = "") => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function RightSidebar({
  onFileUpload,
  onSnapshotClick,
  farms,
  selectedCrop,
  onCropChange,
  savedFields,
  onDeleteField,
  onSelectField,
  selectedFieldId,
}) {
  const fileInputRef = useRef(null);

  const selectedCropFields = useMemo(() => {
    if (!Array.isArray(farms) || !selectedCrop) return farms;

    return farms.filter(
      (farm) => normalizeCropName(farm.cropName) === selectedCrop
    );
  }, [farms, selectedCrop]);

  const totalFieldsCount = selectedCropFields.length;

  const availableCrops = useMemo(() => {
    if (!Array.isArray(farms)) return [];

    const map = new Map();

    farms.forEach((farm) => {
      if (!farm.cropName) return;

      const normalized = normalizeCropName(farm.cropName);
      if (!map.has(normalized)) {
        map.set(normalized, formatCropLabel(normalized));
      }
    });

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [farms]);

  const ACRE_TO_HECTARE = 0.404685642;

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

  const metrics = {
    evi: { value: "0.00", change: "0.0", positive: true },
    vhi: { value: "0.0", change: "0.0", positive: false },
    savi: { value: "0.00", change: "0.0", positive: true },
  };

  //  File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onFileUpload) {
      onFileUpload({ file });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <aside className="w-full lg:bg-[#132f1e]">
      <div className="bg-[#0C2214] rounded-xl px-4 sm:p-5 shadow-lg">
        {/* Header */}
        <div className="">
          <div className="text-lg font-semibold text-white">
            {selectedCrop
              ? `${
                  selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)
                } Fields (${totalFieldsCount})`
              : "Field Name"}
          </div>

          <div className="text-xs text-[#9FB79F]">
            {selectedCrop
              ? `${totalArea.toFixed(2)} ha • ${totalFieldsCount} fields`
              : "No Field Selected"}
          </div>
        </div>

        {/* Crop Filter */}
        <div className="mt-4">
          <label className="text-xs text-[#9FB79F]">Suggested Crop</label>
          <select
            value={selectedCrop}
            onChange={(e) => onCropChange(e.target.value)}
            className="w-full mt-1 bg-cg-panel outline-none text-white rounded-lg px-3 py-2 text-xs border border-green-500/20"
          >
            <option value="">All crops</option>

            {availableCrops.map((crop) => (
              <option key={crop.value} value={crop.value}>
                {crop.label}
              </option>
            ))}
          </select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <MetricCard
            title="Field Area"
            value={totalArea.toFixed(2)}
            unit="ha"
            status={selectedCrop ? "Active" : "No Field"}
            positive
          />
          <MetricCard
            title="EVI"
            value={metrics.evi.value}
            change={`${metrics.evi.positive ? "+" : ""}${metrics.evi.change}%`}
            positive={metrics.evi.positive}
            status="Stable"
          />
          <MetricCard
            title="VHI"
            value={metrics.vhi.value}
            change={`${metrics.vhi.positive ? "+" : ""}${metrics.vhi.change}%`}
            positive={metrics.vhi.positive}
            status="Stress"
          />
          <MetricCard
            title="SAVI"
            value={metrics.savi.value}
            change={`${metrics.savi.positive ? "+" : ""}${
              metrics.savi.change
            }%`}
            positive={metrics.savi.positive}
            status="Normal"
          />
        </div>

        <div className="border-t border-white/10 my-2.5" />

        <div>
          <div className="text-sm text-white font-semibold mb-3">
            Saved Fields ({savedFields.length})
          </div>

          <div className="h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {savedFields.length === 0 ? (
              <div className="text-gray-400 text-sm text-center mt-6">
                No saved fields yet
                <div className="text-xs mt-1">
                  Draw a field on the map to see it here
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedFields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => onSelectField(field)}
                    className={`rounded-lg p-3 flex justify-between cursor-pointer border transition-all
                    ${
                      selectedFieldId === field.id
                        ? "bg-yellow-900/20 border-yellow-500/50"
                        : "bg-[#0f2a1b] border-transparent hover:bg-[#143a26]"
                    }
                  `}
                  >
                    <div>
                      <div className="text-sm text-white font-medium">
                        {field.name}
                      </div>

                      <div className="text-xs text-[#9FB79F] mt-1">
                        Area: {field.area} hectares
                      </div>

                      <div className="text-xs text-[#9FB79F]">
                        {field.points} boundary points
                      </div>

                      <div className="text-[11px] text-gray-400 mt-1">
                        {field.createdAt}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteField(field.id);
                      }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload */}
        <div className="border-t border-white/10 my-3.5" />

        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />

        <label htmlFor="file-upload">
          <div className="w-full py-3 bg-[#344E41] text-white rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-[#3d5a4a] cursor-pointer">
            <UploadCloud size={16} />
            Upload Field Boundaries
          </div>
        </label>
      </div>
    </aside>
  );
}

//  Metric Card
function MetricCard({ title, value, unit, change, status, positive }) {
  return (
    <div>
      <div className="text-[11px] text-[#9FB79F]">{title}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-xl text-white font-semibold">
          {value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
        {change && (
          <span
            className={`text-xs flex items-center gap-1 ${
              positive ? "text-green-400" : "text-red-400"
            }`}
          >
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[#9FB79F] mt-1">{status}</p>
    </div>
  );
}
