import { CROP_CLASSIFICATION_API_ORIGIN } from "../config/endpoints.js";

const CLASSIFICATION_IDLE_MS = 90_000;

function fieldProfile(feature, index) {
  const properties = feature.properties || {};
  const numberOrNull = (...values) => {
    const value = values.find((candidate) => candidate != null && candidate !== "");
    if (value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  return {
    field_id: String(properties.field_id ?? feature.id ?? index + 1),
    geometry: feature.geometry ?? null,
    properties,
    dominant_top_crop:
      properties.dominant_top_crop ?? properties.dominantTopCrop ?? properties.cropType ?? properties.crop ?? null,
    avg_kharif_share: numberOrNull(properties.avg_kharif_share, properties.avgKharifShare),
    avg_rabi_share: numberOrNull(properties.avg_rabi_share, properties.avgRabiShare),
    avg_zaid_share: numberOrNull(properties.avg_zaid_share, properties.avgZaidShare),
    avg_other_share: numberOrNull(properties.avg_other_share, properties.avgOtherShare),
    top_crop_share: numberOrNull(properties.top_crop_share, properties.topCropShare),
  };
}

function classificationRequest({ village, fields, startDate, endDate }) {
  const properties = village?.properties || {};
  return {
    village_id: String(properties.census_code ?? properties.village_id ?? properties.name ?? "unknown"),
    district_name: properties.district ?? null,
    fields: (fields?.features || []).map(fieldProfile),
    start_date: startDate,
    end_date: endDate,
  };
}

async function errorDetail(response) {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) return body.detail.map((item) => item?.msg).filter(Boolean).join("; ");
  } catch {
    // The endpoint may return a non-JSON error body.
  }
  return `HTTP ${response.status}`;
}

function parseSseBlock(block) {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  return data ? JSON.parse(data) : null;
}

export function fieldPredictionsById(response) {
  const payload = response?.result ?? response?.data ?? response;
  const predictions =
    payload?.field_predictions ??
    payload?.classifications ??
    payload?.results ??
    payload?.fields;
  if (!Array.isArray(predictions)) return {};

  return Object.fromEntries(
    predictions
      .filter((prediction) => prediction && typeof prediction === "object")
      .map((prediction) => [
        String(prediction.field_id ?? prediction.id ?? ""),
        {
          ...prediction,
          best_crop:
            prediction.best_crop ??
            prediction.dominant_top_crop ??
            prediction.dominant_crop ??
            prediction.crop ??
            prediction.classification ??
            prediction.yield_prediction?.crop ??
            null,
        },
      ])
      .filter(([fieldId, prediction]) => fieldId && (
        prediction.best_crop || prediction.yield_prediction
      )),
  );
}

export function villageClassificationInsights(response) {
  const payload = response?.result ?? response?.data ?? response;
  if (!payload || typeof payload !== "object") return null;
  return {
    dominantCrop: payload.dominant_crop ?? payload.summary?.dominant_crop ?? null,
    dominantShare: payload.dominant_share ?? null,
    fieldCount: payload.field_count ?? payload.summary?.field_count ?? null,
    summary: payload.summary?.reason ?? null,
    priorFilteringActive: Boolean(payload.prior_filtering_active),
    priorCropCount: payload.prior_crop_count ?? 0,
    topCandidates: Array.isArray(payload.top_candidates) ? payload.top_candidates : [],
    cropMix: Array.isArray(payload.crop_mix) ? payload.crop_mix : [],
    satelliteStatus: payload.satellite_status ?? null,
    temporalPeriod: payload.temporal_period ?? null,
    satelliteFieldCount: payload.satellite_field_count ?? null,
    completeSensorFieldCount: payload.complete_sensor_field_count ?? null,
    clusterSummary: Array.isArray(payload.cluster_summary) ? payload.cluster_summary : [],
    droughtAssessment: payload.drought_assessment ?? null,
  };
}

/**
 * Classifies all delineated fields for a village over the selected date range.
 * @param {{ village: object, fields: object, startDate: string, endDate: string,
 *   signal?: AbortSignal, onProgress?: (event: object) => void }} options
 */
export async function classifyVillageStream({
  village,
  fields,
  startDate,
  endDate,
  signal,
  onProgress,
}) {
  if (!startDate || !endDate || startDate > endDate) {
    throw new Error("Choose a valid classification date range.");
  }

  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  let idleTimer;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => controller.abort(new DOMException("Crop classification stalled", "TimeoutError")),
      CLASSIFICATION_IDLE_MS,
    );
  };

  try {
    resetIdleTimer();
    const response = await fetch(`${CROP_CLASSIFICATION_API_ORIGIN}/classify-village/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(classificationRequest({ village, fields, startDate, endDate })),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Crop classification: ${await errorDetail(response)}`);
    if (!response.body) throw new Error("Crop classification: response stream is unavailable.");

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let result = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      resetIdleTimer();
      buffer += value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      let separator;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const event = parseSseBlock(block);
        if (!event) continue;
        if (event.type === "progress") onProgress?.(event);
        else if (event.type === "error") {
          throw new Error(`Crop classification: ${event.detail || "The service reported an error."}`);
        } else {
          result = event.result ?? event.data ?? event;
          if (
            event.type === "result" ||
            event.type === "complete" ||
            event.type === "completed" ||
            Array.isArray(event.field_predictions)
          ) {
            return result;
          }
        }
      }
    }
    if (buffer.trim()) {
      const event = parseSseBlock(buffer);
      if (event?.type === "progress") onProgress?.(event);
      else if (event?.type === "error") {
        throw new Error(`Crop classification: ${event.detail || "The service reported an error."}`);
      } else if (event) {
        result = event.result ?? event.data ?? event;
      }
    }
    if (result != null) return result;
    throw new Error("Crop classification: stream ended without a result.");
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason instanceof Error) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(idleTimer);
    signal?.removeEventListener("abort", abort);
  }
}
