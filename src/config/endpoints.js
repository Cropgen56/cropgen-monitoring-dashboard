/**
 * White-label API hosts. Override in `.env` with `VITE_API_BASE_URL` and
 * `VITE_LOCATION_API_ORIGIN`. Defaults preserve existing demo integrations.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://server.cropgenapp.com/v1/api";

export const LOCATION_API_ORIGIN =
  import.meta.env.VITE_LOCATION_API_ORIGIN || "https://location.cropgenapp.com";

/** Maharashtra village / taluka / district boundary lookup (lat/lng → GeoJSON Feature). */
export const VILLAGE_BOUNDARY_API_ORIGIN =
  import.meta.env.VITE_VILLAGE_BOUNDARY_API_ORIGIN ||
  "https://village-boundary-411399230985.asia-south1.run.app";

/** Field boundary delineation model (village/area GeoJSON → field polygons). */
export const FIELD_DELINEATION_API_ORIGIN =
  import.meta.env.VITE_FIELD_DELINEATION_API_ORIGIN ||
  "https://boundary-delineation-411399230985.asia-south1.run.app";

/** Village crop classification service (field profiles + date range → crop classifications). */
export const CROP_CLASSIFICATION_API_ORIGIN =
  import.meta.env.VITE_CROP_CLASSIFICATION_API_ORIGIN ||
  "https://crop-classification-api-411399230985.asia-south1.run.app";

/** Satellite availability and index calculation API. */
export const CROP_MONITORING_API_BASE_URL =
  import.meta.env.VITE_CROP_MONITORING_API_BASE_URL || "https://server.cropgenapp.com/v4/api";
export const CROP_MONITORING_API_KEY = import.meta.env.VITE_CROP_MONITORING_API_KEY ?? "";

/** Google Maps Platform browser key (Places API New) for map place search. Set in `.env.local`. */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Largest area (km²) sent to the delineation model in one run. The Cloud Run deployment
 * (CPU, 300 s request limit) only finishes ~2 km²; a local GPU backend handles whole
 * villages (the backend itself rejects bboxes over 100 km²).
 */
export const DELINEATION_MAX_AREA_KM2 = Number(import.meta.env.VITE_DELINEATION_MAX_AREA_KM2 || 2);
