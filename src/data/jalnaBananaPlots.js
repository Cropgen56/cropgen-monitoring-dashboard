/**
 * Jalna banana — geometry from public/data/jalna-banana-plots.geojson (from JALNA_BANANA.kml via npm run data:jalna).
 */

import * as turf from "@turf/turf";
import { BANANA_CROP_IMAGE_URL } from "./cropAssets";

const NDVI_15 = [
  { date: "Day 1", "2025": 0.52, "2024": 0.48 },
  { date: "Day 2", "2025": 0.54, "2024": 0.5 },
  { date: "Day 3", "2025": 0.57, "2024": 0.52 },
  { date: "Day 4", "2025": 0.6, "2024": 0.54 },
  { date: "Day 5", "2025": 0.63, "2024": 0.55 },
  { date: "Day 6", "2025": 0.65, "2024": 0.53 },
  { date: "Day 7", "2025": 0.68, "2024": 0.51 },
  { date: "Day 8", "2025": 0.7, "2024": 0.52 },
  { date: "Day 9", "2025": 0.72, "2024": 0.55 },
  { date: "Day 10", "2025": 0.73, "2024": 0.58 },
  { date: "Day 11", "2025": 0.74, "2024": 0.6 },
  { date: "Day 12", "2025": 0.76, "2024": 0.62 },
  { date: "Day 13", "2025": 0.78, "2024": 0.63 },
  { date: "Day 14", "2025": 0.8, "2024": 0.62 },
  { date: "Day 15", "2025": 0.82, "2024": 0.6 },
];

const WATER_15 = [
  { date: "Day 1", "2025": 0.28, "2024": 0.26 },
  { date: "Day 2", "2025": 0.3, "2024": 0.27 },
  { date: "Day 3", "2025": 0.32, "2024": 0.28 },
  { date: "Day 4", "2025": 0.34, "2024": 0.28 },
  { date: "Day 5", "2025": 0.35, "2024": 0.27 },
  { date: "Day 6", "2025": 0.36, "2024": 0.25 },
  { date: "Day 7", "2025": 0.37, "2024": 0.24 },
  { date: "Day 8", "2025": 0.38, "2024": 0.25 },
  { date: "Day 9", "2025": 0.38, "2024": 0.27 },
  { date: "Day 10", "2025": 0.37, "2024": 0.3 },
  { date: "Day 11", "2025": 0.38, "2024": 0.32 },
  { date: "Day 12", "2025": 0.39, "2024": 0.33 },
  { date: "Day 13", "2025": 0.4, "2024": 0.32 },
  { date: "Day 14", "2025": 0.42, "2024": 0.3 },
  { date: "Day 15", "2025": 0.44, "2024": 0.28 },
];

const TALUKAS = [
  "Jalna",
  "Ambad",
  "Badnapur",
  "Bhokardan",
  "Ghansawangi",
  "Jafrabad",
  "Mantha",
  "Partur",
];
const VILLAGES = ["Jalna", "Ambad", "Badnapur", "Partur", "Mantha", "Ghansawangi"];

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
      { symbol: "N", label: "Nitrogen", thisYear: n, lastYear: n + 4 },
      { symbol: "P", label: "Phosphorus", thisYear: p, lastYear: p + 3 },
      { symbol: "K", label: "Potassium", thisYear: k, lastYear: k + 20 },
    ],
    layers: {
      surface: { temperature: "28", moisture: "0.28" },
      subsoil: { temperature: "26", moisture: "0.25" },
      parentMaterial: { temperature: "24", moisture: "0.22" },
    },
  };
}

function healthFromIndex(i) {
  const h = hash01(i);
  if (h > 0.75)
    return { label: "Very Good", pct: 80 + Math.floor(h * 10), ndvi: 0.75 + h * 0.08 };
  if (h > 0.45)
    return { label: "Good", pct: 65 + Math.floor(h * 15), ndvi: 0.64 + h * 0.1 };
  if (h > 0.2)
    return { label: "Decent", pct: 50 + Math.floor(h * 14), ndvi: 0.52 + h * 0.08 };
  return { label: "Poor", pct: 35 + Math.floor(h * 14), ndvi: 0.4 + h * 0.1 };
}

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

export function buildJalnaBananaProps(index, areaHa) {
  const hi = healthFromIndex(index);
  const taluka = TALUKAS[index % TALUKAS.length];
  const village = VILLAGES[index % VILLAGES.length];
  const stdY = 180 + hash01(index + 1) * 90;
  const aiY = stdY * (0.94 + hash01(index + 2) * 0.12);
  const drought =
    hi.ndvi < 0.5 ? "high" : hi.ndvi < 0.62 ? "moderate" : "low";
  const farmerId = `FR-MH-30${String(1000 + (index % 9000)).padStart(4, "0")}`;
  const mobile = `+91 98765 ${String(30000 + (index % 60000)).padStart(5, "0")}`;

  return {
    _id: `MH-JN-BN-${String(index + 1).padStart(5, "0")}`,
    name: `Banana · ${taluka} · plot ${index + 1}`,
    district: "Jalna",
    taluka,
    village,
    clusterId: `JN-BN-${String(1 + (index % 8)).padStart(2, "0")}`,
    area_ha: areaHa.toFixed(2),
    cropType: "Banana",
    cropImage: BANANA_CROP_IMAGE_URL,
    cropHealth: hi.label,
    cropHealthPercent: hi.pct,
    sowingDate: "2026-02-08",
    standardYield: Number(stdY.toFixed(1)),
    aiYield: Number(aiY.toFixed(1)),
    avgNDVI: Number(hi.ndvi.toFixed(2)),
    evi: Number((hi.ndvi * 0.86).toFixed(2)),
    savi: Number((hi.ndvi * 0.91).toFixed(2)),
    vhi: Number((48 + hi.pct * 0.32).toFixed(1)),
    droughtClass: drought,
    surveyNdviHealth: Number(hi.ndvi.toFixed(2)),
    predictedYieldTonPerAcre: Number((stdY * 0.065).toFixed(2)),
    farmerId,
    farmerName: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index >> 2) % LAST_NAMES.length]}`,
    preferredLanguage: "mr",
    mobile,
    aadhaarMasked: `XXXX XXXX ${String(2000 + (index % 9000)).padStart(4, "0")}`,
    gatNo: `${(index % 500) + 1} / ${(index % 4) + 1}`,
    surveyNo: `SN-JN-20${18 + (index % 8)}-${3000 + index}`,
    irrigationType:
      index % 4 === 0
        ? "Drip (micro)"
        : index % 3 === 0
          ? "Flood + field channel"
          : "Borewell + drip",
    cropHistory: {
      2026: "Banana",
      2025: index % 3 === 0 ? "Soybean" : "Banana",
      2024: index % 4 === 0 ? "Cotton" : "Banana",
    },
    cropLoan: {
      availed: index % 2 === 0,
      amountINR: index % 2 === 0 ? 120000 + (index % 80) * 1000 : 0,
    },
    insurance: {
      scheme: "PMFBY",
      season: "Kharif 2026",
      claimed: index % 19 === 0,
    },
    schemesMahadbt:
      index % 5 === 0 ? [{ name: "Micro irrigation", subsidyINR: 42000 }] : [],
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
      90 + (index % 35),
      stdY,
      aiY,
      32 + (index % 16),
      16 + (index % 12),
      180 + (index % 90),
    ),
  };
}

function ndviSeriesFor(index) {
  const off = index * 0.01;
  return NDVI_15.map((d) => ({
    ...d,
    "2025": Math.min(0.9, Math.max(0.25, d["2025"] - off)),
  }));
}

function waterSeriesFor(index) {
  const off = index * 0.008;
  return WATER_15.map((d) => ({
    ...d,
    "2025": Math.min(0.5, Math.max(0.1, d["2025"] - off)),
  }));
}

export function enrichJalnaBananaFeature(feature, index) {
  const areaHa = areaHaForFeature(feature);
  const base = buildJalnaBananaProps(index, areaHa);
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

export function enrichJalnaBananaFeatureCollection(fc) {
  if (!fc || !fc.features) return fc;
  return {
    ...fc,
    features: fc.features.map((f, i) => enrichJalnaBananaFeature(f, i)),
  };
}

export function getJalnaAreaOutlineFromFeatureCollection(fc) {
  if (!fc?.features?.length) return null;
  try {
    const bbox = turf.bbox(fc);
    const poly = turf.bboxPolygon(bbox);
    return {
      type: "Feature",
      properties: { name: "Jalna banana (KML) extent" },
      geometry: poly.geometry,
    };
  } catch {
    return null;
  }
}
