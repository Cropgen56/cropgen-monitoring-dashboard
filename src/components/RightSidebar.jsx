import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  TrendingUp,
  TrendingDown,
  MapPin,
  Trash2,
} from "lucide-react";
import {
  processUploadedFile,
  extractCoordinatesFromGeoJSON,
} from "../utils/fileParser";
import { useFieldData } from "../context/FieldDataContext";
import { deleteFieldData } from "../utils/fieldDataGenerator";

export default function RightSidebar({ onFileUpload, onSnapshotClick }) {
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const fileInputRef = useRef(null);

  const {
    fieldData,
    availableCrops,
    selectedCrop,
    setSelectedCrop,
    selectedField,
    selectField,
    clearField,
  } = useFieldData();

  // -------- load snapshots from localStorage --------
  useEffect(() => {
    const loadSnapshots = () => {
      try {
        const savedSnapshots = JSON.parse(
          localStorage.getItem("fieldSnapshots") || "[]"
        );
        setSnapshots(savedSnapshots);

        if (savedSnapshots.length === 0) {
          clearField();
        }
      } catch (err) {
        console.error("Error loading snapshots:", err);
      }
    };

    loadSnapshots();

    const handleStorageChange = (e) => {
      if (e.key === "fieldSnapshots" || e.key === null) {
        loadSnapshots();
      }
    };
    const handleCustomStorageEvent = () => loadSnapshots();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageUpdated", handleCustomStorageEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageUpdated",
        handleCustomStorageEvent
      );
    };
  }, [clearField]);

  // -------- file upload --------
  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const file = files[0];
      const validExtensions = [".geojson", ".json"];
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

      if (!isValid) {
        throw new Error("Please upload a GeoJSON file (.geojson or .json)");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File is too large. Maximum size is 10MB.");
      }

      const geojson = await processUploadedFile(file);
      const coordinates = extractCoordinatesFromGeoJSON(geojson);

      if (coordinates.length === 0) {
        throw new Error("No valid coordinates found in the file");
      }

      const fileData = {
        geojson,
        coordinates,
        fileName: file.name,
      };

      if (onFileUpload) {
        onFileUpload(fileData);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  // -------- manual snapshot click / delete --------
  const handleSnapshotClickLocal = (snapshot) => {
    setSelectedFieldId(snapshot.id);
    selectField(snapshot);

    if (onSnapshotClick) {
      onSnapshotClick(snapshot);
    }
  };

  const handleDeleteField = (e, fieldId) => {
    e.stopPropagation();

    const fieldToDelete = snapshots.find((s) => s.id === fieldId);
    const fieldName = fieldToDelete ? fieldToDelete.name : "this field";

    if (window.confirm(`Are you sure you want to delete ${fieldName}?`)) {
      try {
        const updatedSnapshots = snapshots.filter((s) => s.id !== fieldId);
        localStorage.setItem(
          "fieldSnapshots",
          JSON.stringify(updatedSnapshots)
        );
        deleteFieldData(fieldId);
        window.dispatchEvent(new Event("localStorageUpdated"));

        setSnapshots(updatedSnapshots);

        if (selectedFieldId === fieldId) {
          if (updatedSnapshots.length > 0) {
            const newSelectedField = updatedSnapshots[0];
            setSelectedFieldId(newSelectedField.id);
            selectField(newSelectedField);
            if (onSnapshotClick) {
              onSnapshotClick(newSelectedField);
            }
          } else {
            setSelectedFieldId(null);
            clearField();
            if (onSnapshotClick) {
              onSnapshotClick(null);
            }
          }
        }
      } catch (error) {
        console.error("Error deleting field:", error);
        alert("Failed to delete field. Please try again.");
      }
    }
  };

  // -------- header / metrics --------
  const headerTitle =
    fieldData?.selectionLabel ||
    (selectedField ? selectedField.name : "Field Name");
  const headerSubtitle =
    fieldData?.selectionSubtitle ||
    (selectedField
      ? new Date(selectedField.savedAt).toLocaleDateString()
      : "No Field Selected");

  const metrics = fieldData?.sidebarMetrics || {
    evi: { value: "0.00", change: "0.0", positive: true },
    vhi: { value: "0.0", change: "0.0", positive: false },
    savi: { value: "0.00", change: "0.0", positive: true },
  };

  const totalArea =
    fieldData?.totalArea ?? (selectedField ? selectedField.area : 0);

  return (
    <aside className="w-full lg:bg-[#132f1eff] p-3 sm:p-4">
      <div className="bg-[#0C2214] rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
        {/* Header */}
        <div className="mt-8 lg:mt-0">
          <div className="text-lg sm:text-xl font-semibold text-white">
            {headerTitle}
          </div>
          <div className="text-xs text-[#9FB79F] -mt-1">{headerSubtitle}</div>
        </div>

        {/* Suggested Crop filter */}
        <div className="mt-3 sm:mt-4">
          <label className="text-xs text-[#9FB79F]">Suggested Crop</label>
          <select
            value={selectedCrop || ""}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full mt-1 bg-cg-panel/95 text-white rounded-lg px-3 py-2 text-xs sm:text-sm border border-green-500/20 hover:border-green-500/40 focus:outline-none cursor-pointer"
            disabled={availableCrops.length === 0}
          >
            <option value="">All crops</option>
            {availableCrops.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 mt-4 sm:mt-6">
          <MetricCard
            title="Field Area"
            value={totalArea ? totalArea.toFixed(2) : "0"}
            unit="ha"
            status={totalArea ? "Active" : "No Field"}
            positive
          />
          <MetricCard
            title="EVI"
            value={metrics.evi.value}
            change={`${metrics.evi.positive ? "+" : ""}${metrics.evi.change}%`}
            status="Slight Increase"
            positive={metrics.evi.positive}
          />
          <MetricCard
            title="VHI"
            value={metrics.vhi.value}
            change={`${metrics.vhi.positive ? "+" : ""}${metrics.vhi.change}%`}
            status={metrics.vhi.positive ? "Healthy" : "Stress Detected"}
            positive={metrics.vhi.positive}
          />
          <MetricCard
            title="SAVI"
            value={metrics.savi.value}
            change={`${metrics.savi.positive ? "+" : ""}${
              metrics.savi.change
            }%`}
            status="Consistent"
            positive={metrics.savi.positive}
          />
        </div>

        {snapshots.length > 0 ? (
          <>
            <div className="border-t border-white/10 my-4 sm:my-6"></div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-semibold text-white">
                  Saved Fields ({snapshots.length})
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    onClick={() => handleSnapshotClickLocal(snapshot)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                      selectedFieldId === snapshot.id
                        ? "bg-yellow-900/20 border-yellow-500/50"
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin
                            size={14}
                            className="text-yellow-400 flex-shrink-0"
                          />
                          <span className="text-sm font-semibold text-white truncate">
                            {snapshot.name}
                          </span>
                        </div>
                        <div className="text-xs text-[#9FB79F] space-y-0.5">
                          <p>Area: {snapshot.area.toFixed(2)} hectares</p>
                          <p>{snapshot.markers.length} boundary points</p>
                          <p className="text-[10px]">
                            {new Date(snapshot.savedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteField(e, snapshot.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors flex-shrink-0 cursor-pointer"
                        title="Delete field"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="border-t border-white/10 my-4 sm:my-6"></div>
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm mb-2">
                No saved fields yet
              </div>
              <div className="text-gray-500 text-xs">
                Draw a field on the map and save it to see it here
              </div>
            </div>
          </>
        )}

        <div className="border-t border-white/10 my-4 sm:my-6"></div>

        {/* Upload field boundaries */}
        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".geojson,.json"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <div className="w-full py-2.5 sm:py-3 bg-[#344E41] text-white rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm hover:bg-[#3d5a4a] transition-colors cursor-pointer">
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>Upload Field Boundaries</span>
                </>
              )}
            </div>
          </label>
          <p className="text-[10px] sm:text-[11px] mt-2 sm:mt-3 text-[#9FB79F]">
            Upload GeoJSON For Real Boundaries.
          </p>
          {uploadError && (
            <p className="text-red-400 text-xs mt-2 bg-red-900/20 px-3 py-2 rounded">
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className="text-green-400 text-xs mt-2 bg-green-900/20 px-3 py-2 rounded">
              File uploaded successfully!
            </p>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(121, 194, 74, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(121, 194, 74, 0.5);
        }
      `}</style>
    </aside>
  );
}

function MetricCard({ title, value, unit, change, status, positive }) {
  return (
    <div>
      <div className="text-[10px] sm:text-[11px] text-[#9FB79F]">{title}</div>
      <div className="flex items-center gap-1 sm:gap-2 mt-1">
        <p className="text-lg sm:text-xl lg:text-2xl text-white font-semibold">
          {value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
        {change && (
          <span
            className={`text-xs sm:text-sm flex items-center gap-0.5 sm:gap-1 ${
              positive ? "text-[#64E57C]" : "text-[#FF6A6A]"
            }`}
          >
            {positive ? (
              <TrendingUp size={14} className="sm:w-4 sm:h-4" />
            ) : (
              <TrendingDown size={14} className="sm:w-4 sm:h-4" />
            )}
            <span className="hidden sm:inline">{change}</span>
          </span>
        )}
      </div>
      <p className="text-[10px] sm:text-[11px] text-[#9FB79F] mt-1">{status}</p>
    </div>
  );
}