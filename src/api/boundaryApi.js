/**
 * Village boundary lookup + field boundary delineation services. Hosts configurable
 * via `VITE_VILLAGE_BOUNDARY_API_ORIGIN` / `VITE_FIELD_DELINEATION_API_ORIGIN`.
 */

import {
  FIELD_DELINEATION_API_ORIGIN,
  VILLAGE_BOUNDARY_API_ORIGIN,
} from "../config/endpoints.js";

const VILLAGE_FETCH_MS = 20_000;

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs, signal, ...fetchOpts } = options;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  const onAbort = () => ctrl.abort(signal.reason);
  if (signal?.aborted) onAbort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, { ...fetchOpts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** FastAPI returns `detail` as a string, or as a list of validation errors (422). */
async function errorDetail(res) {
  try {
    const json = await res.json();
    if (typeof json?.detail === "string") return json.detail;
    if (Array.isArray(json?.detail)) return json.detail.map((d) => d?.msg).filter(Boolean).join("; ");
  } catch {
    /* non-JSON body */
  }
  return `HTTP ${res.status}`;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {"village" | "taluka" | "district"} [level="village"]
 * @returns {Promise<object | null>} GeoJSON Feature, or null when no boundary covers the point
 */
export async function fetchVillageBoundary(lat, lng, level = "village", { signal } = {}) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), level });
  const res = await fetchWithTimeout(`${VILLAGE_BOUNDARY_API_ORIGIN}/boundary/?${params}`, {
    timeoutMs: VILLAGE_FETCH_MS,
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Village boundary: ${await errorDetail(res)}`);
  return res.json();
}

/** Abort a detection stream if the server sends nothing (not even a keepalive) for this long. */
const DELINEATION_IDLE_MS = 90_000;

/**
 * Runs the field boundary model over the supplied polygon(s) via the SSE endpoint
 * (`/api/v1/predict/stream`), reporting pipeline progress as it goes.
 * @param {object | object[]} geojson Feature, FeatureCollection, or array of Features (WGS84)
 * @param {{ taluka?: string, signal?: AbortSignal,
 *   onProgress?: (p: { pct: number, message: string }) => void }} [options]
 * @returns {Promise<{ type: "FeatureCollection", features: object[] }>}
 */
export async function delineateFields(geojson, { taluka, signal, onProgress } = {}) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort(signal.reason);
  if (signal?.aborted) onAbort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let idleTimer;
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => ctrl.abort(new DOMException("Field detection stalled", "TimeoutError")),
      DELINEATION_IDLE_MS,
    );
  };

  try {
    resetIdle();
    const res = await fetch(`${FIELD_DELINEATION_API_ORIGIN}/api/v1/predict/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(taluka ? { geojson, taluka } : { geojson }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Field delineation: ${await errorDetail(res)}`);

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      resetIdle();
      buffer += value;
      // SSE events are separated by a blank line; ": keepalive" comment lines are skipped.
      let sep;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const data = block
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data) continue;
        const event = JSON.parse(data);
        if (event.type === "progress") onProgress?.({ pct: event.pct, message: event.message });
        else if (event.type === "error") throw new Error(`Field delineation: ${event.detail}`);
        else if (event.type === "result") return event.geojson;
      }
    }
    throw new Error("Field delineation: stream ended without a result");
  } catch (e) {
    // Surface our own timeout / the caller's abort reason rather than a generic AbortError.
    if (ctrl.signal.aborted && ctrl.signal.reason instanceof Error) throw ctrl.signal.reason;
    throw e;
  } finally {
    clearTimeout(idleTimer);
    signal?.removeEventListener("abort", onAbort);
  }
}
