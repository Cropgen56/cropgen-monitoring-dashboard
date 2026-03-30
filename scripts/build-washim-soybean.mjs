/**
 * Converts src/data/washim_soyabean.kml → public/data/washim-soybean-plots.geojson
 * (geometries + plotIndex only; app enriches with full prototype props at runtime).
 *
 * The source KML mixes many polygons outside Washim district; we keep only features
 * whose centroid falls inside a Washim bounding box so the map fits and renders correctly.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { DOMParser } from "@xmldom/xmldom";
import * as turf from "@turf/turf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const toGeoJSON = require("@mapbox/togeojson");

/** minLng, minLat, maxLng, maxLat — Washim district core (excludes stray KML footprints). */
const WASHIM_BBOX = [76.4, 19.95, 77.9, 20.45];

function centroidInWashim(feature) {
  try {
    const [lng, lat] = turf.centroid(feature).geometry.coordinates;
    const [minLng, minLat, maxLng, maxLat] = WASHIM_BBOX;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  } catch {
    return false;
  }
}

const root = path.join(__dirname, "..");
const kmlPath = path.join(root, "src/data/washim_soyabean.kml");
const outPath = path.join(root, "public/data/washim-soybean-plots.geojson");

const kml = fs.readFileSync(kmlPath, "utf8");
const dom = new DOMParser().parseFromString(kml, "text/xml");
const raw = toGeoJSON.kml(dom);

if (!raw || raw.type !== "FeatureCollection") {
  console.error("Unexpected GeoJSON output", raw?.type);
  process.exit(1);
}

const polygons = raw.features.filter(
  (f) =>
    f.geometry &&
    (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"),
);

const inWashim = polygons.filter(centroidInWashim);

const minimal = {
  type: "FeatureCollection",
  features: inWashim.map((f, i) => ({
    type: "Feature",
    geometry: f.geometry,
    properties: {
      plotIndex: i,
      source: "washim_soyabean.kml",
    },
  })),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(minimal));
console.error(
  `Wrote ${minimal.features.length} polygons (dropped ${polygons.length - inWashim.length} outside Washim bbox) → ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`,
);
