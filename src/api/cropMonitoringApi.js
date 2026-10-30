import {
  CROP_MONITORING_API_BASE_URL,
  CROP_MONITORING_API_KEY,
} from "../config/endpoints.js";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

/** Gateway/proxy hiccups: the same request is worth sending again. */
const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.retryable = RETRYABLE_STATUS.has(status);
  return error;
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
    networkError.retryable = true;
    throw networkError;
  }

  let body;
  try {
    body = await response.json();
  } catch {
    if (response.ok) throw new Error("Crop monitoring API returned an invalid JSON response.");
    throw httpError(`Crop monitoring API request failed (HTTP ${response.status}).`, response.status);
  }
  if (!response.ok) {
    const detail = typeof body?.detail === "string"
      ? body.detail
      : Array.isArray(body?.detail)
        ? body.detail.map((item) => item?.msg).filter(Boolean).join("; ")
        : `HTTP ${response.status}`;
    throw httpError(`Crop monitoring API: ${detail}`, response.status);
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
 * Any number of fields is handled by sending chunks and merging the responses: the server takes
 * roughly 0.6–1.4 s per field, and at 256 px each field's image adds ~26 KB, so one request for
 * a village of 1000+ fields ran for many minutes, returned ~27 MB and was dropped by the proxy.
 * Image requests are therefore chunked by pixels; stats-only (small image) runs by count.
 */
const MULTI_CHUNK_MAX_FEATURES = 1500;
const MULTI_CHUNK_MIN_FEATURES = 50;
/** ~100 fields at 256 px (≈2.6 MB, about a minute or two per request). */
const MULTI_CHUNK_PIXEL_BUDGET = 100 * 256 * 256;
/** Requests in flight across every run on the page (one click starts up to four index runs). */
const MULTI_CONCURRENCY = 4;
/** Tries per chunk for gateway errors and dropped connections; pieces of a split chunk get fewer. */
const MULTI_ATTEMPTS = 3;
const MULTI_SPLIT_ATTEMPTS = 2;
/** After this many connection/gateway failures in a row the server is treated as down: stop retrying and splitting. */
const MULTI_GIVE_UP_STREAK = 6;
/** Wait before re-asking for fields the server reported as failed upstream (provider timeouts). */
const MULTI_FIELD_RETRY_DELAY_MS = 2000;

function chunkSizeFor(size) {
  if (!size) return MULTI_CHUNK_MAX_FEATURES;
  const bySize = Math.floor(MULTI_CHUNK_PIXEL_BUDGET / (size * size));
  return Math.max(MULTI_CHUNK_MIN_FEATURES, Math.min(MULTI_CHUNK_MAX_FEATURES, bySize));
}

/** A chunk is some of the collection's features plus their positions (`indices`) in the whole collection. */
function pickChunk(chunk, positions) {
  return {
    indices: positions.map((p) => chunk.indices[p]),
    geojson: { ...chunk.geojson, features: positions.map((p) => chunk.geojson.features[p]) },
  };
}

function range(start, end) {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

function chunkCollection(geojson, chunkSize) {
  const whole = { indices: range(0, geojson.features.length), geojson };
  const chunks = [];
  for (let start = 0; start < geojson.features.length; start += chunkSize) {
    chunks.push(pickChunk(whole, range(start, Math.min(start + chunkSize, geojson.features.length))));
  }
  return chunks;
}

/** The ids the server gives these features (feature_collection.py): own id, else position, made unique. */
function serverFeatureIds(features) {
  const seen = new Map();
  return features.map((feature, i) => {
    const props = feature?.properties || {};
    const own = [feature?.id, props.id, props.name].find((v) => v != null && String(v).trim());
    const id = own != null ? String(own) : `feature-${i + 1}`;
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    return n > 1 ? `${id}-${n}` : id;
  });
}

let activeRequests = 0;
const waitingRequests = [];

/** Runs `fn` once one of the MULTI_CONCURRENCY slots is free; a finished request hands its slot on. */
async function withSlot(fn) {
  if (activeRequests < MULTI_CONCURRENCY) activeRequests += 1;
  else await new Promise((resolve) => waitingRequests.push(resolve));
  try {
    return await fn();
  } finally {
    const next = waitingRequests.shift();
    if (next) next();
    else activeRequests -= 1;
  }
}

function pause(ms, signal) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

function abortError(signal) {
  return signal.reason ?? new DOMException("The request was aborted.", "AbortError");
}

/** Worth splitting: the proxy refused the size, the server crashed, or one feature's geometry was rejected. */
function isSplittable(error) {
  return Boolean(
    error?.retryable
      || error?.status === 413
      || error?.status === 500
      || (error?.status === 400 && /^Crop monitoring API: Feature /.test(error.message)),
  );
}

/**
 * Sends one chunk. Gateway errors and dropped connections are retried with backoff. A chunk that
 * still fails, or fails because of its size or one bad field, is split in half, so in the end only
 * the fields that really fail are left without a result. Fields the server answered with an
 * upstream error (5xx in `errors`, e.g. a provider timeout) are asked for once more.
 * Returns a flat list of `{ chunk, value }` / `{ chunk, reason }` parts.
 */
async function runChunk(chunk, request, signal, breaker, attempts = MULTI_ATTEMPTS, isRetry = false) {
  let error;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt) await pause(1000 * 3 ** (attempt - 1), signal);
    if (signal?.aborted) throw abortError(signal);
    try {
      // Checked again once a slot frees up: the run may have been cancelled while this chunk queued.
      const value = await withSlot(() => {
        if (signal?.aborted) throw abortError(signal);
        return request(chunk.geojson);
      });
      breaker.streak = 0;
      return isRetry ? [{ chunk, value }] : retryFieldErrors({ chunk, value }, request, signal, breaker);
    } catch (e) {
      if (signal?.aborted) throw e;
      error = e;
      // 413/500/400 are answers from a working server: they call for a split, not for giving up.
      if (!e?.retryable) break;
      breaker.streak += 1;
      if (breaker.streak >= MULTI_GIVE_UP_STREAK) break;
    }
  }
  const { features } = chunk.geojson;
  if (isSplittable(error) && features.length > 1 && breaker.streak < MULTI_GIVE_UP_STREAK) {
    const half = Math.ceil(features.length / 2);
    const parts = await Promise.all(
      [range(0, half), range(half, features.length)]
        .map((positions) => runChunk(pickChunk(chunk, positions), request, signal, breaker, MULTI_SPLIT_ATTEMPTS, isRetry)),
    );
    return parts.flat();
  }
  return [{ chunk, reason: error }];
}

async function retryFieldErrors(part, request, signal, breaker) {
  const errors = part.value?.errors || [];
  const transient = new Set(errors.filter((e) => Number(e?.status_code) >= 500).map((e) => String(e.id)));
  if (!transient.size) return [part];
  const ids = serverFeatureIds(part.chunk.geojson.features);
  const positions = ids.flatMap((id, i) => (transient.has(id) ? [i] : []));
  if (!positions.length) return [part];

  await pause(MULTI_FIELD_RETRY_DELAY_MS, signal);
  if (signal?.aborted) throw abortError(signal);
  const retried = (await runChunk(pickChunk(part.chunk, positions), request, signal, breaker, MULTI_SPLIT_ATTEMPTS, true))
    .filter((p) => "value" in p);
  // Fields the retry answered (with a result or a fresh error) drop their first error.
  const answered = new Set(retried.flatMap((p) => p.chunk.indices));
  const stillFirst = errors.filter((e) => {
    const position = ids.indexOf(String(e?.id));
    return position < 0 || !answered.has(part.chunk.indices[position]);
  });
  return [{ ...part, value: { ...part.value, errors: stillFirst } }, ...retried];
}

async function runChunked(geojson, chunkSize, request, signal) {
  const breaker = { streak: 0 };
  const parts = await Promise.all(
    chunkCollection(geojson, chunkSize).map((chunk) => runChunk(chunk, request, signal, breaker)),
  );
  return parts.flat();
}

/** Fails only when nothing succeeded; otherwise failed parts just leave those fields without a result. */
function settledParts(parts) {
  const ok = parts.filter((p) => "value" in p);
  const failed = parts.filter((p) => !("value" in p));
  if (!ok.length) {
    throw failed[0]?.reason || new Error("Crop monitoring API request failed.");
  }
  return { ok, failedFeatures: failed.reduce((n, p) => n + p.chunk.indices.length, 0) };
}

/** Ids are "feature-N" by position in their own request; renumber them for the whole collection. */
function renumberId(id, indices) {
  const m = /^feature-(\d+)$/.exec(String(id ?? ""));
  const index = m ? indices[Number(m[1]) - 1] : undefined;
  return index === undefined ? id : `feature-${index + 1}`;
}

/** Same date across chunks: add up covered fields; cloud cover weighted by fields covered. */
function mergeAvailability(parts, failedFeatures) {
  const byDate = new Map();
  let total = 0;
  for (const { chunk, value: response } of parts) {
    total += Number(response?.total_features) || 0;
    for (const item of response?.items || []) {
      if (!item?.date) continue;
      const count = Number(item.feature_count) || 0;
      const cloud = Number(item.cloud_cover);
      const prev = byDate.get(item.date) || { ...item, feature_count: 0, feature_ids: [], cloudWeight: 0, cloudSum: 0 };
      prev.feature_count += count;
      prev.feature_ids.push(...(item.feature_ids || []).map((id) => renumberId(id, chunk.indices)));
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
  // Failed fields count in the total, so coverage per date stays honest.
  return {
    ...parts[0].value,
    items,
    total_features: total + failedFeatures,
    ...(failedFeatures ? { failed_features: failedFeatures } : {}),
  };
}

function mergeIndexResults(parts, failedFeatures, totalFeatures) {
  const renumber = (list, indices) => (list || []).map((r) => ({ ...r, id: renumberId(r?.id, indices) }));
  const results = parts.flatMap(({ chunk, value }) => renumber(value?.results, chunk.indices));
  const errors = parts.flatMap(({ chunk, value }) => renumber(value?.errors, chunk.indices));
  return {
    ...parts[0].value,
    total_features: totalFeatures,
    succeeded: results.length,
    failed: errors.length + failedFeatures,
    results,
    errors,
    ...(failedFeatures ? { failed_features: failedFeatures } : {}),
  };
}

export async function fetchPolygonAvailability({ geojson, startDate, endDate, signal }) {
  validateRequest(geojson, startDate, endDate);
  const parts = await runChunked(
    geojson,
    MULTI_CHUNK_MAX_FEATURES,
    (chunk) => postJson(
      "/multi/availability/",
      { geojson: chunk, start_date: startDate, end_date: endDate, provider: "both", satellite: "s2" },
      signal,
    ),
    signal,
  );
  const { ok, failedFeatures } = settledParts(parts);
  return mergeAvailability(ok, failedFeatures);
}

/** `size`: image px per field. Analysis-only runs pass a small size (they use `stats`, not the image). */
export async function calculatePolygonIndex({ geojson, date, indexName, signal, size = 256 }) {
  validateRequest(geojson, date, date);
  if (!String(indexName || "").trim()) throw new Error("Choose an index to calculate.");
  const parts = await runChunked(
    geojson,
    chunkSizeFor(size),
    (chunk) => postJson(
      "/multi/calculate/index",
      {
        geojson: chunk,
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
    ),
    signal,
  );
  const { ok, failedFeatures } = settledParts(parts);
  return mergeIndexResults(ok, failedFeatures, geojson.features.length);
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
