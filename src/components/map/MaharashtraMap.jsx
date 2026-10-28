import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
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
import { cropIndexFeatureKey, cropIndexResultsMappedToFeatures } from "../../utils/cropIndexImages";

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

/** Farms are a few pixels wide below this zoom, so pins mark where they are. */
const PIN_MAX_ZOOM = 13;
/** Pins are skipped for very large sets (whole talukas), where they would only add clutter. */
const PIN_MAX_FIELDS = 3000;

/**
 * Zoomed out, small farms vanish: one pin per farm (coloured like the farm in health / change
 * mode) shows where they are, and clicking a pin selects the farm like clicking its polygon.
 */
function FieldPins({ features, colorByKey, selectedFieldKey, onFieldSelect, renderer }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const pins = useMemo(
    () =>
      features.length > PIN_MAX_FIELDS
        ? []
        : features.map((feature) => {
            const [w, s, e, n] = turf.bbox(feature);
            const p = feature.properties || {};
            return {
              feature,
              center: [(s + n) / 2, (w + e) / 2],
              key: cropIndexFeatureKey(feature),
              selectKey: `${String(p.detectionId ?? "")}:${String(p.field_id ?? "")}`,
              label: `Field #${p.field_id ?? "—"}${p.village ? ` · ${p.village}` : ""}`,
            };
          }),
    [features],
  );
  if (zoom > PIN_MAX_ZOOM || !pins.length) return null;
  return pins.map((pin) => {
    const selected = pin.selectKey === selectedFieldKey;
    return (
      <CircleMarker
        key={pin.key}
        center={pin.center}
        radius={selected ? 7 : 5}
        renderer={renderer}
        pathOptions={{
          color: selected ? "#fef08a" : "#0f172a",
          weight: selected ? 2.5 : 1.2,
          fillColor: colorByKey?.get(pin.key) || "#a3e635",
          fillOpacity: 0.95,
        }}
        eventHandlers={{ click: () => onFieldSelect?.({ key: pin.selectKey, feature: pin.feature }) }}
      >
        <Tooltip direction="top" offset={[0, -6]}>{pin.label} · click to open</Tooltip>
      </CircleMarker>
    );
  });
}

/** Fits the map whenever the target bounds change (state view ↔ selected district). */
/** Zooms to one feature (e.g. the farm a report is about) whenever it changes. */
function FocusFeature({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return undefined;
    const b = L.geoJSON(feature).getBounds();
    if (!b.isValid()) return undefined;
    const t = setTimeout(() => map.fitBounds(b, { padding: [60, 60], maxZoom: 18, animate: true }), 120);
    return () => clearTimeout(t);
  }, [feature, map]);
  return null;
}

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
  /** Place search box (starts a village lookup); off on read-only overview maps. */
  showPlaceSearch = true,
  cropIndexResults = [],
  cropIndexFeatures = [],
  showCropIndexImages = true,
  cropIndexOpacity = 0.86,
  showFieldFills = true,
  /** Page-level long task shown over the map: { kind, message?, pct?, startedAt? } (see SatelliteScanLoader). */
  loadingTask = null,
  /** Optional GeoJSON feature to zoom onto (Farm Report's selected farm). */
  focusFeature = null,
  /** Village analysis: field key → fill colour, and field key → farm analysis (hover cards). */
  fieldColorByKey,
  fieldInsightsByKey,
  /** Optional map legend: { title, items: [{ label, color }] } (e.g. village analysis colouring). */
  legend = null,
  /** Farm polygons from an uploaded file, drawn alongside detected fields. */
  uploadedFields = null,
  uploadedFieldsKey = "",
}) {
  const { district, setDistrict, maharashtraOutline, maharashtraDistrictsOutline, outlinesLoading } =
    useAgriPlatform();
  const {
    step: delineationStep,
    pickVillageAt,
    progress: delineationProgress,
    runStartedAt: delineationStartedAt,
  } = useFieldDelineationContext();

  // One overlay for every long task: the page's own task first, then field detection,
  // then the initial outline load.
  const activeTask =
    loadingTask ||
    (delineationStep === "running"
      ? {
          kind: "delineation",
          message: delineationProgress?.message,
          pct: delineationProgress?.pct,
          startedAt: delineationStartedAt,
        }
      : delineationStep === "loadingVillage"
        ? { kind: "village" }
        : outlinesLoading
          ? { kind: "map" }
          : null);

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

  // One canvas for districts *and* fields: a canvas element receives every mouse event over
  // the map, so with two canvases whichever was created last hid the other's hover tooltips.
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  /** Field key → its crop index result, for the image overlay flags and the hover card. */
  const cropIndexByField = useMemo(
    () =>
      new Map(
        cropIndexResultsMappedToFeatures(cropIndexResults, cropIndexFeatures).map(({ feature, result }) => [
          cropIndexFeatureKey(feature),
          result,
        ]),
      ),
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
            // Re-added whenever the district changes: keep it under the fields so they win hover.
            eventHandlers={{ add: (e) => e.target.bringToBack() }}
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
          renderer={canvasRenderer}
          fieldColorByKey={fieldColorByKey}
          fieldInsightsByKey={fieldInsightsByKey}
          fieldClassifications={fieldClassifications}
          classificationDetectionId={classificationDetectionId}
          selectedFieldKey={selectedFieldKey}
          onFieldSelect={onFieldSelect}
          cropIndexByField={cropIndexByField}
          showFieldFills={showFieldFills}
          extraFields={uploadedFields}
          extraFieldsKey={uploadedFieldsKey}
        />
        <FieldPins
          features={cropIndexFeatures}
          colorByKey={fieldColorByKey}
          selectedFieldKey={selectedFieldKey}
          onFieldSelect={onFieldSelect}
          renderer={canvasRenderer}
        />
        <CropIndexImageOverlays
          results={cropIndexResults}
          features={cropIndexFeatures}
          visible={showCropIndexImages}
          opacity={cropIndexOpacity}
        />
        {showPlaceSearch && <MapPlaceSearch onPlaceSelect={onPlaceSelect} />}
        <FocusFeature feature={focusFeature} />
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

      {legend?.items?.length > 0 && (
        <div className="pointer-events-none absolute bottom-7 right-3 z-[1000] rounded-lg border border-white/10 bg-[#0d1117]/90 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">{legend.title}</p>
          <ul className="space-y-1">
            {legend.items.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[10px] text-gray-200">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTask && <SatelliteScanLoader key={activeTask.kind} task={activeTask} />}
    </div>
  );
}
