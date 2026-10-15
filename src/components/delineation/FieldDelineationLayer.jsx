import React, { useEffect, useMemo } from "react";
import { GeoJSON, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { useFieldDelineationContext } from "../../context/FieldDelineationContext";
import {
  cropCandidates,
  cropClassificationColor,
  fieldPredictionForId,
} from "../../utils/cropClassificationColors";
import { cropIndexFeatureKey } from "../../utils/cropIndexImages";

const ACRES_PER_HA = 2.471053814671738;

const VILLAGE_STYLE = { fill: false, color: "#60a5fa", weight: 2.5, dashArray: "6 6", opacity: 0.95 };
const AREA_STYLE = { fill: false, color: "#ffffff", weight: 1.5, dashArray: "4 4", opacity: 0.8 };
const FIELD_COLORS = [
  { stroke: "#b5e89a", fill: "#83b95f" },
  { stroke: "#d0e985", fill: "#a4bb4f" },
  { stroke: "#d8df8a", fill: "#b3b755" },
  { stroke: "#f0d879", fill: "#c4a844" },
  { stroke: "#a9df89", fill: "#79b65a" },
  { stroke: "#e8dc75", fill: "#b9a83c" },
  { stroke: "#ede59a", fill: "#c0b45a" },
  { stroke: "#c1e29a", fill: "#91b866" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldColor(feature, fieldClassifications, classificationDetectionId) {
  const prediction = fieldPredictionForId(fieldClassifications, feature.properties?.field_id);
  const belongsToClassifiedRun =
    !classificationDetectionId ||
    String(feature.properties?.detectionId ?? "") === String(classificationDetectionId);
  if (prediction?.best_crop && belongsToClassifiedRun) {
    return cropClassificationColor(prediction.best_crop);
  }

  const id = feature.properties?.field_id;
  const numericId = Number(id);
  const index = Number.isFinite(numericId) && numericId > 0
    ? Math.floor(numericId - 1)
    : Array.from(String(id ?? JSON.stringify(feature.geometry?.coordinates?.[0]?.[0] ?? "")))
        .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
  return FIELD_COLORS[index % FIELD_COLORS.length];
}

function fieldStyle(feature, fieldClassifications, classificationDetectionId) {
  const color = fieldColor(feature, fieldClassifications, classificationDetectionId);
  return {
    color: color.stroke,
    weight: 1.6,
    opacity: 0.95,
    fillColor: color.fill,
    fillOpacity: 0.52,
  };
}

function fieldHoverCard(feature, prediction) {
  const p = feature.properties || {};
  const name = escapeHtml(p.field_id != null ? `Farm / Field ${p.field_id}` : "Farm boundary");
  const village = escapeHtml(p.village || "Selected village");
  const location = [p.taluka, p.district].filter(Boolean).map(escapeHtml).join(" · ");
  const areaHa = Number(p.area_ha);
  const perimeter = Number(p.perimeter_m);
  const area = Number.isFinite(areaHa) && areaHa > 0 ? areaHa : null;
  const perimeterText = Number.isFinite(perimeter) && perimeter > 0 ? `${Math.round(perimeter)} m` : "—";
  const confidence = Number(p.confidence);
  const confidenceText = Number.isFinite(confidence)
    ? `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`
    : null;
  const estimatedYieldValue = prediction?.yield_prediction?.estimated_yield_tonnes;
  const yieldDeficitValue = prediction?.yield_prediction?.yield_deficit_pct;
  const estimatedYield = estimatedYieldValue == null ? NaN : Number(estimatedYieldValue);
  const yieldDeficit = yieldDeficitValue == null ? NaN : Number(yieldDeficitValue);
  const details = [
    (p.cropType || p.crop) && ["Crop", p.cropType || p.crop],
    prediction?.best_crop && ["Classified crop", prediction.best_crop],
    (prediction?.season_label || prediction?.season) && [
      "Detected season",
      prediction.season_label || prediction.season,
    ],
    prediction?.best_score != null && Number.isFinite(Number(prediction.best_score)) && [
      "Classification score",
      `${(Number(prediction.best_score) * (Number(prediction.best_score) <= 1 ? 100 : 1)).toFixed(1)}%`,
    ],
    Number.isFinite(estimatedYield) && [
      "Predicted yield",
      `${estimatedYield.toFixed(1)} tonnes`,
    ],
    Number.isFinite(yieldDeficit) && [
      "Yield deficit",
      `${yieldDeficit.toFixed(1)}%`,
    ],
    prediction?.yield_prediction?.damage_category && [
      "Yield impact",
      prediction.yield_prediction.damage_category,
    ],
    p.farmerName && ["Farmer", p.farmerName],
    p.irrigationType && ["Irrigation", p.irrigationType],
    p.cropHealthPercent != null && ["Crop health", `${p.cropHealthPercent}%`],
    confidenceText && ["Detection confidence", confidenceText],
  ].filter(Boolean);
  const candidates = cropCandidates(prediction);
  const scoreTotal = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
  let scoreStart = 0;
  const pieStops = candidates.map((candidate) => {
    const start = scoreStart;
    scoreStart += (candidate.score / scoreTotal) * 100;
    const color = cropClassificationColor(candidate.crop);
    return `${color.fill} ${start.toFixed(1)}% ${scoreStart.toFixed(1)}%`;
  });
  const pieStyle = pieStops.length
    ? `conic-gradient(${pieStops.join(", ")})`
    : "conic-gradient(#52634b 0% 100%)";
  const ndviSamples = (Array.isArray(prediction?.temporal_signature) ? prediction.temporal_signature : [])
    .map((sample) => Number(sample.ndvi))
    .filter(Number.isFinite);
  const ndviRange = ndviSamples.length
    ? Math.max(...ndviSamples) - Math.min(...ndviSamples) || 1
    : 1;
  const ndviPoints = ndviSamples
    .map((value, index) => {
      const x = ndviSamples.length > 1 ? (index / (ndviSamples.length - 1)) * 100 : 50;
      const y = 34 - ((value - Math.min(...ndviSamples)) / ndviRange) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <div style="width:264px;max-width:82vw;overflow:hidden;border:1px solid rgba(148,163,184,.28);border-radius:14px;background:linear-gradient(155deg,#111827 0%,#07140f 100%);color:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;box-shadow:0 18px 48px rgba(0,0,0,.5);">
      <div style="padding:12px 14px 11px;background:linear-gradient(110deg,rgba(20,184,166,.18),rgba(14,165,233,.12));border-bottom:1px solid rgba(148,163,184,.16);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="min-width:0;font-size:13px;font-weight:750;letter-spacing:.01em;color:#f8fafc;">${name}</div>
          <span style="flex:none;border:1px solid rgba(45,212,191,.25);border-radius:999px;background:rgba(13,148,136,.16);padding:3px 7px;color:#5eead4;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Detected</span>
        </div>
        <div style="margin-top:4px;color:#94a3b8;font-size:10px;">${village}${location ? ` · ${location}` : ""}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px 12px 8px;">
        <div style="border:1px solid rgba(148,163,184,.13);border-radius:9px;background:rgba(15,23,42,.62);padding:8px 9px;">
          <div style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.08em;">Farm area</div>
          <div style="margin-top:3px;color:#bef264;font-size:15px;font-weight:750;font-variant-numeric:tabular-nums;">${area ? `${area.toFixed(2)} ha` : "—"}</div>
          <div style="margin-top:1px;color:#64748b;font-size:10px;">${area ? `${(area * ACRES_PER_HA).toFixed(2)} acres` : "Area unavailable"}</div>
        </div>
        <div style="border:1px solid rgba(148,163,184,.13);border-radius:9px;background:rgba(15,23,42,.62);padding:8px 9px;">
          <div style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.08em;">Perimeter</div>
          <div style="margin-top:3px;color:#7dd3fc;font-size:15px;font-weight:750;font-variant-numeric:tabular-nums;">${perimeterText}</div>
          <div style="margin-top:1px;color:#64748b;font-size:10px;">Mapped boundary</div>
        </div>
      </div>
      ${details.length ? `
      <div style="display:grid;gap:5px;padding:3px 14px 11px;">
        ${details.map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;gap:12px;font-size:10px;">
            <span style="color:#64748b;">${escapeHtml(label)}</span>
            <span style="max-width:150px;overflow:hidden;color:#e2e8f0;font-weight:600;text-align:right;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(value)}</span>
          </div>`).join("")}
      </div>` : ""}
      ${candidates.length ? `
      <div style="display:flex;align-items:center;gap:11px;padding:2px 14px 11px;">
        <div style="display:grid;width:66px;height:66px;flex:none;place-items:center;border-radius:50%;background:${pieStyle};">
          <div style="display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:#101a13;color:#bef264;font-size:9px;font-weight:700;">CROP</div>
        </div>
        <div style="min-width:0;flex:1;">
          <div style="margin-bottom:5px;color:#94a3b8;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Crop likelihood</div>
          ${candidates.map((candidate) => {
            const color = cropClassificationColor(candidate.crop);
            const pct = (candidate.score / scoreTotal) * 100;
            return `<div style="display:flex;align-items:center;gap:5px;margin-top:3px;font-size:9px;">
              <span style="width:7px;height:7px;flex:none;border-radius:2px;background:${color.fill};"></span>
              <span style="min-width:0;flex:1;overflow:hidden;color:#d1d5db;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(candidate.crop)}</span>
              <span style="color:#bef264;font-variant-numeric:tabular-nums;">${pct.toFixed(0)}%</span>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}
      ${ndviPoints ? `
      <div style="padding:0 14px 10px;">
        <div style="display:flex;justify-content:space-between;color:#94a3b8;font-size:9px;">
          <span>Satellite vegetation trend</span><span>${ndviSamples.length} observations</span>
        </div>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style="display:block;width:100%;height:34px;margin-top:3px;overflow:visible;">
          <polyline points="${ndviPoints}" fill="none" stroke="#a3b66b" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
      </div>` : ""}
      <div style="padding:7px 14px;border-top:1px solid rgba(148,163,184,.12);color:#64748b;font-size:9px;letter-spacing:.02em;">AI-detected farm boundary · Hover a polygon to inspect</div>
    </div>`;
}

function bindFieldTooltip(
  feature,
  layer,
  fieldClassifications,
  classificationDetectionId,
  selectedFieldKey,
  onFieldSelect,
  hasCropIndexImage,
  showFieldFills,
) {
  const id = String(feature.properties?.field_id ?? "");
  const detectionId = String(feature.properties?.detectionId ?? "");
  const fieldKey = `${detectionId}:${id}`;
  const belongsToClassifiedRun =
    !classificationDetectionId ||
    String(feature.properties?.detectionId ?? "") === String(classificationDetectionId);
  const prediction = belongsToClassifiedRun
    ? fieldPredictionForId(fieldClassifications, feature.properties?.field_id)
    : null;
  const baseStyle = fieldStyle(feature, fieldClassifications, classificationDetectionId);
  if (!showFieldFills || hasCropIndexImage) baseStyle.fillOpacity = 0;
  if (fieldKey === selectedFieldKey) {
    baseStyle.color = "#fef08a";
    baseStyle.weight = 3.2;
    baseStyle.fillOpacity = showFieldFills && !hasCropIndexImage ? 0.68 : 0;
  }
  layer.bindTooltip(fieldHoverCard(feature, prediction), {
    sticky: true,
    direction: "auto",
    opacity: 1,
    className: "agri-plot-hover",
    offset: [0, -8],
  });
  layer.on({
    mouseover() {
      layer.setStyle({
        ...baseStyle,
        color: "#fef08a",
        weight: 3,
        fillOpacity: showFieldFills && !hasCropIndexImage ? 0.66 : 0,
      });
      layer.bringToFront?.();
    },
    mouseout() {
      layer.setStyle(baseStyle);
    },
    click(event) {
      event.originalEvent?.stopPropagation();
      onFieldSelect?.({ key: fieldKey, feature });
    },
  });
}

/**
 * Leaflet-side half of the field delineation tool: map clicks pick a village,
 * leaflet-draw captures the area, and results are drawn on top. Must render
 * inside <MapContainer>. State lives in `FieldDelineationContext`; every saved
 * detection is drawn, so results show on all maps.
 */
export default function FieldDelineationLayer({
  fieldClassifications = {},
  classificationDetectionId = "",
  selectedFieldKey = "",
  onFieldSelect,
  cropIndexFieldIds = [],
  showFieldFills = true,
}) {
  const map = useMap();
  const { step, village, area, fields, savedFields, saved, drawSession, pickVillageAt, submitArea } =
    useFieldDelineationContext();
  /** Whole-village runs return thousands of polygons; canvas keeps panning smooth. */
  const fieldsRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const cropIndexFieldIdSet = useMemo(
    () => new Set(cropIndexFieldIds.map(String)),
    [cropIndexFieldIds],
  );

  useMapEvents({
    click(e) {
      if (step === "pickVillage") pickVillageAt(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = step === "pickVillage" ? "crosshair" : "";
    return () => {
      el.style.cursor = "";
    };
  }, [map, step]);

  useEffect(() => {
    if (!village) return;
    const b = L.geoJSON(village).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
  }, [map, village]);

  useEffect(() => {
    if (!fields?.features?.length) return;
    const b = L.geoJSON(fields).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
  }, [map, fields]);

  useEffect(() => {
    if (step !== "draw") return undefined;
    const handler = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: false,
      shapeOptions: { color: "#ffffff", weight: 2, fillOpacity: 0.08 },
    });
    const onCreated = (e) => submitArea(e.layer.toGeoJSON());
    map.on(L.Draw.Event.CREATED, onCreated);
    handler.enable();
    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      handler.disable();
    };
  }, [map, step, drawSession, submitArea]);

  // react-leaflet <GeoJSON> ignores `data` changes, so key each layer by its content.
  const villageKey = village?.properties?.census_code ?? village?.properties?.name;
  const classificationKey = Object.entries(fieldClassifications)
    .map(([fieldId, prediction]) =>
      `${fieldId}:${prediction.best_crop}:${prediction.yield_prediction?.estimated_yield_tonnes ?? ""}:${prediction.yield_prediction?.yield_deficit_pct ?? ""}:${prediction.yield_prediction?.damage_category ?? ""}`,
    )
    .join("|");
  const cropIndexKey = [...cropIndexFieldIdSet].sort().join("|");
  return (
    <>
      {village && (
        <GeoJSON key={`dl-village-${villageKey}`} data={village} style={VILLAGE_STYLE} interactive={false} />
      )}
      {area && (
        <GeoJSON
          key={`dl-area-${drawSession}`}
          data={area}
          style={AREA_STYLE}
          interactive={false}
        />
      )}
      {savedFields.features.length > 0 && (
        <GeoJSON
          key={`dl-fields-${saved.map((r) => r.id).join(",")}-${classificationDetectionId}-${classificationKey}-${selectedFieldKey}-${cropIndexKey}`}
          data={savedFields}
          style={(feature) => {
            const style = fieldStyle(feature, fieldClassifications, classificationDetectionId);
            const hasCropIndexImage = cropIndexFieldIdSet.has(cropIndexFeatureKey(feature));
            if (!showFieldFills || hasCropIndexImage) style.fillOpacity = 0;
            const key = `${String(feature.properties?.detectionId ?? "")}:${String(feature.properties?.field_id ?? "")}`;
            return key === selectedFieldKey
              ? {
                  ...style,
                  color: "#fef08a",
                  weight: 3.2,
                  fillOpacity: showFieldFills && !hasCropIndexImage ? 0.68 : 0,
                }
              : style;
          }}
          onEachFeature={(feature, layer) =>
            bindFieldTooltip(
              feature,
              layer,
              fieldClassifications,
              classificationDetectionId,
              selectedFieldKey,
              onFieldSelect,
              cropIndexFieldIdSet.has(cropIndexFeatureKey(feature)),
              showFieldFills,
            )
          }
          renderer={fieldsRenderer}
        />
      )}
    </>
  );
}
