/**
 * World location API (countries → states → cities). Host configurable via
 * `VITE_LOCATION_API_ORIGIN` in `src/config/endpoints.js`.
 */

import { LOCATION_API_ORIGIN } from "../config/endpoints.js";

const BASE_URL = LOCATION_API_ORIGIN;

const DEFAULT_FETCH_MS = 18_000;

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs, ...fetchOpts } = options;
  const ms = timeoutMs ?? DEFAULT_FETCH_MS;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...fetchOpts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function parseResponse(response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from location API");
  }
  if (!json || json.success !== true) {
    throw new Error(json?.message || "Location API returned success: false");
  }
  return json;
}

/**
 * @returns {Promise<Array<{ iso2: string, name: string }>>}
 */
export async function fetchCountries() {
  const res = await fetchWithTimeout(`${BASE_URL}/api/countries`);
  if (!res.ok) throw new Error(`Countries: ${res.status}`);
  const json = await parseResponse(res);
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * @param {string} countryCode ISO2 e.g. IN
 * @returns {Promise<Array<{ country_code: string, state_code: string, name: string }>>}
 */
export async function fetchStates(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!code) return [];
  const res = await fetchWithTimeout(`${BASE_URL}/api/states/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`States: ${res.status}`);
  const json = await parseResponse(res);
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * @param {string} stateCode e.g. MH
 * @param {string} query
 * @param {number} [limit=20]
 */
export async function searchCities(stateCode, query, limit = 20) {
  const s = String(stateCode || "").trim().toUpperCase();
  const q = String(query || "").trim();
  if (!s) return [];
  const params = new URLSearchParams({ state: s, q, limit: String(limit) });
  const res = await fetchWithTimeout(`${BASE_URL}/api/cities?${params}`);
  if (!res.ok) throw new Error(`Cities search: ${res.status}`);
  const json = await parseResponse(res);
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * @param {string} stateCode e.g. MH
 * @param {number} [page=1]
 * @param {number} [limit=100]
 * @returns {Promise<{ data: Array, pagination?: object }>}
 */
export async function fetchCitiesPage(stateCode, page = 1, limit = 100) {
  const s = String(stateCode || "").trim().toUpperCase();
  if (!s) return { data: [], pagination: null };
  const params = new URLSearchParams({
    state: s,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetchWithTimeout(`${BASE_URL}/api/cities/all?${params}`);
  if (!res.ok) throw new Error(`Cities page: ${res.status}`);
  const json = await parseResponse(res);
  return {
    data: Array.isArray(json.data) ? json.data : [],
    pagination: json.pagination ?? null,
  };
}

export async function fetchHealth() {
  const res = await fetchWithTimeout(`${BASE_URL}/health`, { timeoutMs: 8000 });
  if (!res.ok) throw new Error(`Health: ${res.status}`);
  return res.json();
}
