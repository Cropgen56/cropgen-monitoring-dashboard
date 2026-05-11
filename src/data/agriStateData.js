/**
 * State-level structured data for hackathon demo (Maharashtra).
 * Integrates admin KPIs, alerts, AI insights, cluster analytics, and innovation hooks.
 */

export const PLATFORM_TAGLINE =
  "CropGen — farmer-level data, satellite intelligence, and AI-assisted programme decisions in one workspace.";

export const stateSummary = {
  state: "Maharashtra",
  totalFarmersRegistered: 142_806,
  totalAreaAcres: 2_847_920,
  /** Default headline crop; UI should prefer the selected crop filter when shown. */
  activeCropsHighlight: "Banana",
  insurancePmfbCoveragePct: 67.4,
  schemeUtilizationMahadbtPct: 58.2,
  cropLoanDisbursedCrINR: 184.6,
  riskAlertsOpen: 12,
  seasons: ["Kharif", "Rabi", "Summer"],
  years: [2024, 2025, 2026],
};

export const cropFilters = [
  "Banana",
  "Rice",
  "Soybean",
  "Chili",
  "Sugarcane",
  "Cotton",
  "Wheat",
];

const districtInsightByKey = {
  Washim: {
    highRiskZonesHa: 185,
    lowProductivityClusters: 4,
    overFertilizationZones: 3,
    waterStressZonesHa: 142,
    aiRecommendation:
      "AI: Monitor rainfed soybean in WH-SY-03 / Risod–Mangrulpir corridor — NDVI plateau + soil tests suggest reviewing N timing before flowering.",
  },
  Jalgaon: {
    highRiskZonesHa: 420,
    lowProductivityClusters: 3,
    overFertilizationZones: 2,
    waterStressZonesHa: 310,
    aiRecommendation:
      "AI Recommendation: Reduce nitrogen usage by 18% in cluster JL-GN-02 (Ganeshpur buffer) based on soil tests and NDVI plateau.",
  },
  default: {
    highRiskZonesHa: 280,
    lowProductivityClusters: 4,
    overFertilizationZones: 2,
    waterStressZonesHa: 210,
    aiRecommendation:
      "AI: Use district + crop filters to load localized risk scores and cluster recommendations.",
  },
};

/** @param {string} [district] */
export function getDistrictInsights(district) {
  const key = district && districtInsightByKey[district] ? district : "default";
  return {
    district: district || "Maharashtra",
    ...districtInsightByKey[key],
  };
}

/** @deprecated Use getDistrictInsights — kept for older imports */
export const districtInsights = {
  district: "Jalgaon",
  ...districtInsightByKey.Jalgaon,
};

const clusterAnalyticsByDistrict = {
  Washim: [
    {
      clusterId: "WH-SY-01",
      name: "Washim block — rainfed soybean",
      fertDistributedKg: 4200,
      yieldPerAcreTon: 1.05,
      benchmarkYieldTon: 0.98,
      schemeImpactScore: 0.71,
    },
    {
      clusterId: "WH-SY-04",
      name: "Risod — mixed irrigation",
      fertDistributedKg: 5100,
      yieldPerAcreTon: 1.12,
      benchmarkYieldTon: 1.0,
      schemeImpactScore: 0.68,
    },
    {
      clusterId: "WH-SY-07",
      name: "Mangrulpir — stress watch",
      fertDistributedKg: 3800,
      yieldPerAcreTon: 0.94,
      benchmarkYieldTon: 1.02,
      schemeImpactScore: 0.59,
    },
  ],
  Jalgaon: [
    {
      clusterId: "JL-GN-02",
      name: "Ganeshpur — Banana corridor",
      fertDistributedKg: 12400,
      yieldPerAcreTon: 14.2,
      benchmarkYieldTon: 12.8,
      schemeImpactScore: 0.78,
    },
    {
      clusterId: "JL-BM-01",
      name: "Bambhori — mixed irrigated",
      fertDistributedKg: 9800,
      yieldPerAcreTon: 11.4,
      benchmarkYieldTon: 12.1,
      schemeImpactScore: 0.62,
    },
    {
      clusterId: "YL-KG-01",
      name: "Kingaon — stress-prone",
      fertDistributedKg: 7600,
      yieldPerAcreTon: 9.1,
      benchmarkYieldTon: 11.5,
      schemeImpactScore: 0.55,
    },
  ],
  default: [
    {
      clusterId: "MH-AVG",
      name: "State roll-up",
      fertDistributedKg: 8200,
      yieldPerAcreTon: 10.2,
      benchmarkYieldTon: 11.0,
      schemeImpactScore: 0.64,
    },
  ],
};

/** @param {string} [district] */
export function getClusterAnalytics(district) {
  const key = district && clusterAnalyticsByDistrict[district]
    ? district
    : "default";
  return clusterAnalyticsByDistrict[key];
}

export const clusterAnalytics = clusterAnalyticsByDistrict.Jalgaon;

const alertsFeedByDistrict = {
  Washim: [
    {
      id: "ALT-WH-01",
      severity: "medium",
      type: "Rainfed stress",
      detail:
        "Soil moisture index 12% below normal for WH-SY-04 (next 14 days) — advisory for supplemental irrigation where feasible.",
      source: "Satellite + agro-meteo",
    },
    {
      id: "ALT-WH-02",
      severity: "high",
      type: "NDVI shock",
      detail:
        "Cluster WH-SY-07: 18% of soybean plots show >0.08 NDVI drop vs prior dekad — field verification queued.",
      source: "Sentinel-2 change detection",
    },
    {
      id: "ALT-WH-03",
      severity: "medium",
      type: "PMFBY",
      detail:
        "Enrollment completeness 94% in Washim Kharif soybean — 6% gaps flagged for Gram Sevak follow-up.",
      source: "PMFBY rules engine",
    },
  ],
  Jalgaon: [
    {
      id: "ALT-001",
      severity: "high",
      type: "Drought risk",
      detail: "ET deficit > 22% vs 10-yr normal in JL-GN-02 (next 21 days).",
      source: "Satellite + agro-meteo",
    },
    {
      id: "ALT-002",
      severity: "medium",
      type: "Pest probability",
      detail: "Thrips pressure model: 41% probability spike in Bambhori banana plots.",
      source: "AI pest ensemble",
    },
    {
      id: "ALT-003",
      severity: "high",
      type: "Insurance anomaly",
      detail: "Claim frequency 2.3× district baseline for plot MH-JL-GV-004 — flagged for desk audit.",
      source: "PMFBY rules engine",
    },
  ],
  default: [
    {
      id: "ALT-G-01",
      severity: "medium",
      type: "Statewide",
      detail: "Select a district to load localized alerts and cluster context.",
      source: "Platform",
    },
  ],
};

/** @param {string} [district] */
export function getAlertsFeed(district) {
  const key = district && alertsFeedByDistrict[district] ? district : "default";
  return alertsFeedByDistrict[key];
}

export const alertsFeed = alertsFeedByDistrict.Jalgaon;

export const surveyMeta = {
  classificationAccuracyPct: 92,
  yieldModelVersion: "YLD-MH-v3.2",
  lastIngestion: "2026-03-28T06:30:00+05:30",
};

export const innovationHighlights = [
  {
    key: "change",
    title: "Real-time Crop Change Detection",
    detail: "Sentinel-2 + on-farm boundaries: 12-day change alerts for area drift and crop swap.",
  },
  {
    key: "earlyYield",
    title: "Early Yield Loss Prediction",
    detail: "Fusion of NDVI trend, thermal stress, and soil moisture forecasts loss 4–6 weeks early.",
  },
  {
    key: "insurance",
    title: "Auto Insurance Trigger System",
    detail: "When drought index + NDVI shock breach dual thresholds, draft PMFBY notification to insurer workflow.",
  },
];

export const governmentUseCases = [
  { id: "g1", label: "Crop area estimation", active: true },
  { id: "g2", label: "Subsidy planning", active: false },
  { id: "g3", label: "Disaster assessment", active: false },
];

export const validationPoints = [
  {
    id: "VP-01",
    lat: 20.9988,
    lng: 75.5622,
    syncedFrom: "Krishi-Mitra mobile",
    photoCount: 3,
  },
  {
    id: "VP-02",
    lat: 21.0001,
    lng: 75.5635,
    syncedFrom: "Krishi-Mitra mobile",
    photoCount: 2,
  },
];
