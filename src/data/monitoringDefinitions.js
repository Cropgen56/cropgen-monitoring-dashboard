/**
 * Canonical monitoring semantics: NDVI bands, crop styling, risk thresholds,
 * district key normalization, and feature sanitization for map/charts.
 */

/** Normalize district names for matching bundled GeoJSON filenames */
export function normalizeDistrictKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Select district GeoJSON key candidates (normalized UI district → file keys).
 * Extend aliases when official names differ from filenames.
 */
export const DISTRICT_FILE_ALIAS_KEYS = {
  aurangabad: ["aurangabadakachhatrapatisambhajinagar"],
  bhandara: ["bhandhana"],
  mumbaicity: ["mumbaicity"],
  mumbaisuburban: ["mumbaisuburban"],
};

export function districtKeyCandidates(districtName) {
  const n = normalizeDistrictKey(districtName);
  const extra = DISTRICT_FILE_ALIAS_KEYS[n] || [];
  return [n, ...extra.map(normalizeDistrictKey)];
}

/** Plot / map data semantics for UI hints */
export const MAP_DATA_MODE = {
  EMPTY: "empty",
  FIELD_POLYGONS: "field_polygons",
  DISTRICT_OUTLINE: "district_outline",
};

/**
 * Classify a FeatureCollection for trust messaging.
 * @param {import('geojson').FeatureCollection | null} fc
 */
export function classifyMapDataMode(fc) {
  const features = fc?.features;
  if (!Array.isArray(features) || features.length === 0) {
    return {
      mode: MAP_DATA_MODE.EMPTY,
      hint: "No geometries loaded for this view.",
    };
  }
  const hasFieldPlots = features.some(
    (f) => f?.properties?.layerType !== "district",
  );
  if (hasFieldPlots) {
    return {
      mode: MAP_DATA_MODE.FIELD_POLYGONS,
      hint: null,
    };
  }
  return {
    mode: MAP_DATA_MODE.DISTRICT_OUTLINE,
    hint: "District boundary only — plot-level crop intelligence is loaded for Washim (soybean) and Jalna (banana) in this demo. Other districts show administrative outline.",
  };
}

const VALID_GEOM_TYPES = new Set([
  "Polygon",
  "MultiPolygon",
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
]);

/**
 * Drop invalid features; ensure stable `_id` for selection.
 * @param {import('geojson').FeatureCollection | null} fc
 */
export function sanitizeFeatureCollection(fc, options = {}) {
  const { idPrefix = "feat" } = options;
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return { type: "FeatureCollection", features: [] };
  }
  const out = [];
  fc.features.forEach((f, i) => {
    if (!f || f.type !== "Feature") return;
    const g = f.geometry;
    if (!g || !VALID_GEOM_TYPES.has(g.type)) return;
    const props = { ...(f.properties || {}) };
    if (!props._id) props._id = `${idPrefix}-${i}`;
    out.push({ ...f, properties: props });
  });
  return { type: "FeatureCollection", features: out };
}

/** Crop classification colors (survey layer) */
export const CROP_HEX = {
  Banana: "#eab308",
  Soybean: "#22c55e",
  Rice: "#2563eb",
  Cotton: "#a855f7",
  Sugarcane: "#ea580c",
  Chili: "#ef4444",
  Wheat: "#d6d3d1",
  Maize: "#ca8a04",
  Tobacco: "#78716c",
};

/** NDVI ramp for choropleth (aligned with survey popup thresholds) */
export function ndviFillColor(ndvi) {
  const x = Number(ndvi) || 0;
  if (x >= 0.7) return "#16a34a";
  if (x >= 0.55) return "#84cc16";
  if (x >= 0.45) return "#eab308";
  if (x >= 0.35) return "#f97316";
  return "#dc2626";
}

/** Verbal crop-health bucket → stroke/fill for admin default layer */
export function healthBucketColor(health) {
  const value = String(health || "").toLowerCase();
  switch (value) {
    case "very good":
      return "#22c55e";
    case "good":
      return "#4ade80";
    case "decent":
      return "#eab308";
    case "poor":
      return "#f97316";
    default:
      return "#9ca3af";
  }
}

export function droughtStressColors(cls) {
  switch (cls) {
    case "high":
      return { fill: "#dc2626", stroke: "#991b1b" };
    case "moderate":
      return { fill: "#f97316", stroke: "#c2410c" };
    default:
      return { fill: "#22c55e", stroke: "#15803d" };
  }
}

/** Survey popup risk (NDVI + cropHealth text) */
export function surveyRiskLevelFromProps(p) {
  const ndvi = Number(p?.surveyNdviHealth ?? p?.avgNDVI ?? 0);
  const h = String(p?.cropHealth || "").toLowerCase();
  if (h === "poor" || ndvi < 0.4) return "High";
  if (h === "decent" || ndvi < 0.55) return "Moderate";
  return "Low";
}

export function surveyRiskColor(level) {
  if (level === "High") return "#f87171";
  if (level === "Moderate") return "#fbbf24";
  return "#4ade80";
}

/** AI risk overlay (admin risk layer) */
export function aiRiskZoneColors(feature) {
  const tags = feature?.properties?.aiRiskTags || [];
  if (tags.includes("high_risk_zone"))
    return { fill: "#dc2626", stroke: "#7f1d1d" };
  if (tags.includes("over_fertilization"))
    return { fill: "#a855f7", stroke: "#6b21a8" };
  if (tags.includes("moderate_et_deficit"))
    return { fill: "#f97316", stroke: "#9a3412" };
  return { fill: "#22c55e", stroke: "#14532d" };
}

/**
 * Preferred language label from plot properties (demo default Marathi + Hindi).
 */
export function formatFarmerLanguageLabel(p) {
  const raw = p?.preferredLanguage ?? p?.language ?? p?.locale;
  if (raw && String(raw).trim()) {
    const map = {
      mr: "Marathi",
      hi: "Hindi",
      en: "English",
    };
    const k = String(raw).trim().toLowerCase();
    return map[k] || String(raw).trim();
  }
  return "Marathi / Hindi";
}

/** Metric blurbs for tooltips / README alignment */
export const METRIC_HELP = {
  ndvi:
    "NDVI approximates green biomass from satellite; higher values usually indicate healthier canopy.",
  yieldTonPerAcre:
    "Predicted yield is a demo estimate (ton/acre) vs cluster benchmark for comparison.",
  districtOutline:
    "Administrative boundary from bundled district GeoJSON — not individual farm parcels.",
};
