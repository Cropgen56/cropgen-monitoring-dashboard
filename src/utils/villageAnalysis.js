/**
 * Village crop analysis built from per-farm satellite index statistics (mean NDVI / NDMI
 * from the multi calculate-index API). One place for the thresholds, so the page, the map
 * colours, the alert list and the exported report all use the same definitions.
 */
import * as turf from "@turf/turf";
import { cropIndexFeatureKey } from "./cropIndexImages";
import { toOutlineDistrict } from "../config/districtNames";

/** NDVI health bands (mean NDVI of the farm). Standard agronomic ranges for field crops. */
export const HEALTH_BANDS = [
  { id: "bare", label: "Bare / harvested", min: -Infinity, max: 0.2, color: "#a16207" },
  { id: "poor", label: "Poor", min: 0.2, max: 0.35, color: "#ef4444" },
  { id: "moderate", label: "Moderate", min: 0.35, max: 0.5, color: "#f59e0b" },
  { id: "good", label: "Good", min: 0.5, max: 0.65, color: "#84cc16" },
  { id: "very-good", label: "Very good", min: 0.65, max: Infinity, color: "#15803d" },
];

/** Relative NDVI change between the compare date and the analysis date. */
export const CHANGE_BANDS = [
  { id: "sharp-decline", label: "Sharp decline", min: -Infinity, max: -30, color: "#dc2626" },
  { id: "decline", label: "Decline", min: -30, max: -10, color: "#f97316" },
  { id: "stable", label: "Stable", min: -10, max: 10, color: "#94a3b8" },
  { id: "improved", label: "Improved", min: 10, max: Infinity, color: "#22c55e" },
];

export const ALERT_RULES = {
  sharpDeclinePct: -30, // NDVI fell by 30% or more…
  declinePct: -15, // …or by 15–30%…
  vegetatedBefore: 0.3, // …on a farm that had a crop (NDVI ≥ 0.3) on the compare date
  lowVigourMax: 0.3, // NDVI below this…
  lowVigourMin: 0.2, // …but above bare soil: a crop is there and it is weak…
  lowVigourBelowMedian: 0.1, // …and clearly below the village's typical farm (peer comparison),
  //                            so a whole village maturing for harvest is not flagged farm by farm
  dryNdmi: 0, // NDMI below this on a farm with a crop (NDVI ≥ 0.3): moisture stress
  veryDryNdmi: -0.1,
};

/** How Crop Monitoring colours farms on the map. */
export const COLOR_MODES = [
  { id: "image", label: "Index image" },
  { id: "health", label: "Health" },
  { id: "change", label: "Change" },
];

export const SEVERITY = { high: { label: "High", rank: 2, color: "#ef4444" }, medium: { label: "Medium", rank: 1, color: "#f59e0b" } };

export function healthBand(ndvi) {
  if (!Number.isFinite(ndvi)) return null;
  return HEALTH_BANDS.find((b) => ndvi >= b.min && ndvi < b.max) || null;
}

export function changeBand(pct) {
  if (!Number.isFinite(pct)) return null;
  return CHANGE_BANDS.find((b) => pct >= b.min && pct < b.max) || null;
}

/** Health score 0–100 from mean NDVI (0.1 → 0, 0.8 → 100). */
export function healthScore(ndvi) {
  if (!Number.isFinite(ndvi)) return null;
  return Math.round(Math.max(0, Math.min(100, ((ndvi - 0.1) / 0.7) * 100)));
}

/**
 * Index results come back as "feature-N" in request order (the request's features carry no id),
 * so map them by position; fall back to properties.field_id.
 */
export function statsByFeatureIndex(response, features) {
  const out = new Map();
  for (const r of response?.results || []) {
    const m = /^feature-(\d+)$/.exec(String(r.id ?? ""));
    let idx = m ? Number(m[1]) - 1 : -1;
    if (!(idx >= 0 && idx < features.length)) {
      idx = features.findIndex((f) => String(f.properties?.field_id) === String(r.properties?.field_id));
    }
    if (idx >= 0 && r.stats && Number.isFinite(Number(r.stats.mean))) out.set(idx, r.stats);
  }
  return out;
}

function farmAreaHa(feature) {
  const a = Number(feature.properties?.area_ha);
  if (Number.isFinite(a) && a > 0) return a;
  try {
    return turf.area(feature) / 1e4;
  } catch {
    return 0;
  }
}

function farmAlerts({ ndvi, ndviPrev, changePct, ndmi }, villageMedianNdvi) {
  const r = ALERT_RULES;
  const alerts = [];
  if (Number.isFinite(changePct) && Number.isFinite(ndviPrev) && ndviPrev >= r.vegetatedBefore) {
    if (changePct <= r.sharpDeclinePct) {
      alerts.push({ type: "Sharp NDVI decline", severity: "high", detail: `${changePct.toFixed(0)}% since compare date` });
    } else if (changePct <= r.declinePct) {
      alerts.push({ type: "NDVI decline", severity: "medium", detail: `${changePct.toFixed(0)}% since compare date` });
    }
  }
  if (
    Number.isFinite(ndvi) &&
    ndvi >= r.lowVigourMin &&
    ndvi < r.lowVigourMax &&
    Number.isFinite(villageMedianNdvi) &&
    ndvi <= villageMedianNdvi - r.lowVigourBelowMedian
  ) {
    alerts.push({
      type: "Low crop vigour",
      severity: "medium",
      detail: `NDVI ${ndvi.toFixed(2)} vs village ${villageMedianNdvi.toFixed(2)}`,
    });
  }
  if (Number.isFinite(ndmi) && Number.isFinite(ndvi) && ndvi >= r.vegetatedBefore && ndmi < r.dryNdmi) {
    alerts.push({
      type: "Moisture stress",
      severity: ndmi < r.veryDryNdmi ? "high" : "medium",
      detail: `NDMI ${ndmi.toFixed(2)}`,
    });
  }
  return alerts;
}

/**
 * @param {object[]} features farm polygons (request order)
 * @param {{ ndvi?: object, ndviPrev?: object, ndmi?: object }} responses multi calculate-index responses
 */
export function analyseVillage(features, { ndvi, ndviPrev, ndmi }) {
  const cur = statsByFeatureIndex(ndvi, features);
  const prev = statsByFeatureIndex(ndviPrev, features);
  const moist = statsByFeatureIndex(ndmi, features);
  const curValues = [...cur.values()].map((v) => v.mean).sort((a, b) => a - b);
  const villageMedianNdvi = curValues.length ? curValues[Math.floor((curValues.length - 1) / 2)] : null;

  const farms = features.map((feature, idx) => {
    const p = feature.properties || {};
    const ndviMean = cur.get(idx)?.mean;
    const ndviPrevMean = prev.get(idx)?.mean;
    const ndmiMean = moist.get(idx)?.mean;
    const changePct =
      Number.isFinite(ndviMean) && Number.isFinite(ndviPrevMean) && ndviPrevMean > 0.05
        ? ((ndviMean - ndviPrevMean) / ndviPrevMean) * 100
        : null;
    const metrics = { ndvi: ndviMean, ndviPrev: ndviPrevMean, changePct, ndmi: ndmiMean };
    const alerts = farmAlerts(metrics, villageMedianNdvi);
    const severityRank = Math.max(0, ...alerts.map((a) => SEVERITY[a.severity].rank));
    return {
      key: cropIndexFeatureKey(feature),
      feature,
      fieldId: p.field_id,
      village: p.village,
      taluka: p.taluka,
      district: toOutlineDistrict(p.district),
      areaHa: farmAreaHa(feature),
      ...metrics,
      health: healthBand(ndviMean),
      score: healthScore(ndviMean),
      change: changeBand(changePct),
      alerts,
      severity: severityRank === 2 ? "high" : severityRank === 1 ? "medium" : null,
    };
  });

  const measured = farms.filter((f) => Number.isFinite(f.ndvi));
  const totalArea = measured.reduce((s, f) => s + f.areaHa, 0);
  const weightedNdvi = totalArea ? measured.reduce((s, f) => s + f.ndvi * f.areaHa, 0) / totalArea : null;

  const distribution = HEALTH_BANDS.map((band) => {
    const inBand = measured.filter((f) => f.health?.id === band.id);
    const areaHa = inBand.reduce((s, f) => s + f.areaHa, 0);
    return { ...band, farms: inBand.length, areaHa, pct: totalArea ? (areaHa / totalArea) * 100 : 0 };
  });

  const compared = farms.filter((f) => Number.isFinite(f.changePct));
  const changeDistribution = CHANGE_BANDS.map((band) => {
    const inBand = compared.filter((f) => f.change?.id === band.id);
    return { ...band, farms: inBand.length, areaHa: inBand.reduce((s, f) => s + f.areaHa, 0) };
  });

  const alerted = farms
    .filter((f) => f.alerts.length)
    .sort((a, b) => SEVERITY[b.severity].rank - SEVERITY[a.severity].rank || (a.ndvi ?? 1) - (b.ndvi ?? 1));

  return {
    farms,
    byKey: new Map(farms.map((f) => [f.key, f])),
    // Field ids restart in every village, so labels name the village when farms span several.
    multiVillage: new Set(farms.map((f) => f.village || "")).size > 1,
    summary: {
      totalFarms: features.length,
      measuredFarms: measured.length,
      areaHa: totalArea,
      meanNdvi: weightedNdvi,
      medianNdvi: villageMedianNdvi,
      score: healthScore(weightedNdvi),
      health: healthBand(weightedNdvi),
      comparedFarms: compared.length,
      meanChangePct: compared.length ? compared.reduce((s, f) => s + f.changePct, 0) / compared.length : null,
      highAlerts: alerted.filter((f) => f.severity === "high").length,
      mediumAlerts: alerted.filter((f) => f.severity === "medium").length,
      areaAtRiskHa: alerted.reduce((s, f) => s + f.areaHa, 0),
    },
    distribution,
    changeDistribution,
    alerted,
  };
}

/** Pick the compare date: newest clear, full-coverage date at least `minGapDays` before `date`. */
/** "Field #12", or "Field #12 · Adad" when the analysis covers several villages (whole taluka). */
export function farmLabel(farm, analysis) {
  const id = `Field #${farm?.fieldId ?? "—"}`;
  return analysis?.multiVillage && farm?.village ? `${id} · ${farm.village}` : id;
}

export function pickCompareDate(items, totalFeatures, date, { minGapDays = 10, maxCloud = 20 } = {}) {
  if (!date || !Array.isArray(items)) return "";
  const cutoff = new Date(`${date}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - minGapDays);
  const older = items.filter((i) => new Date(`${i.date}T00:00:00`) <= cutoff);
  const full = older.filter((i) => i.feature_count >= totalFeatures);
  const clear = full.filter((i) => Number(i.cloud_cover) <= maxCloud);
  return (clear[0] || full[0] || older[0])?.date || "";
}
