/**
 * Demo soybean fields for any Maharashtra district: parcels clipped to the district polygon
 * from `maharashtra-districts-outline.geojson`. Used when no bundled KML/real plot GeoJSON exists.
 */

import * as turf from "@turf/turf";
import { SOYBEAN_CROP_IMAGE_URL } from "./cropAssets";
import { getTalukas } from "./maharashtraHierarchy";
import { normalizeDistrictKey } from "./monitoringDefinitions";

const NDVI_15 = [
  { date: "Day 1", "2025": 0.4, "2024": 0.46 },
  { date: "Day 2", "2025": 0.44, "2024": 0.49 },
  { date: "Day 3", "2025": 0.48, "2024": 0.51 },
  { date: "Day 4", "2025": 0.52, "2024": 0.52 },
  { date: "Day 5", "2025": 0.55, "2024": 0.51 },
  { date: "Day 6", "2025": 0.58, "2024": 0.49 },
  { date: "Day 7", "2025": 0.61, "2024": 0.47 },
  { date: "Day 8", "2025": 0.63, "2024": 0.49 },
  { date: "Day 9", "2025": 0.64, "2024": 0.53 },
  { date: "Day 10", "2025": 0.65, "2024": 0.57 },
  { date: "Day 11", "2025": 0.66, "2024": 0.6 },
  { date: "Day 12", "2025": 0.68, "2024": 0.61 },
  { date: "Day 13", "2025": 0.71, "2024": 0.61 },
  { date: "Day 14", "2025": 0.74, "2024": 0.59 },
  { date: "Day 15", "2025": 0.77, "2024": 0.56 },
];

const WATER_15 = [
  { date: "Day 1", "2025": 0.21, "2024": 0.19 },
  { date: "Day 2", "2025": 0.23, "2024": 0.2 },
  { date: "Day 3", "2025": 0.25, "2024": 0.21 },
  { date: "Day 4", "2025": 0.27, "2024": 0.21 },
  { date: "Day 5", "2025": 0.29, "2024": 0.2 },
  { date: "Day 6", "2025": 0.31, "2024": 0.18 },
  { date: "Day 7", "2025": 0.32, "2024": 0.17 },
  { date: "Day 8", "2025": 0.33, "2024": 0.19 },
  { date: "Day 9", "2025": 0.33, "2024": 0.22 },
  { date: "Day 10", "2025": 0.32, "2024": 0.25 },
  { date: "Day 11", "2025": 0.33, "2024": 0.27 },
  { date: "Day 12", "2025": 0.35, "2024": 0.28 },
  { date: "Day 13", "2025": 0.37, "2024": 0.27 },
  { date: "Day 14", "2025": 0.39, "2024": 0.25 },
  { date: "Day 15", "2025": 0.41, "2024": 0.23 },
];

const FIRST_NAMES = [
  "Vijay",
  "Sangita",
  "Dilip",
  "Meena",
  "Ramesh",
  "Sunil",
  "Asha",
  "Prakash",
  "Kavita",
  "Suresh",
];
const LAST_NAMES = [
  "Rathod",
  "Wankhede",
  "Jadhav",
  "Gawai",
  "Khillari",
  "More",
  "Shinde",
  "Patil",
  "Kulkarni",
  "Deshmukh",
];

function hash01(i) {
  let h = i * 1103515245 + 12345;
  h = (h % 2147483647) / 2147483647;
  return Math.abs(h);
}

/** Stable 3-letter code for IDs (e.g. ahmednagar → ahm). */
function districtCodeKey(districtName) {
  const k = normalizeDistrictKey(districtName);
  return k.slice(0, 3).padEnd(3, "x");
}

function clusterPrefix(districtName) {
  const k = normalizeDistrictKey(districtName);
  return k.slice(0, 2).toUpperCase();
}

function soil(healthPct, status, cropAge, stdY, aiY, n, p, k) {
  return {
    healthPercentage: healthPct,
    healthStatus: status,
    cropAge,
    standardYield: stdY,
    aiYield: aiY,
    nutrients: [
      { symbol: "N", label: "Nitrogen", thisYear: n, lastYear: n + 3 },
      { symbol: "P", label: "Phosphorus", thisYear: p, lastYear: p + 2 },
      { symbol: "K", label: "Potassium", thisYear: k, lastYear: k + 15 },
    ],
    layers: {
      surface: { temperature: "29", moisture: "0.29" },
      subsoil: { temperature: "27", moisture: "0.25" },
      parentMaterial: { temperature: "25", moisture: "0.21" },
    },
  };
}

function healthFromIndex(i) {
  const h = hash01(i);
  if (h > 0.75) return { label: "Very Good", pct: 78 + Math.floor(h * 12), ndvi: 0.72 + h * 0.1 };
  if (h > 0.45) return { label: "Good", pct: 62 + Math.floor(h * 16), ndvi: 0.6 + h * 0.1 };
  if (h > 0.2) return { label: "Decent", pct: 48 + Math.floor(h * 14), ndvi: 0.5 + h * 0.08 };
  return { label: "Poor", pct: 32 + Math.floor(h * 16), ndvi: 0.38 + h * 0.1 };
}

function areaHaForFeature(feature) {
  try {
    return turf.area(feature) / 10000;
  } catch {
    return 1.2;
  }
}

function ndviSeriesFor(index) {
  const off = index * 0.011;
  return NDVI_15.map((d) => ({
    ...d,
    "2025": Math.min(0.92, Math.max(0.2, d["2025"] - off)),
  }));
}

function waterSeriesFor(index) {
  const off = index * 0.009;
  return WATER_15.map((d) => ({
    ...d,
    "2025": Math.min(0.55, Math.max(0.08, d["2025"] - off)),
  }));
}

/**
 * @param {string[]} talukaPool from `getTalukas(district)`; falls back to district name
 */
export function buildDistrictSoybeanProps(index, areaHa, districtName, talukaPool) {
  const district = String(districtName || "").trim();
  const pool =
    Array.isArray(talukaPool) && talukaPool.length > 0 ? talukaPool : [district];
  const taluka = pool[index % pool.length] || district;
  const hi = healthFromIndex(index);
  const dc = districtCodeKey(district);
  const cp = clusterPrefix(district);
  const village = `${taluka} (Rural)`;
  const stdY = 9.5 + hash01(index + 1 + dc.charCodeAt(0)) * 5.5;
  const aiY = stdY * (0.9 + hash01(index + 2) * 0.2);
  const drought =
    hi.ndvi < 0.48 ? "high" : hi.ndvi < 0.58 ? "moderate" : "low";
  const districtNum = (dc.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 90) + 10;
  const farmerId = `FR-MH-${districtNum}${String(1000 + (index % 9000)).padStart(4, "0")}`;
  const mobile = `+91 9876${districtNum} ${String(30000 + (index % 60000)).padStart(5, "0")}`;

  return {
    _id: `MH-${dc}-SY-${String(index + 1).padStart(5, "0")}`,
    name: `Soybean · ${taluka} · plot ${index + 1}`,
    district,
    taluka,
    village,
    clusterId: `${cp}-SY-${String(1 + (index % 8)).padStart(2, "0")}`,
    area_ha: areaHa.toFixed(2),
    cropType: "Soybean",
    cropImage: SOYBEAN_CROP_IMAGE_URL,
    cropHealth: hi.label,
    cropHealthPercent: hi.pct,
    sowingDate: "2025-07-08",
    standardYield: Number(stdY.toFixed(1)),
    aiYield: Number(aiY.toFixed(1)),
    avgNDVI: Number(hi.ndvi.toFixed(2)),
    evi: Number((hi.ndvi * 0.85).toFixed(2)),
    savi: Number((hi.ndvi * 0.92).toFixed(2)),
    vhi: Number((45 + hi.pct * 0.35).toFixed(1)),
    droughtClass: drought,
    surveyNdviHealth: Number(hi.ndvi.toFixed(2)),
    predictedYieldTonPerAcre: Number((stdY * 0.04).toFixed(2)),
    farmerId,
    farmerName: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index >> 2) % LAST_NAMES.length]}`,
    mobile,
    aadhaarMasked: `XXXX XXXX ${String(2000 + (index % 9000)).padStart(4, "0")}`,
    gatNo: `${(index % 380) + 1} / ${(index % 3) + 1}`,
    surveyNo: `SN-${cp}-20${14 + (index % 10)}-${3000 + index}`,
    irrigationType:
      index % 5 === 0
        ? "Borewell + drip (limited)"
        : index % 4 === 0
          ? "Canal (minor)"
          : "Rainfed",
    cropHistory: {
      2026: "Soybean",
      2025: index % 3 === 0 ? "Cotton" : "Soybean",
      2024: index % 4 === 0 ? "Tur" : "Soybean",
    },
    cropLoan: {
      availed: index % 2 === 0,
      amountINR: index % 2 === 0 ? 35000 + (index % 50) * 1000 : 0,
    },
    insurance: {
      scheme: "PMFBY",
      season: "Kharif 2025",
      claimed: index % 19 === 0,
    },
    schemesMahadbt:
      index % 6 === 0
        ? [{ name: "National Food Security Mission (Pulses)", subsidyINR: 5000 }]
        : [],
    aiRiskTags:
      drought === "high"
        ? ["high_risk_zone"]
        : drought === "moderate"
          ? ["moderate_et_deficit"]
          : [],
    soilHealth: soil(
      hi.pct,
      hi.label === "Very Good"
        ? "Excellent"
        : hi.label === "Good"
          ? "Good"
          : hi.label === "Decent"
            ? "Normal"
            : "Needs Attention",
      82 + (index % 38),
      stdY,
      aiY,
      26 + (index % 20),
      13 + (index % 11),
      145 + (index % 85),
    ),
    _syntheticDemo: true,
  };
}

/**
 * Regular grid of parcels clipped to the district (Polygon / MultiPolygon).
 */
export function generateSoybeanPlotsInDistrict(districtFeature, count = 48) {
  if (!districtFeature?.geometry) return { type: "FeatureCollection", features: [] };

  const district = turf.feature(districtFeature.geometry, districtFeature.properties || {});
  let bbox;
  try {
    bbox = turf.bbox(district);
  } catch {
    return { type: "FeatureCollection", features: [] };
  }
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const spanLng = maxLng - minLng;
  const spanLat = maxLat - minLat;
  if (spanLng < 1e-6 || spanLat < 1e-6) return { type: "FeatureCollection", features: [] };

  const cols = 8;
  const rows = 7;
  const dLng = Math.max(0.0035, spanLng / cols - spanLng * 0.004);
  const dLat = Math.max(0.003, spanLat / rows - spanLat * 0.004);
  const features = [];

  for (let r = 0; r < rows && features.length < count; r++) {
    for (let c = 0; c < cols && features.length < count; c++) {
      const jitter = hash01(r * 17 + c * 31 + 7) * 0.35;
      const u = (c + 0.35 + jitter * 0.15) / cols;
      const v = (r + 0.35 + hash01(r * 19 + c * 23) * 0.15) / rows;
      const lng = minLng + u * (spanLng - dLng);
      const lat = minLat + v * (spanLat - dLat);

      const center = turf.point([lng + dLng / 2, lat + dLat / 2]);
      if (!turf.booleanPointInPolygon(center, district)) continue;

      const rect = turf.polygon([
        [
          [lng, lat],
          [lng + dLng, lat],
          [lng + dLng, lat + dLat],
          [lng, lat + dLat],
          [lng, lat],
        ],
      ]);
      const rectF = turf.feature(rect.geometry);
      let clipped;
      try {
        clipped = turf.intersect(turf.featureCollection([rectF, district]));
      } catch {
        continue;
      }
      if (!clipped?.geometry) continue;

      const sqm = turf.area(clipped);
      if (sqm < 6000 || sqm > 900000) continue;

      features.push(clipped);
    }
  }

  return { type: "FeatureCollection", features };
}

export function enrichDistrictSyntheticFeature(feature, index, districtName, talukaPool) {
  const areaHa = Math.max(0.08, areaHaForFeature(feature));
  const base = buildDistrictSoybeanProps(index, areaHa, districtName, talukaPool);
  return {
    ...feature,
    properties: {
      ...base,
      plotIndex: index,
      ndviSeries: ndviSeriesFor(index),
      waterSeries: waterSeriesFor(index),
    },
  };
}

export function enrichDistrictSyntheticFeatureCollection(fc, districtName, talukaPool) {
  if (!fc?.features) return fc;
  return {
    ...fc,
    features: fc.features.map((f, i) =>
      enrichDistrictSyntheticFeature(f, i, districtName, talukaPool),
    ),
  };
}

export function getSyntheticDistrictPlotsExtentOutline(fc, districtName) {
  if (!fc?.features?.length) return null;
  try {
    const box = turf.bbox(fc);
    const poly = turf.bboxPolygon(box);
    return {
      type: "Feature",
      properties: { name: `${districtName || "District"} · demo fields extent` },
      geometry: poly.geometry,
    };
  } catch {
    return null;
  }
}

/** Taluka labels for props — uses hierarchy when available. */
export function talukaPoolForDistrict(districtName) {
  const t = getTalukas(districtName);
  return t.length ? t : [String(districtName || "Taluka").trim() || "Rural"];
}
