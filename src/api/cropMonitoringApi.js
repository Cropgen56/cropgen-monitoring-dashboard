import {
  CROP_MONITORING_API_BASE_URL,
  CROP_MONITORING_API_KEY,
} from "../config/endpoints.js";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

async function postJson(path, payload, signal) {
  if (!CROP_MONITORING_API_KEY) {
    throw new Error("Crop monitoring API key is not configured. Set VITE_CROP_MONITORING_API_KEY and restart the app.");
  }
  const response = await fetch(`${normalizeBaseUrl(CROP_MONITORING_API_BASE_URL)}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": CROP_MONITORING_API_KEY,
    },
    body: JSON.stringify(payload),
    signal,
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "Crop monitoring API returned an invalid JSON response."
        : `Crop monitoring API request failed (HTTP ${response.status}).`,
    );
  }
  if (!response.ok) {
    const detail = typeof body?.detail === "string"
      ? body.detail
      : Array.isArray(body?.detail)
        ? body.detail.map((item) => item?.msg).filter(Boolean).join("; ")
        : `HTTP ${response.status}`;
    throw new Error(`Crop monitoring API: ${detail}`);
  }
  return body;
}

function validateRequest(geojson, startDate, endDate) {
  if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features) || !geojson.features.length) {
    throw new Error("Run field detection first to provide farm polygons.");
  }
  if (!startDate || !endDate || startDate > endDate) {
    throw new Error("Choose a valid start and end date.");
  }
}

export function fetchPolygonAvailability({ geojson, startDate, endDate, signal }) {
  validateRequest(geojson, startDate, endDate);
  return postJson(
    "/multi/availability/",
    {
      geojson,
      start_date: startDate,
      end_date: endDate,
      provider: "both",
      satellite: "s2",
    },
    signal,
  );
}

/** `size`: image px per field. Analysis-only runs pass a small size (they use `stats`, not the image). */
export function calculatePolygonIndex({ geojson, date, indexName, signal, size = 256 }) {
  validateRequest(geojson, date, date);
  if (!String(indexName || "").trim()) throw new Error("Choose an index to calculate.");
  return postJson(
    "/multi/calculate/index",
    {
      geojson,
      date,
      index_name: indexName,
      provider: "both",
      satellite: "s2",
      // One image per field: Sentinel-2 is 10 m/pixel, so 256 px is already finer than the data
      // and keeps the response ~5x smaller than 800 px for villages with 1000+ fields.
      width: size,
      height: size,
      supersample: 1,
      smooth: false,
      gaussian_sigma: 1,
    },
    signal,
  );
}

// ---- Single-farm analysis (Farm Report) -----------------------------------
// Each takes one farm's GeoJSON geometry. They are independent and can run in parallel.

/** NDVI-style series: { index, summary: { min, mean, max }, timeseries: [{ date, value, status }] } */
export function fetchVegetationSeries({ geometry, startDate, endDate, index = "NDVI", signal }) {
  return postJson(
    "/timeseries/vegetation/vegetation",
    { geometry, start_date: startDate, end_date: endDate, index },
    signal,
  );
}

/** Water/moisture series (NDMI by default); same shape as fetchVegetationSeries. */
export function fetchWaterSeries({ geometry, startDate, endDate, index = "NDMI", signal }) {
  return postJson("/timeseries/water/water", { geometry, start_date: startDate, end_date: endDate, index }, signal);
}

/** { health (0–100), status, ndvi, ndre, stress, stage, cloud_coverage } */
export function fetchCropHealth({ geometry, date, signal }) {
  return postJson("/crop-health/score", { geometry, date }, signal);
}

/** { nutrients: { nitrogen|phosphorous|potassium: { health_score, factor, source_index } }, date } */
export function fetchNutrients({ geometry, date, signal }) {
  return postJson("/npk/availability", { geometry, date }, signal);
}

/** Soil organic carbon: { date, image_base64, soc_stats: { mean_pct, classes, confidence, … }, metadata } */
export function fetchSoilCarbon({ geometry, startDate, endDate, signal }) {
  return postJson("/soc/analysis", { geometry, start_date: startDate, end_date: endDate }, signal);
}

/** { bounds, layers: [{ layer, name, image_base64, legend }], warnings } */
export function fetchTerrain({ geometry, startDate, endDate, signal }) {
  return postJson(
    "/terrain",
    { aoi: { type: "Feature", properties: {}, geometry }, start_date: startDate, end_date: endDate },
    signal,
  );
}
