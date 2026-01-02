import React, { useMemo, useState } from "react";

const ACRE_TO_HECTARE = 0.404685642;

const normalizeCropName = (name = "") =>
  name.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();

export default function SelectedCropCard({
  farms,
  selectedCrop,
  selectedField,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

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

  const displayedFields = selectedField ? [selectedField] : cropFields;

  const totalPages = Math.ceil(displayedFields.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedFields.slice(start, start + pageSize);
  }, [displayedFields, currentPage]);

  const getVisiblePages = () => {
    const isSmallScreen = window.innerWidth < 768;
    const maxVisible = isSmallScreen ? 3 : 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = currentPage - half;
    let end = currentPage + half;

    if (start <= 1) {
      start = 1;
      end = maxVisible;
    } else if (end >= totalPages) {
      end = totalPages;
      start = totalPages - maxVisible + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  if (!selectedCrop && !selectedField) return null;
  return (
    <div className="bg-[#0C2214] rounded-xl p-4 shadow-xl w-full mt-4">
      <h3 className="text-white text-lg font-semibold mb-4">
        {selectedField ? selectedField.fieldName : selectedCrop}
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm text-[#9FB79F] mb-4">
        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">
            Number of Fields:
          </span>
          <span className="text-white font-medium">
            {displayedFields.length}
          </span>
        </div>

        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">
            Total Area (ha):
          </span>
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
          <span className="text-[#C1FFD7] font-semibold w-36">
            Healthy Farms:
          </span>
          <span className="text-white font-medium">N/A</span>
        </div>

        <div className="flex">
          <span className="text-[#C1FFD7] font-semibold w-36">
            Low Index Farms:
          </span>
          <span className="text-white font-medium">N/A</span>
        </div>
      </div>

      {/* Field Details */}
      <div className="mt-4 overflow-auto rounded-xl border border-[#1f4b33] custom-scrollbar">
        <table
          className="min-w-full sm:min-w-[900px] md:min-w-[1100px] lg:min-w-full 
                     table-auto md:table-fixed"
        >
          <thead className="bg-[#143a26] sticky top-0 z-10">
            <tr className="text-xs sm:text-sm">
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Field
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Crop
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Variety
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Area (Acre)
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Irrigation
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Farming
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Sowing Date
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[140px] sm:w-[170px] md:w-[180px]">
                Coordinates
              </th>
              <th className="text-[#C1FFD7] font-semibold px-3 sm:px-4 py-2 sm:py-3 text-left w-[180px] sm:w-[190px] md:w-[220px]">
                Created At
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((field, i) => (
              <tr
                key={field._id || field.id}
                className={`${
                  i % 2 === 0 ? "bg-[#113020]" : "bg-[#0f291b]"
                } hover:bg-[#1c4d34] transition-all duration-500 ease-in-out border-b border-[#1f4b33]`}
              >
                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                  {field.fieldName}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {field.cropName}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {field.variety || "-"}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {(Number(field.acre) || 0).toFixed(2)}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {field.typeOfIrrigation || "-"}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {field.typeOfFarming || "-"}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {field.sowingDate || "-"}
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {field.coordinates?.length || 0} Points
                </td>

                <td className="text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">
                  {new Date(field.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {displayedFields.length > pageSize && (
        <div className="flex items-center justify-between my-3">
          <p className="text-[10px] sm:text-sm text-[#9A9898] font-semibold">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, displayedFields.length)} of{" "}
            {displayedFields.length} Fields
          </p>

          <div className="flex gap-1 sm:gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-2 sm:px-3 py-1 rounded-md border border-[#4b6b56] text-[#C1FFD7] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            {getVisiblePages().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2 sm:px-3 py-1 rounded-md text-sm ${
                  currentPage === page
                    ? "bg-[#28C878] text-white"
                    : "border border-[#4b6b56] text-[#9A9898]"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-2 sm:px-3 py-1 rounded-md border border-[#4b6b56] text-[#C1FFD7] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
