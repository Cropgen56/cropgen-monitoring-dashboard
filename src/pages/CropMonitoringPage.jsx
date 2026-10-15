import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Loader2, MapPin, Ruler, Satellite, Sprout } from "lucide-react";
import FieldDelineationPanel from "../components/delineation/FieldDelineationPanel";
import MaharashtraMap from "../components/map/MaharashtraMap";
import {
  cropIndexFeatureBounds,
  cropIndexFeatureKey,
  cropIndexGeometryPathInBounds,
  cropIndexImageSource,
  cropIndexResultsMappedToFeatures,
} from "../utils/cropIndexImages";
import { calculatePolygonIndex } from "../api/cropMonitoringApi";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import { todayInputValue } from "../utils/dateRangePresets";

function FieldMetric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0c1218] p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500">
        {React.createElement(icon, { className: "h-3.5 w-3.5 text-lime-300/80" })}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function legendEntries(legend) {
  if (Array.isArray(legend)) {
    return legend.map((entry, index) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return { label: String(entry), color: "", key: `legend-${index}` };
      }
      if (!entry || typeof entry !== "object") return null;
      return {
        label: entry.label ??
          entry.name ??
          entry.description ??
          [entry.min ?? entry.minimum, entry.max ?? entry.maximum].filter((value) => value != null).join(" – ") ??
          `Class ${index + 1}`,
        color: entry.color ?? entry.colour ?? entry.hex ?? entry.fill ?? "",
        key: String(entry.value ?? entry.label ?? entry.name ?? index),
      };
    }).filter(Boolean);
  }

  if (legend && typeof legend === "object") {
    return Object.entries(legend).map(([label, value]) => {
      if (typeof value === "string") {
        return { label, color: value, key: label };
      }
      if (!value || typeof value !== "object") {
        return { label: `${label}: ${String(value)}`, color: "", key: label };
      }
      return {
        label: value.label ??
          value.name ??
          [value.min ?? value.minimum, value.max ?? value.maximum].filter((item) => item != null).join(" – ") ??
          label,
        color: value.color ?? value.colour ?? value.hex ?? value.fill ?? "",
        key: label,
      };
    });
  }

  return [];
}

function SelectedFarmPanel({ selected, result, indexName, indexDate, panelRef }) {
  const feature = selected?.feature;
  const properties = feature?.properties || {};
  const bounds = cropIndexFeatureBounds(feature);
  const image = cropIndexImageSource(result?.image_base64, result?.image_format);
  const polygonPath = bounds ? cropIndexGeometryPathInBounds(feature, bounds) : "";
  const area = Number(properties.area_ha);
  const perimeter = Number(properties.perimeter_m);
  const location = [
    selected?.village?.name || properties.village,
    selected?.village?.taluka || properties.taluka,
    selected?.village?.district || properties.district,
  ].filter(Boolean).join(" · ");
  const legend = legendEntries(result?.legend);

  return (
    <section
      ref={panelRef}
      className="scroll-mt-20 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg"
      aria-live="polite"
    >
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300/70">
          Selected farm
        </p>
        <h2 className="mt-0.5 text-sm font-bold text-white">
          {selected ? `Field #${properties.field_id ?? "—"}` : "Farm details"}
        </h2>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
            <MapPin className="h-3 w-3 text-lime-300" /> {location}
          </p>
        )}
      </div>

      {!selected ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs font-semibold text-gray-300">Select a farm on the map</p>
          <p className="mt-1 text-[11px] text-gray-500">
            The farm polygon, index image, and field information will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(240px,.9fr)]">
          <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#080d12]">
            {image && polygonPath ? (
              <svg
                viewBox="0 0 1000 1000"
                role="img"
                aria-label={`Index image clipped to field ${properties.field_id ?? ""}`}
                className="max-h-[420px] min-h-56 w-full"
              >
                <defs>
                  <clipPath id="selected-farm-index-clip" clipPathUnits="userSpaceOnUse">
                    <path d={polygonPath} fillRule="evenodd" clipRule="evenodd" />
                  </clipPath>
                </defs>
                <image
                  href={image}
                  x="0"
                  y="0"
                  width="1000"
                  height="1000"
                  preserveAspectRatio="none"
                  clipPath="url(#selected-farm-index-clip)"
                />
                <path
                  d={polygonPath}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : (
              <div className="grid min-h-56 place-items-center px-5 text-center text-[11px] text-gray-500">
                {result
                  ? "Image returned, but this farm boundary could not be drawn."
                  : "No index image is available for this farm yet. Calculate the index to load its image."}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FieldMetric
                icon={Ruler}
                label="Area"
                value={Number.isFinite(area) ? `${area.toFixed(2)} ha` : "—"}
              />
              <FieldMetric
                icon={Ruler}
                label="Perimeter"
                value={Number.isFinite(perimeter) ? `${Math.round(perimeter).toLocaleString("en-IN")} m` : "—"}
              />
              <FieldMetric
                icon={Sprout}
                label="Index"
                value={result?.index_name || indexName || "—"}
              />
              <FieldMetric
                icon={CalendarDays}
                label="Image date"
                value={result?.date || indexDate || "—"}
              />
            </div>
            {result?.legend && (
              <div className="rounded-lg border border-white/[0.06] bg-[#0c1218] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {result?.index_name || indexName || "Index"} legend
                </p>
                {legend.length ? (
                  <ul className="space-y-2">
                    {legend.map((entry) => (
                      <li key={entry.key} className="flex items-center gap-2 text-[11px] text-gray-300">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm border border-white/15"
                          style={entry.color ? { backgroundColor: entry.color } : undefined}
                        />
                        <span>{entry.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-gray-500">No legend values were returned for this field.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function CropMonitoringPage() {
  const { fields, saved } = useFieldDelineationContext();
  const [calculationDate, setCalculationDate] = useState(todayInputValue());
  const [indexName, setIndexName] = useState("NDVI");
  const [calculation, setCalculation] = useState({ loading: false, response: null, error: "" });
  const [selectedField, setSelectedField] = useState(null);
  const calculationController = useRef(null);
  const selectedPanelRef = useRef(null);

  const polygons = fields?.type === "FeatureCollection" ? fields : null;
  const polygonCount = polygons?.features?.length || 0;
  const indexResults = useMemo(
    () => Array.isArray(calculation.response?.results) ? calculation.response.results : [],
    [calculation.response],
  );
  const mappedIndexResults = useMemo(
    () => cropIndexResultsMappedToFeatures(indexResults, polygons?.features || []),
    [indexResults, polygons?.features],
  );
  const selectedMappedResult = selectedField
    ? mappedIndexResults.find(
        ({ feature }) => cropIndexFeatureKey(feature) === cropIndexFeatureKey(selectedField.feature),
      )?.result
    : null;

  useEffect(() => () => {
    calculationController.current?.abort();
  }, []);

  useEffect(() => {
    if (selectedField) {
      selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedField]);

  const resetCalculation = () => {
    calculationController.current?.abort();
    setCalculation({ loading: false, response: null, error: "" });
  };

  const calculateIndex = async () => {
    if (!polygons || !calculationDate || !indexName || calculation.loading) return;
    calculationController.current?.abort();
    const controller = new AbortController();
    calculationController.current = controller;
    setCalculation({ loading: true, response: null, error: "" });
    try {
      const response = await calculatePolygonIndex({
        geojson: polygons,
        date: calculationDate,
        indexName,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setCalculation({ loading: false, response, error: "" });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setCalculation({ loading: false, response: null, error: error.message || "Index calculation failed." });
      }
    }
  };

  const selectFarm = ({ key, feature }) => {
    const detectionId = feature.properties?.detectionId;
    const savedDetection = saved.find((detection) => String(detection.id) === String(detectionId));
    setSelectedField({ key, feature, village: savedDetection?.village });
  };

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <MaharashtraMap
          heightClass="h-[min(68vh,660px)]"
          showFieldDelineationPanel={false}
          cropIndexResults={indexResults}
          cropIndexFeatures={polygons?.features || []}
          showCropIndexImages
          showFieldFills={false}
          indexCalculationLoading={calculation.loading}
          selectedFieldKey={selectedField?.key || ""}
          onFieldSelect={selectFarm}
        />
        <aside className="space-y-4">
          <FieldDelineationPanel placement="inline" />

          <section className="overflow-hidden rounded-xl border border-sky-300/20 bg-[#0d141b] text-gray-200 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">
                <Satellite className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[12px] font-bold text-white">Field index</h2>
                <p className="text-[10px] text-gray-500">{polygonCount} farm polygons selected</p>
              </div>
            </div>

            <div className="space-y-3 p-3">
              <label className="block space-y-1 text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3 text-sky-200" />
                  Index image date
                </span>
                <input
                  type="date"
                  value={calculationDate}
                  max={todayInputValue()}
                  onChange={(event) => {
                    resetCalculation();
                    setCalculationDate(event.target.value);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2.5 py-2 text-[10px] text-white [color-scheme:dark]"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[9px] text-gray-500">
                  <span>Index</span>
                  <select
                    value={indexName}
                    onChange={(event) => {
                      resetCalculation();
                      setIndexName(event.target.value);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white"
                  >
                    {["NDVI", "EVI", "NDWI", "SAVI", "NDMI"].map((index) => (
                      <option key={index} value={index}>{index}</option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                disabled={!polygonCount || !calculationDate || !indexName || calculation.loading}
                onClick={calculateIndex}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lime-300/20 bg-gradient-to-r from-lime-300/90 to-yellow-200/90 px-3 py-2 text-[11px] font-bold text-[#14200e] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {calculation.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {calculation.loading ? "Calculating index…" : "Calculate index"}
              </button>

              {calculation.error && (
                <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
                  {calculation.error}
                </p>
              )}

              {!polygonCount && (
                <p className="text-[10px] leading-relaxed text-gray-500">
                  Select a village and run AI field detection to send farm polygons to the index API.
                </p>
              )}
            </div>
          </section>

        </aside>
      </div>

      <SelectedFarmPanel
        selected={selectedField}
        result={selectedMappedResult}
        indexName={calculation.response?.index_name || indexName}
        indexDate={calculation.response?.date || calculationDate}
        panelRef={selectedPanelRef}
      />
    </div>
  );
}
