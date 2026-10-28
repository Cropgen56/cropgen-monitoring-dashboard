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
  let response;
  try {
    response = await fetch(`${normalizeBaseUrl(CROP_MONITORING_API_BASE_URL)}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": CROP_MONITORING_API_KEY,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    // The browser only says "Failed to fetch" when the connection drops, e.g. the proxy gave
    // up on a slow or very large request (its error page carries no CORS headers).
    const networkError = new Error(
      "Crop monitoring API: the connection dropped (the request may have been too slow or too large).",
    );
    networkError.network = true;
    throw networkError;
  }

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

/**
 * Large collections are sent in chunks and the responses merged: the server takes roughly
 * 0.6–1.4 s per field, and at 256 px each field's image adds ~26 KB, so one request for a
 * village of 1000+ fields ran for many minutes, returned ~27 MB and was dropped by the proxy.
 * Image requests are therefore chunked by pixels; stats-only (small image) runs by count.
 */
const MULTI_CHUNK_MAX_FEATURES = 1500;
const MULTI_CHUNK_MIN_FEATURES = 50;
/** ~100 fields at 256 px (≈2.6 MB, about a minute or two per request). */
const MULTI_CHUNK_PIXEL_BUDGET = 100 * 256 * 256;
const MULTI_CHUNK_CONCURRENCY = 3;

function chunkSizeFor(size) {
  if (!size) return MULTI_CHUNK_MAX_FEATURES;
  const bySize = Math.floor(MULTI_CHUNK_PIXEL_BUDGET / (size * size));
  return Math.max(MULTI_CHUNK_MIN_FEATURES, Math.min(MULTI_CHUNK_MAX_FEATURES, bySize));
}

function chunkCollection(geojson, chunkSize) {
  const { features } = geojson;
  const chunks = [];
  for (let start = 0; start < features.length; start += chunkSize) {
    chunks.push({ offset: start, geojson: { ...geojson, features: features.slice(start, start + chunkSize) } });
  }
  return chunks;
}

/** Runs chunks a few at a time; a dropped connection is retried once. Returns settled results. */
async function mapChunks(chunks, run, signal) {
  const out = new Array(chunks.length);
  let next = 0;
  const attempt = async (chunk) => {
    try {
      return await run(chunk);
    } catch (error) {
      if (!error?.network || signal?.aborted) throw error;
      return run(chunk);
    }
  };
  const worker = async () => {
    while (next < chunks.length && !signal?.aborted) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await attempt(chunks[i]) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MULTI_CHUNK_CONCURRENCY, chunks.length) }, worker));
  return out;
}

/** Every chunk must succeed for dates; for index results, failed chunks only leave those fields empty. */
function settledValues(settled, chunks, { allowPartial }) {
  const failed = settled.map((r, i) => (r?.status === "fulfilled" ? null : { chunk: chunks[i], reason: r?.reason }))
    .filter(Boolean);
  if (failed.length === settled.length || (failed.length && !allowPartial)) {
    throw failed[0].reason || new Error("Crop monitoring API request failed.");
  }
  return {
    values: settled.map((r) => (r?.status === "fulfilled" ? r.value : null)),
    failedFeatures: failed.reduce((n, f) => n + f.chunk.geojson.features.length, 0),
  };
}

/** Same date across chunks: add up covered fields; cloud cover weighted by fields covered. */
function mergeAvailability(responses) {
  const byDate = new Map();
  let total = 0;
  for (const response of responses) {
    total += Number(response?.total_features) || 0;
    for (const item of response?.items || []) {
      if (!item?.date) continue;
      const count = Number(item.feature_count) || 0;
      const cloud = Number(item.cloud_cover);
      const prev = byDate.get(item.date) || { ...item, feature_count: 0, cloudWeight: 0, cloudSum: 0 };
      prev.feature_count += count;
      if (Number.isFinite(cloud)) {
        prev.cloudSum += cloud * Math.max(count, 1);
        prev.cloudWeight += Math.max(count, 1);
      }
      byDate.set(item.date, prev);
    }
  }
  const items = [...byDate.values()].map(({ cloudSum, cloudWeight, ...item }) => ({
    ...item,
    cloud_cover: cloudWeight ? cloudSum / cloudWeight : item.cloud_cover,
  }));
  return { ...responses[0], items, total_features: total };
}

/** Results are named "feature-N" by position in their own request; renumber them for the whole collection. */
function mergeIndexResults(responses, chunks, failedFeatures) {
  const results = responses.flatMap((response, i) =>
    (response?.results || []).map((r) => {
      const m = /^feature-(\d+)$/.exec(String(r?.id ?? ""));
      return m ? { ...r, id: `feature-${Number(m[1]) + chunks[i].offset}` } : r;
    }),
  );
  const first = responses.find(Boolean);
  return { ...first, results, ...(failedFeatures ? { failed_features: failedFeatures } : {}) };
}

export async function fetchPolygonAvailability({ geojson, startDate, endDate, signal }) {
  validateRequest(geojson, startDate, endDate);
  if (geojson.features.length > MULTI_CHUNK_MAX_FEATURES) {
    const chunks = chunkCollection(geojson, MULTI_CHUNK_MAX_FEATURES);
    const settled = await mapChunks(
      chunks,
      (chunk) => fetchPolygonAvailability({ geojson: chunk.geojson, startDate, endDate, signal }),
      signal,
    );
    return mergeAvailability(settledValues(settled, chunks, { allowPartial: false }).values);
  }
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
export async function calculatePolygonIndex({ geojson, date, indexName, signal, size = 256 }) {
  validateRequest(geojson, date, date);
  if (!String(indexName || "").trim()) throw new Error("Choose an index to calculate.");
  const chunkSize = chunkSizeFor(size);
  if (geojson.features.length > chunkSize) {
    const chunks = chunkCollection(geojson, chunkSize);
    const settled = await mapChunks(
      chunks,
      (chunk) => calculatePolygonIndex({ geojson: chunk.geojson, date, indexName, signal, size }),
      signal,
    );
    const { values, failedFeatures } = settledValues(settled, chunks, { allowPartial: true });
    return mergeIndexResults(values, chunks, failedFeatures);
  }
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
