/**
 * Google Places API (New) — place search limited to Maharashtra.
 * Key from `VITE_GOOGLE_MAPS_API_KEY` (see `src/config/endpoints.js`).
 */

import { GOOGLE_MAPS_API_KEY } from "../config/endpoints.js";

const BASE_URL = "https://places.googleapis.com/v1";

/** Maharashtra bounding box; suggestions are further filtered to the state by name. */
const MAHARASHTRA_RECT = {
  low: { latitude: 15.6, longitude: 72.6 },
  high: { latitude: 22.1, longitude: 80.9 },
};

export const isPlacesSearchEnabled = Boolean(GOOGLE_MAPS_API_KEY);

/** Groups autocomplete + details calls into one billed session. */
export function newPlacesSessionToken() {
  return crypto.randomUUID();
}

async function errorMessage(res) {
  try {
    const json = await res.json();
    if (json?.error?.message) return json.error.message;
  } catch {
    /* non-JSON body */
  }
  return `HTTP ${res.status}`;
}

/**
 * @returns {Promise<Array<{ placeId: string, mainText: string, secondaryText: string }>>}
 */
export async function autocompletePlaces(input, { sessionToken, signal } = {}) {
  const res = await fetch(`${BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["in"],
      locationRestriction: { rectangle: MAHARASHTRA_RECT },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Place search: ${await errorMessage(res)}`);
  const json = await res.json();
  return (json.suggestions || [])
    .map((s) => s.placePrediction)
    .filter((p) => p && /Maharashtra/i.test(p.text?.text || ""))
    .map((p) => ({
      placeId: p.placeId,
      mainText: p.structuredFormat?.mainText?.text || p.text.text,
      secondaryText: p.structuredFormat?.secondaryText?.text || "",
    }));
}

/**
 * @returns {Promise<{ name: string, address: string, lat: number, lng: number,
 *   viewport: [[number, number], [number, number]] | null, district: string }>}
 */
export async function getPlace(placeId, { sessionToken, signal } = {}) {
  const params = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const res = await fetch(`${BASE_URL}/places/${encodeURIComponent(placeId)}${params}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "displayName,formattedAddress,location,viewport,addressComponents",
    },
    signal,
  });
  if (!res.ok) throw new Error(`Place details: ${await errorMessage(res)}`);
  const p = await res.json();
  const v = p.viewport;
  // In India, administrative_area_level_3 is the district (level 2 is the division).
  const district =
    (p.addressComponents || []).find((c) => c.types?.includes("administrative_area_level_3"))
      ?.longText || "";
  return {
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    lat: p.location.latitude,
    lng: p.location.longitude,
    viewport: v
      ? [
          [v.low.latitude, v.low.longitude],
          [v.high.latitude, v.high.longitude],
        ]
      : null,
    district,
  };
}
