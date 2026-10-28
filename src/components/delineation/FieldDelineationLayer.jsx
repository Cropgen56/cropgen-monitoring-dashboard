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
import { toOutlineDistrict } from "../../config/districtNames";

const ACRES_PER_HA = 2.471053814671738;
const EMPTY_INDEX_MAP = new Map();

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
    return { color: cropClassificationColor(prediction.best_crop), classified: true };
  }

  const id = feature.properties?.field_id;
  const numericId = Number(id);
  const index = Number.isFinite(numericId) && numericId > 0
    ? Math.floor(numericId - 1)
    : Array.from(String(id ?? JSON.stringify(feature.geometry?.coordinates?.[0]?.[0] ?? "")))
        .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
  return { color: FIELD_COLORS[index % FIELD_COLORS.length], classified: false };
}

function fieldStyle(feature, fieldClassifications, classificationDetectionId) {
  const { color, classified } = fieldColor(feature, fieldClassifications, classificationDetectionId);
  return {
    color: color.stroke,
    weight: 1.6,
    opacity: 0.95,
    fillColor: color.fill,
    // Classified fields are coloured by crop, so fill them more strongly to read as crop groups.
    fillOpacity: classified ? 0.68 : 0.52,
  };
}

/** Health / change colouring from the village analysis: filled polygons, light outline. */
function applyAnalysisColor(style, color) {
  return color ? { ...style, fillColor: color, fillOpacity: 0.78, color: "#f8fafc", weight: 1.1, opacity: 0.85 } : style;
}

/** Village-analysis section of the hover card (Crop Monitoring). */
function insightSection(insight) {
  if (!insight) return "";
  const row = (label, value, color) => `
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:10px;">
            <span style="color:#64748b;">${escapeHtml(label)}</span>
            <span style="display:flex;align-items:center;gap:5px;color:#f8fafc;font-weight:650;">${color ? `<span style="width:8px;height:8px;border-radius:2px;background:${color};"></span>` : ""}${escapeHtml(value)}</span>
          </div>`;
  const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : "—");
  const rows = [
    insight.health && row("Health", `${insight.health.label} · score ${insight.score}`, insight.health.color),
    Number.isFinite(insight.ndvi) && row("Mean NDVI", fmt(insight.ndvi)),
    Number.isFinite(insight.changePct) &&
      row("Change", `${insight.changePct > 0 ? "+" : ""}${insight.changePct.toFixed(0)}% (from ${fmt(insight.ndviPrev)})`, insight.change?.color),
    Number.isFinite(insight.ndmi) && row("Mean NDMI (moisture)", fmt(insight.ndmi)),
  ].filter(Boolean).join("");
  const alerts = (insight.alerts || [])
    .map((a) => `<div style="margin-top:4px;padding:4px 7px;border-radius:6px;background:${a.severity === "high" ? "rgba(239,68,68,.16)" : "rgba(245,158,11,.14)"};color:${a.severity === "high" ? "#fca5a5" : "#fcd34d"};font-size:10px;font-weight:600;">⚠ ${escapeHtml(a.type)} · ${escapeHtml(a.detail)}</div>`)
    .join("");
  return `
      <div style="margin:0 12px 10px;border:1px solid rgba(148,163,184,.18);border-radius:10px;background:rgba(15,23,42,.62);padding:9px 10px;display:grid;gap:4px;">
        <div style="color:#94a3b8;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Village analysis</div>
        ${rows}${alerts}
      </div>`;
}

function formatPercent(value) {
  return value > 0 && value < 1 ? "<1%" : `${Math.round(value)}%`;
}

/** Index section in the web app's style: index value class ("status") plus the class mix. */
function indexSection(indexResult) {
  if (!indexResult) return "";
  const indexName = escapeHtml(indexResult.index_name || "Index");
  const classes = (Array.isArray(indexResult.legend) ? indexResult.legend : [])
    .map((entry) => ({ ...entry, percent: Number(entry.percent), hectares: Number(entry.hectares) }))
    .filter((entry) => entry.label && Number.isFinite(entry.percent) && entry.percent > 0)
    .sort((a, b) => b.percent - a.percent);
  const dominant = classes[0];
  const date = indexResult.date
    ? new Date(`${indexResult.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const bar = classes
    .map((entry) => `<span style="width:${entry.percent}%;background:${escapeHtml(entry.color || "#64748b")};"></span>`)
    .join("");
  return `
      <div style="margin:0 12px 10px;border:1px solid rgba(132,204,22,.22);border-radius:10px;background:rgba(15,23,42,.62);padding:9px 10px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
          <span style="color:#bef264;font-size:10px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;">${indexName}</span>
          <span style="color:#94a3b8;font-size:9px;">${escapeHtml(date)}</span>
        </div>
        ${dominant ? `
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:5px;font-size:10px;">
          <span style="color:#64748b;">Status</span>
          <span style="display:flex;align-items:center;gap:5px;color:#f8fafc;font-weight:650;">
            <span style="width:8px;height:8px;border-radius:2px;background:${escapeHtml(dominant.color || "#64748b")};"></span>
            ${escapeHtml(dominant.label)} · ${formatPercent(dominant.percent)}
          </span>
        </div>
        <div style="display:flex;height:6px;margin-top:7px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.08);">${bar}</div>
        <div style="display:grid;gap:3px;margin-top:6px;">
          ${classes.slice(0, 4).map((entry) => `
          <div style="display:flex;align-items:center;gap:5px;font-size:9px;">
            <span style="width:7px;height:7px;flex:none;border-radius:2px;background:${escapeHtml(entry.color || "#64748b")};"></span>
            <span style="min-width:0;flex:1;overflow:hidden;color:#d1d5db;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(entry.label)}</span>
            <span style="color:#94a3b8;font-variant-numeric:tabular-nums;">${Number.isFinite(entry.hectares) ? `${entry.hectares.toFixed(2)} ha · ` : ""}${formatPercent(entry.percent)}</span>
          </div>`).join("")}
        </div>` : `<div style="margin-top:5px;color:#94a3b8;font-size:10px;">No index values for this field.</div>`}
      </div>`;
}

function fieldHoverCard(feature, prediction, indexResult = null, insight = null) {
  const p = feature.properties || {};
  const name = escapeHtml(p.field_id != null ? `Farm / Field ${p.field_id}` : "Farm boundary");
  const village = escapeHtml(p.village || (p.source === "upload" ? p.name || "Uploaded file" : "Selected village"));
  const location = [p.taluka, toOutlineDistrict(p.district)].filter(Boolean).map(escapeHtml).join(" · ");
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
  const badge = escapeHtml(
    insight?.severity
      ? `Alert · ${insight.severity}`
      : prediction?.best_crop
        ? "Classified"
        : indexResult
          ? indexResult.index_name || "Index"
          : "Detected",
  );
  const footer = [
    p.source === "upload" ? "Uploaded farm boundary" : "AI-detected farm boundary",
    prediction?.best_crop && "crop classified",
    indexResult && `${indexResult.index_name || "index"} calculated`,
    "Click for details",
  ]
    .filter(Boolean)
    .join(" · ");
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
          <span style="flex:none;border:1px solid rgba(45,212,191,.25);border-radius:999px;background:rgba(13,148,136,.16);padding:3px 7px;color:#5eead4;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${badge}</span>
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
      ${insightSection(insight)}
      ${indexSection(indexResult)}
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
      <div style="padding:7px 14px;border-top:1px solid rgba(148,163,184,.12);color:#64748b;font-size:9px;letter-spacing:.02em;white-space:normal;">${footer}</div>
    </div>`;
}

/**
 * The map clips overflowing content and Leaflet's "auto" direction only flips left/right,
 * so a tall card near the bottom edge was cut off. Open it away from the nearest edge.
 */
function placeTooltip(layer, event) {
  const tooltip = layer.getTooltip?.();
  const map = layer._map;
  const point = event?.containerPoint;
  if (!tooltip || !map || !point) return;
  const size = map.getSize();
  const SIDE_MARGIN = 150;
  let direction;
  if (point.x < SIDE_MARGIN) direction = "right";
  else if (point.x > size.x - SIDE_MARGIN) direction = "left";
  else direction = point.y > size.y / 2 ? "top" : "bottom";
  tooltip.options.direction = direction;
  tooltip.options.offset = { top: [0, -10], bottom: [0, 10], left: [-10, 0], right: [10, 0] }[direction];
}

function bindFieldTooltip(
  feature,
  layer,
  fieldClassifications,
  classificationDetectionId,
  selectedFieldKey,
  onFieldSelect,
  indexResult,
  showFieldFills,
  analysisColor,
  insight,
) {
  const hasCropIndexImage = Boolean(indexResult);
  const id = String(feature.properties?.field_id ?? "");
  const detectionId = String(feature.properties?.detectionId ?? "");
  const fieldKey = `${detectionId}:${id}`;
  const belongsToClassifiedRun =
    !classificationDetectionId ||
    String(feature.properties?.detectionId ?? "") === String(classificationDetectionId);
  const prediction = belongsToClassifiedRun
    ? fieldPredictionForId(fieldClassifications, feature.properties?.field_id)
    : null;
  let baseStyle = fieldStyle(feature, fieldClassifications, classificationDetectionId);
  if (!showFieldFills || hasCropIndexImage) baseStyle.fillOpacity = 0;
  baseStyle = applyAnalysisColor(baseStyle, analysisColor);
  if (fieldKey === selectedFieldKey) {
    baseStyle.color = "#fef08a";
    baseStyle.weight = 3.2;
    if (!analysisColor) baseStyle.fillOpacity = showFieldFills && !hasCropIndexImage ? 0.68 : 0;
  }
  layer.bindTooltip(fieldHoverCard(feature, prediction, indexResult, insight), {
    sticky: true,
    direction: "auto",
    opacity: 1,
    className: "agri-plot-hover",
    offset: [0, -8],
  });
  layer.on({
    mouseover(event) {
      placeTooltip(layer, event);
      layer.setStyle({
        ...baseStyle,
        color: "#fef08a",
        weight: 3,
        fillOpacity: analysisColor ? 0.92 : showFieldFills && !hasCropIndexImage ? 0.66 : 0,
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
  /** Map of field key → crop index result (Crop Monitoring); adds the index section to hover cards. */
  cropIndexByField = EMPTY_INDEX_MAP,
  showFieldFills = true,
  /** Share the map's canvas renderer so field and district hit-testing don't block each other. */
  renderer,
  /** Map of field key → fill colour (village analysis health / change modes). */
  fieldColorByKey = EMPTY_INDEX_MAP,
  /** Map of field key → village-analysis farm record; adds an analysis section to hover cards. */
  fieldInsightsByKey = EMPTY_INDEX_MAP,
  /** Farm polygons from outside detection (an uploaded GeoJSON), drawn like detected fields. */
  extraFields = null,
  /** Changes whenever `extraFields` is replaced (react-leaflet's <GeoJSON> ignores new data). */
  extraFieldsKey = "",
}) {
  const map = useMap();
  const { step, village, area, fields, savedFields, saved, drawSession, pickVillageAt, submitArea } =
    useFieldDelineationContext();
  /** Whole-village runs return thousands of polygons; canvas keeps panning smooth. */
  const ownRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const fieldsRenderer = renderer || ownRenderer;

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
    if (!extraFields?.features?.length) return undefined;
    const b = L.geoJSON(extraFields).getBounds();
    // After the page's district FitBounds, which runs on mount.
    const t = setTimeout(() => b.isValid() && map.fitBounds(b, { padding: [24, 24] }), 150);
    return () => clearTimeout(t);
  }, [map, extraFields]);

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
  const villageKey = `${village?.properties?.census_code ?? ""}-${village?.properties?.name ?? ""}`;
  const classificationKey = Object.entries(fieldClassifications)
    .map(([fieldId, prediction]) =>
      `${fieldId}:${prediction.best_crop}:${prediction.yield_prediction?.estimated_yield_tonnes ?? ""}:${prediction.yield_prediction?.yield_deficit_pct ?? ""}:${prediction.yield_prediction?.damage_category ?? ""}`,
    )
    .join("|");
  const analysisKey = useMemo(
    () => `${fieldColorByKey.size}:${[...fieldColorByKey.values()].join("")}:${fieldInsightsByKey.size}`,
    [fieldColorByKey, fieldInsightsByKey],
  );
  const cropIndexKey = [...cropIndexByField]
    .map(([key, result]) => `${key}:${result?.index_name ?? ""}:${result?.date ?? ""}`)
    .sort()
    .join("|");
  const styleField = (feature) => {
    let style = fieldStyle(feature, fieldClassifications, classificationDetectionId);
    const hasCropIndexImage = cropIndexByField.has(cropIndexFeatureKey(feature));
    if (!showFieldFills || hasCropIndexImage) style.fillOpacity = 0;
    const analysisColor = fieldColorByKey.get(cropIndexFeatureKey(feature));
    style = applyAnalysisColor(style, analysisColor);
    const key = `${String(feature.properties?.detectionId ?? "")}:${String(feature.properties?.field_id ?? "")}`;
    return key === selectedFieldKey
      ? {
          ...style,
          color: "#fef08a",
          weight: 3.2,
          fillOpacity: analysisColor ? style.fillOpacity : showFieldFills && !hasCropIndexImage ? 0.68 : 0,
        }
      : style;
  };
  const bindField = (feature, layer) =>
    bindFieldTooltip(
      feature,
      layer,
      fieldClassifications,
      classificationDetectionId,
      selectedFieldKey,
      onFieldSelect,
      cropIndexByField.get(cropIndexFeatureKey(feature)) || null,
      showFieldFills,
      fieldColorByKey.get(cropIndexFeatureKey(feature)),
      fieldInsightsByKey.get(cropIndexFeatureKey(feature)) || null,
    );
  const layerStateKey = `${classificationDetectionId}-${classificationKey}-${selectedFieldKey}-${cropIndexKey}-${analysisKey}`;
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
          key={`dl-fields-${saved.map((r) => r.id).join(",")}-${layerStateKey}`}
          data={savedFields}
          style={styleField}
          onEachFeature={bindField}
          renderer={fieldsRenderer}
        />
      )}
      {extraFields?.features?.length > 0 && (
        <GeoJSON
          key={`dl-extra-${extraFieldsKey}-${layerStateKey}`}
          data={extraFields}
          style={styleField}
          onEachFeature={bindField}
          renderer={fieldsRenderer}
        />
      )}
    </>
  );
}
