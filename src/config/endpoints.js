/**
 * White-label API hosts. Override in `.env` with `VITE_API_BASE_URL` and
 * `VITE_LOCATION_API_ORIGIN`. Defaults preserve existing demo integrations.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://server.cropgenapp.com/v1/api";

export const LOCATION_API_ORIGIN =
  import.meta.env.VITE_LOCATION_API_ORIGIN ?? "https://location.cropgenapp.com";
