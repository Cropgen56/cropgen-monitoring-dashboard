/**
 * Converts src/data/Jalna_banana.kml → public/data/jalna-banana-plots.geojson
 *
 * Polygons use UTM zone 43N (EPSG:32643) in meters. Reproject to WGS84.
 * Optional bbox filter keeps features inside Jalna district (generous margin).
 *
 * Usage: npm run data:jalna
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DOMParser } from "@xmldom/xmldom";
import * as turf from "@turf/turf";
import proj4 from "proj4";

proj4.defs("EPSG:32643", "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs");

function utmToLngLat(e, n) {
  return proj4("EPSG:32643", "EPSG:4326", [e, n]);
}

/** minLng, minLat, maxLng, maxLat — Jalna + margin (drops only obvious outliers) */
const JALNA_BBOX = [74.85, 19.25, 77.05, 20.55];

function centroidInJalna(feature) {
  try {
    const [lng, lat] = turf.centroid(feature).geometry.coordinates;
    const [minLng, minLat, maxLng, maxLat] = JALNA_BBOX;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  } catch {
    return false;
  }
}

function parseRingCoordinates(text) {
  const nums = text
    .trim()
    .split(/[\s,\n\r\t]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));

  const coords = [];
  const likelyUtm = nums.length > 0 && nums.some((n) => Math.abs(n) > 360);

  if (likelyUtm) {
    for (let t = 0; t + 1 < nums.length; t += 2) {
      const ll = utmToLngLat(nums[t], nums[t + 1]);
      coords.push([ll[0], ll[1]]);
    }
  } else {
    for (let t = 0; t + 2 < nums.length; t += 3) {
      coords.push([nums[t], nums[t + 1]]);
    }
  }

  if (coords.length < 4) return null;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push([first[0], first[1]]);
  return coords;
}

function pushPolygonsFromElement(polyParent, rawFeatures, tagName) {
  const polygons = polyParent.getElementsByTagName(tagName);
  for (let j = 0; j < polygons.length; j++) {
    const poly = polygons[j];
    const outer = poly.getElementsByTagName("outerBoundaryIs")[0];
    if (!outer) continue;
    const rings = outer.getElementsByTagName("LinearRing");
    for (let k = 0; k < rings.length; k++) {
      const coordEl = rings[k].getElementsByTagName("coordinates")[0];
      if (!coordEl?.textContent) continue;
      const ring = parseRingCoordinates(coordEl.textContent);
      if (!ring) continue;
      rawFeatures.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          plotIndex: rawFeatures.length,
          source: "Jalna_banana.kml",
        },
      });
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const kmlPath = path.join(root, "src/data/Jalna_banana.kml");
const outPath = path.join(root, "public/data/jalna-banana-plots.geojson");

if (!fs.existsSync(kmlPath)) {
  console.error("Missing KML:", kmlPath);
  process.exit(1);
}

const kml = fs.readFileSync(kmlPath, "utf8");
const dom = new DOMParser().parseFromString(kml, "text/xml");
const placemarks = dom.getElementsByTagName("Placemark");

const rawFeatures = [];
for (let i = 0; i < placemarks.length; i++) {
  const pm = placemarks[i];
  pushPolygonsFromElement(pm, rawFeatures, "Polygon");
  const multis = pm.getElementsByTagName("MultiGeometry");
  for (let m = 0; m < multis.length; m++) {
    pushPolygonsFromElement(multis[m], rawFeatures, "Polygon");
  }
}

const inJalna = rawFeatures.filter(centroidInJalna);

const minimal = {
  type: "FeatureCollection",
  features: inJalna.map((f, i) => ({
    ...f,
    properties: {
      ...f.properties,
      plotIndex: i,
    },
  })),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(minimal));
const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
console.error(
  `Jalna banana: ${minimal.features.length} polygons (raw ${rawFeatures.length}, dropped outside bbox ${rawFeatures.length - inJalna.length}) → ${outPath} (${mb} MB)`,
);
