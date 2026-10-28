import * as turf from "@turf/turf";

/** Uploaded farms share one pseudo detection id so field keys never collide with detection runs. */
export const UPLOAD_DETECTION_ID = "upload";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Drops altitude (KML exports carry [lng, lat, 0]) and rejects projected (non-degree) coordinates. */
function toLngLat(value) {
  if (!Array.isArray(value)) return value;
  if (typeof value[0] === "number") {
    const [lng, lat] = value;
    if (!(Math.abs(lng) <= 180 && Math.abs(lat) <= 90)) {
      throw new Error("Coordinates must be longitude/latitude (EPSG:4326). Re-export the file in WGS 84.");
    }
    return [lng, lat];
  }
  return value.map(toLngLat);
}

function toFeatures(geojson) {
  if (geojson?.type === "FeatureCollection" && Array.isArray(geojson.features)) return geojson.features;
  if (geojson?.type === "Feature") return [geojson];
  if (geojson?.type === "GeometryCollection") {
    return (geojson.geometries || []).map((geometry) => ({ type: "Feature", properties: {}, geometry }));
  }
  if (geojson?.type && geojson.coordinates) return [{ type: "Feature", properties: {}, geometry: geojson }];
  throw new Error("Not a GeoJSON FeatureCollection, Feature or geometry.");
}

/**
 * Turns an uploaded GeoJSON into farm polygons shaped like detection output
 * (field_id, area_ha, perimeter_m, detectionId) so the index API, map and
 * village analysis treat them the same. Non-polygon features are skipped.
 */
export function normalizeUploadedFields(geojson) {
  const features = [];
  let skipped = 0;
  for (const feature of toFeatures(geojson)) {
    const type = feature?.geometry?.type;
    if (type !== "Polygon" && type !== "MultiPolygon") {
      skipped += 1;
      continue;
    }
    const geometry = { type, coordinates: toLngLat(feature.geometry.coordinates) };
    const shape = { type: "Feature", properties: {}, geometry };
    const fieldId = features.length + 1;
    features.push({
      type: "Feature",
      id: fieldId,
      geometry,
      properties: {
        ...feature.properties,
        source_id: feature.id ?? feature.properties?.id ?? null,
        field_id: fieldId,
        detectionId: UPLOAD_DETECTION_ID,
        source: "upload",
        area_ha: turf.area(shape) / 10000,
        perimeter_m: turf.length(turf.polygonToLine(shape), { units: "meters" }),
      },
    });
  }
  if (!features.length) throw new Error("The file has no Polygon or MultiPolygon farm boundaries.");
  return { fields: { type: "FeatureCollection", features }, skipped };
}

export async function readUploadedFields(file) {
  if (!/\.(geo)?json$/i.test(file.name)) throw new Error("Upload a .geojson or .json file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is larger than 25 MB.");
  let geojson;
  try {
    geojson = JSON.parse(await file.text());
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  return normalizeUploadedFields(geojson);
}
