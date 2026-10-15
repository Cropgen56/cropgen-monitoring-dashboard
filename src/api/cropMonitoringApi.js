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

export function calculatePolygonIndex({ geojson, date, indexName, signal }) {
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
      width: 800,
      height: 800,
      supersample: 1,
      smooth: false,
      gaussian_sigma: 1,
    },
    signal,
  );
}
