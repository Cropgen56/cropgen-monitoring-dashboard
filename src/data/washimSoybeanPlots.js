/**
 * Washim soybean fields — geometry from public/data/washim-soybean-plots.geojson (built from src/data/washim-soybean-source.kml when you run crop pipeline scripts).
 * Full FieldDataContext-compatible properties are applied at runtime via enrichWashimSoybeanFeatureCollection.
 */

import * as turf from "@turf/turf";
import { getCropImageUrl } from "./cropAssets";

const NDVI_15 = [
  { date: "Day 1", "2025": 0.38, "2024": 0.45 },
  { date: "Day 2", "2025": 0.42, "2024": 0.48 },
  { date: "Day 3", "2025": 0.46, "2024": 0.5 },
  { date: "Day 4", "2025": 0.5, "2024": 0.51 },
  { date: "Day 5", "2025": 0.54, "2024": 0.5 },
  { date: "Day 6", "2025": 0.57, "2024": 0.48 },
  { date: "Day 7", "2025": 0.6, "2024": 0.46 },
  { date: "Day 8", "2025": 0.62, "2024": 0.48 },
  { date: "Day 9", "2025": 0.63, "2024": 0.52 },
  { date: "Day 10", "2025": 0.64, "2024": 0.56 },
  { date: "Day 11", "2025": 0.65, "2024": 0.59 },
  { date: "Day 12", "2025": 0.67, "2024": 0.6 },
  { date: "Day 13", "2025": 0.7, "2024": 0.6 },
  { date: "Day 14", "2025": 0.73, "2024": 0.58 },
  { date: "Day 15", "2025": 0.76, "2024": 0.55 },
];

const WATER_15 = [
  { date: "Day 1", "2025": 0.22, "2024": 0.2 },
  { date: "Day 2", "2025": 0.24, "2024": 0.21 },
  { date: "Day 3", "2025": 0.26, "2024": 0.22 },
  { date: "Day 4", "2025": 0.28, "2024": 0.22 },
  { date: "Day 5", "2025": 0.3, "2024": 0.21 },
  { date: "Day 6", "2025": 0.32, "2024": 0.19 },
  { date: "Day 7", "2025": 0.33, "2024": 0.18 },
  { date: "Day 8", "2025": 0.34, "2024": 0.2 },
  { date: "Day 9", "2025": 0.34, "2024": 0.23 },
  { date: "Day 10", "2025": 0.33, "2024": 0.26 },
  { date: "Day 11", "2025": 0.34, "2024": 0.28 },
  { date: "Day 12", "2025": 0.36, "2024": 0.29 },
  { date: "Day 13", "2025": 0.38, "2024": 0.28 },
  { date: "Day 14", "2025": 0.4, "2024": 0.26 },
  { date: "Day 15", "2025": 0.42, "2024": 0.24 },
];

const TALUKAS = ["Washim", "Risod", "Mangrulpir", "Karanja", "Malegaon", "Manora"];
const VILLAGES = ["Washim", "Pus", "Mangrulpir", "Karanja", "Malegaon", "Manora"];

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
      surface: { temperature: "29", moisture: "0.3" },
      subsoil: { temperature: "27", moisture: "0.26" },
      parentMaterial: { temperature: "25", moisture: "0.22" },
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

/** Fast hectare estimate (bbox × shape factor); avoids 4k+ heavy polygon areas in the browser. */
function areaHaForFeature(feature) {
  try {
    const b = turf.bbox(feature);
    const midLat = (b[1] + b[3]) / 2;
    const h = (b[3] - b[1]) * 110574;
    const w = (b[2] - b[0]) * 111320 * Math.cos((midLat * Math.PI) / 180);
    return Math.max(0.05, ((w * h) / 10000) * 0.72);
  } catch {
    return 0.5;
  }
}

/**
 * Build full prototype properties for one soybean plot (Washim only).
 */
export function buildWashimSoybeanProps(index, areaHa) {
  const hi = healthFromIndex(index);
  const taluka = TALUKAS[index % TALUKAS.length];
  const village = VILLAGES[index % VILLAGES.length];
  const stdY = 10 + hash01(index + 1) * 6;
  const aiY = stdY * (0.92 + hash01(index + 2) * 0.18);
  const drought =
    hi.ndvi < 0.48 ? "high" : hi.ndvi < 0.58 ? "moderate" : "low";
  const farmerId = `FR-MH-31${String(1000 + (index % 9000)).padStart(4, "0")}`;
  const mobile = `+91 98765 ${String(40000 + (index % 60000)).padStart(5, "0")}`;

  return {
    _id: `MH-WH-SY-${String(index + 1).padStart(5, "0")}`,
    name: `Soybean · ${taluka} · plot ${index + 1}`,
    district: "Washim",
    taluka,
    village,
    clusterId: `WH-SY-${String(1 + (index % 8)).padStart(2, "0")}`,
    area_ha: areaHa.toFixed(2),
    cropType: "Soybean",
    cropImage: getCropImageUrl("Soybean"),
    cropHealth: hi.label,
    cropHealthPercent: hi.pct,
    sowingDate: "2025-07-12",
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
    preferredLanguage: "mr",
    mobile,
    aadhaarMasked: `XXXX XXXX ${String(1000 + (index % 9000)).padStart(4, "0")}`,
    gatNo: `${(index % 400) + 1} / ${(index % 3) + 1}`,
    surveyNo: `SN-WH-20${15 + (index % 10)}-${2000 + index}`,
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
      amountINR: index % 2 === 0 ? 40000 + (index % 50) * 1000 : 0,
    },
    insurance: {
      scheme: "PMFBY",
      season: "Kharif 2025",
      claimed: index % 17 === 0,
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
      85 + (index % 40),
      stdY,
      aiY,
      28 + (index % 18),
      14 + (index % 10),
      150 + (index % 80),
    ),
  };
}

function ndviSeriesFor(index) {
  const off = index * 0.012;
  return NDVI_15.map((d) => ({
    ...d,
    "2025": Math.min(0.92, Math.max(0.2, d["2025"] - off)),
  }));
}

function waterSeriesFor(index) {
  const off = index * 0.01;
  return WATER_15.map((d) => ({
    ...d,
    "2025": Math.min(0.55, Math.max(0.08, d["2025"] - off)),
  }));
}

export function enrichWashimSoybeanFeature(feature, index) {
  const areaHa = areaHaForFeature(feature);
  const base = buildWashimSoybeanProps(index, areaHa);
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

export function enrichWashimSoybeanFeatureCollection(fc) {
  if (!fc || !fc.features) return fc;
  return {
    ...fc,
    features: fc.features.map((f, i) => enrichWashimSoybeanFeature(f, i)),
  };
}

/** Dashed outline around all Washim soybean plots (for map). */
export function getWashimAreaOutlineFromFeatureCollection(fc) {
  if (!fc?.features?.length) return null;
  try {
    const bbox = turf.bbox(fc);
    const poly = turf.bboxPolygon(bbox);
    return {
      type: "Feature",
      properties: { name: "Washim soybean (KML) extent" },
      geometry: poly.geometry,
    };
  } catch {
    return null;
  }
}
