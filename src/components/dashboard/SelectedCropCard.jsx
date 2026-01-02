import React, { useMemo } from "react";

const ACRE_TO_HECTARE = 0.404685642;

const normalizeCropName = (name = "") =>
  name.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();

export default function SelectedCropCard({ farms, selectedCrop, selectedField }) {
  const cropFields = useMemo(() => {
    if (!selectedCrop) return [];
    const normalizedCrop = normalizeCropName(selectedCrop);
    return farms.filter(
      (f) => normalizeCropName(f.cropName) === normalizedCrop
    );
  }, [farms, selectedCrop]);

  const totalArea = useMemo(() => {
    return cropFields.reduce(
      (sum, f) => sum + (Number(f.acre) || 0) * ACRE_TO_HECTARE,
      0
    );
  }, [cropFields]);

  if (!selectedCrop && !selectedField) return null;

  const displayedFields = selectedField ? [selectedField] : cropFields;

  return (
    <div className="bg-[#0C2214] rounded-xl p-4 shadow-xl w-full mt-4">
      <h3 className="text-white text-lg font-semibold mb-4">
        {selectedField ? selectedField.fieldName : selectedCrop}
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm text-[#9FB79F] mb-4">
        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">Number of Fields:</span>
          <span className="text-white font-medium">{displayedFields.length}</span>
        </div>

        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">Total Area (ha):</span>
          <span className="text-white font-medium">
            {displayedFields
              .reduce(
                (sum, f) => sum + (Number(f.acre) || 0) * ACRE_TO_HECTARE,
                0
              )
              .toFixed(2)}
          </span>
        </div>

        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">Healthy Farms:</span>
          <span className="text-white font-medium">N/A</span>
        </div>

        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">Low Index Farms:</span>
          <span className="text-white font-medium">N/A</span>
        </div>
      </div>

      {/* Field Details */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayedFields.map((field) => (
          <div key={field._id || field.id} className="bg-[#143a26] p-4 rounded-lg shadow">
            <p className="text-white font-semibold mb-3">{field.fieldName}</p>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Crop:</span>
              <span className="text-white text-sm">{field.cropName}</span>
            </div>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Variety:</span>
              <span className="text-white text-sm">{field.variety}</span>
            </div>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Acre:</span>
              <span className="text-white text-sm">{(Number(field.acre) || 0).toFixed(2)}</span>
            </div>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Irrigation:</span>
              <span className="text-white text-sm">{field.typeOfIrrigation}</span>
            </div>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Farming:</span>
              <span className="text-white text-sm">{field.typeOfFarming}</span>
            </div>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Sowing Date:</span>
              <span className="text-white text-sm">{field.sowingDate}</span>
            </div>

            <div className="flex mb-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Coordinates Count:</span>
              <span className="text-white text-sm">{field.coordinates?.length || 0}</span>
            </div>

            {field.coordinates?.length > 0 && (
              <div className="mt-2">
                <span className="text-[#C1FFD7] font-semibold text-sm">Coordinates:</span>
                <ul className="text-white text-xs max-h-24 overflow-y-auto mt-1">
                  {field.coordinates.map((coord, index) => (
                    <li key={index}>
                      [{coord.lat?.toFixed(5)}, {coord.lng?.toFixed(5)}]
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex mt-2">
              <span className="text-[#C1FFD7] font-semibold text-sm w-36">Created At:</span>
              <span className="text-white text-sm">
                {new Date(field.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
