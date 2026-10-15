import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import { X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import MapPlaceSearch from "./MapPlaceSearch";
import CropIndexImageOverlays from "./CropIndexImageOverlays";
import FieldDelineationLayer from "../delineation/FieldDelineationLayer";
import FieldDelineationPanel from "../delineation/FieldDelineationPanel";
import SatelliteScanLoader from "../ui/SatelliteScanLoader";
import { useAgriPlatform } from "../../context/AgriPlatformContext";
import { useFieldDelineationContext } from "../../context/FieldDelineationContext";
import { cropIndexMappedFeatureKeys } from "../../utils/cropIndexImages";

const MAHARASHTRA_CENTER = [19.7515, 75.7139];
const FIT_OPTIONS = { padding: [40, 40], maxZoom: 15, animate: true };

/** District grid on hybrid satellite: neutral borders, amber ring for the selected district. */
const DISTRICT_STYLE = {
  fillColor: "#020617",
  fillOpacity: 0.05,
  color: "#cbd5e1",
  weight: 2,
  opacity: 0.92,
};
const DISTRICT_ACTIVE_STYLE = {
  fillColor: "#451a03",
  fillOpacity: 0.14,
  color: "#fbbf24",
  weight: 3.5,
  opacity: 1,
};
/** Maharashtra state boundary — green ring drawn above district fills. */
const STATE_STYLE = {
  fillColor: "#22c55e",
  fillOpacity: 0.07,
  color: "#16a34a",
  weight: 3.5,
  opacity: 0.98,
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toLeafletBounds(geojson, pad = 0) {
  if (!geojson) return null;
  try {
    const [minLng, minLat, maxLng, maxLat] = turf.bbox(geojson);
    const dLat = (maxLat - minLat) * pad;
    const dLng = (maxLng - minLng) * pad;
    return [
      [minLat - dLat, minLng - dLng],
      [maxLat + dLat, maxLng + dLng],
    ];
  } catch {
    return null;
  }
}

/** Fits the map whenever the target bounds change (state view ↔ selected district). */
function FitBounds({ bounds }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!bounds) return undefined;
    const key = JSON.stringify(bounds);
    if (prev.current === key) return undefined;
    prev.current = key;
    const t = setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, FIT_OPTIONS);
    }, 80);
    return () => clearTimeout(t);
  }, [bounds, map]);
  return null;
}

/**
 * Maharashtra satellite map used on every page: state + district outlines (click a
 * district to focus it), Google place search, and live field delineation results.
 */
export default function MaharashtraMap({
  heightClass = "h-[min(62vh,560px)]",
  fieldClassifications = {},
  classificationDetectionId = "",
  selectedFieldKey = "",
  onFieldSelect,
  showFieldDelineationPanel = true,
  cropIndexResults = [],
  cropIndexFeatures = [],
  showCropIndexImages = true,
  showFieldFills = true,
  indexCalculationLoading = false,
}) {
  const { district, setDistrict, maharashtraOutline, maharashtraDistrictsOutline, outlinesLoading } =
    useAgriPlatform();
  const { step: delineationStep, pickVillageAt } = useFieldDelineationContext();

  const districtFeature = useMemo(
    () => maharashtraDistrictsOutline?.features?.find((f) => f.properties?.district === district) ?? null,
    [maharashtraDistrictsOutline, district],
  );

  const bounds = useMemo(
    () =>
      districtFeature
        ? toLeafletBounds(districtFeature, 0.1)
        : toLeafletBounds(maharashtraDistrictsOutline ?? maharashtraOutline, 0.06),
    [districtFeature, maharashtraDistrictsOutline, maharashtraOutline],
  );

  const districtStyle = useCallback(
    (feature) => (feature.properties?.district === district ? DISTRICT_ACTIVE_STYLE : DISTRICT_STYLE),
    [district],
  );

  const onEachDistrict = useCallback(
    (feature, layer) => {
      const name = feature.properties?.district || "District";
      const active = name === district;
      layer.bindTooltip(
        `<div style="padding:8px 10px;font:12px ui-sans-serif,system-ui,sans-serif;color:#f1f5f9;background:#0f172a;border:1px solid rgba(148,163,184,.35);border-radius:8px;">` +
          `<strong>${esc(name)}</strong><div style="font-size:10px;color:#94a3b8;margin-top:2px;">` +
          `${active ? "Selected district" : "Click to focus this district"}</div></div>`,
        { sticky: true, direction: "auto", className: "agri-mh-district-tip", opacity: 1 },
      );
      layer.on("click", () => setDistrict(name));
    },
    [district, setDistrict],
  );

  /** A searched place loads its village boundary, unless a draw / detection is in progress. */
  const onPlaceSelect = useCallback(
    (place) => {
      if (delineationStep === "draw" || delineationStep === "running") return;
      pickVillageAt(place.lat, place.lng, { thenDraw: false });
    },
    [delineationStep, pickVillageAt],
  );

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const cropIndexFieldIds = useMemo(
    () => cropIndexMappedFeatureKeys(cropIndexResults, cropIndexFeatures),
    [cropIndexResults, cropIndexFeatures],
  );

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-green-900/30 bg-black/20 ${heightClass}`}>
      <MapContainer center={MAHARASHTRA_CENTER} zoom={6} className="h-full w-full" zoomControl attributionControl>
        {/* Google hybrid: satellite + labels. Ensure use complies with Google Maps ToS. */}
        <TileLayer
          attribution="© Google Maps"
          url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        {maharashtraDistrictsOutline?.features?.length > 0 && (
          <GeoJSON
            key={`mh-districts-${district || "all"}`}
            data={maharashtraDistrictsOutline}
            style={districtStyle}
            onEachFeature={onEachDistrict}
            renderer={canvasRenderer}
          />
        )}

        {maharashtraOutline?.features?.length > 0 && (
          <GeoJSON
            key="mh-state"
            data={maharashtraOutline}
            style={() => STATE_STYLE}
            interactive={false}
            renderer={canvasRenderer}
          />
        )}

        <FieldDelineationLayer
          fieldClassifications={fieldClassifications}
          classificationDetectionId={classificationDetectionId}
          selectedFieldKey={selectedFieldKey}
          onFieldSelect={onFieldSelect}
          cropIndexFieldIds={cropIndexFieldIds}
          showFieldFills={showFieldFills}
        />
        <CropIndexImageOverlays
          results={cropIndexResults}
          features={cropIndexFeatures}
          visible={showCropIndexImages}
        />
        <MapPlaceSearch onPlaceSelect={onPlaceSelect} />
        <FitBounds bounds={bounds} />
      </MapContainer>

      {showFieldDelineationPanel && <FieldDelineationPanel />}

      {district && (
        <button
          type="button"
          onClick={() => setDistrict("")}
          className="absolute bottom-3 left-3 z-[1000] inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 backdrop-blur-sm hover:bg-black/85"
          title="Back to all of Maharashtra"
        >
          {district} district
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {(outlinesLoading || indexCalculationLoading) && <SatelliteScanLoader />}
    </div>
  );
}
