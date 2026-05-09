/**
 * AI governance & impact intelligence — demo logic derived from plot properties.
 * Aligns with scope: impact bands, verification scores, district rollups, insight strings.
 */

export const IMPACT_BANDS = [
  { max: 20, label: "Stable" },
  { max: 40, label: "Mild" },
  { max: 60, label: "Moderate" },
  { max: 80, label: "High Risk" },
  { max: 100, label: "Critical" },
];

export function impactBandFromScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 20) return "Stable";
  if (s <= 40) return "Mild";
  if (s <= 60) return "Moderate";
  if (s <= 80) return "High Risk";
  return "Critical";
}

/** 0–100 heat ramp: low score = green, high = red */
/** Rainfall deviation magnitude → stress colours (|pct|). */
export function rainfallDeviationStyle(pct) {
  const a = Math.abs(Number(pct) || 0);
  if (a >= 28) return { fill: "#dc2626", stroke: "#7f1d1d" };
  if (a >= 18) return { fill: "#f97316", stroke: "#9a3412" };
  if (a >= 10) return { fill: "#eab308", stroke: "#854d0e" };
  return { fill: "#22c55e", stroke: "#14532d" };
}

export function governanceHeatColor(score) {
  const t = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
  const r = Math.round(34 + t * 185);
  const g = Math.round(197 - t * 160);
  const b = Math.round(94 - t * 60);
  const stroke = t > 0.55 ? "#7f1d1d" : "#14532d";
  return {
    fill: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
    stroke,
  };
}

function idHash(id) {
  const s = String(id || "0");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 10007;
  return h;
}

function ndviStress(ndvi) {
  const n = Math.min(1, Math.max(0, Number(ndvi) || 0.5));
  return Math.round((1 - n / 0.85) * 30);
}

function droughtPoints(cls) {
  if (cls === "high") return 25;
  if (cls === "moderate") return 12;
  return 0;
}

function healthPoints(health) {
  const h = String(health || "").toLowerCase();
  if (h === "poor") return 20;
  if (h === "decent") return 10;
  return 0;
}

function vhiPoints(vhi) {
  const v = Number(vhi) || 60;
  if (v < 35) return 15;
  if (v < 45) return 8;
  return 0;
}

/**
 * Derive governance fields from existing plot properties (no network).
 * @param {Record<string, unknown>} p
 */
export function computeGovernanceFields(p) {
  const ndvi = Number(p.surveyNdviHealth ?? p.avgNDVI ?? 0.5);
  let score =
    ndviStress(ndvi) +
    droughtPoints(p.droughtClass) +
    healthPoints(p.cropHealth) +
    vhiPoints(p.vhi);
  const chp = Number(p.cropHealthPercent);
  if (Number.isFinite(chp)) {
    score += Math.min(15, Math.max(0, (100 - chp) * 0.12));
  }
  score = Math.round(Math.min(100, Math.max(0, score)));

  const diseaseRisk = Math.round(
    Math.min(100, ndviStress(ndvi) * 1.15 + (p.droughtClass === "high" ? 32 : 8)),
  );
  const yieldRisk = Math.round(
    Math.min(100, (1 - Math.min(1, ndvi / 0.78)) * 52 + droughtPoints(p.droughtClass) * 1.4),
  );

  const h = idHash(p._id || p.name);
  const rainfallDeviationPct = Math.round((h % 47) - 18);

  const declared = String(p.cropType || "—").trim();
  const mismatch = h % 11 === 0 && declared !== "—";
  const altCrops = ["Cotton", "Chili", "Soybean", "Banana"];
  const aiDetected = mismatch
    ? altCrops[h % altCrops.length]
    : declared;

  const cropMatch = declared === "—" ? 100 : aiDetected === declared ? 100 : 68 + (h % 25);
  const landMatch = 86 + (h % 14);
  let verificationRiskLevel = "Low";
  if (cropMatch < 82 || landMatch < 88) verificationRiskLevel = "High";
  else if (cropMatch < 95 || landMatch < 93) verificationRiskLevel = "Medium";

  return {
    governanceImpactScore: score,
    governanceImpactLabel: impactBandFromScore(score),
    governanceDiseaseRisk: diseaseRisk,
    governanceYieldRisk: yieldRisk,
    governanceRainfallDeviationPct: rainfallDeviationPct,
    declaredCrop: declared,
    aiDetectedCrop: aiDetected,
    verificationLandMatchPct: landMatch,
    verificationCropMatchPct: cropMatch,
    verificationRiskLevel,
  };
}

/**
 * @param {import('geojson').FeatureCollection | null} fc
 */
export function enrichGovernanceFeatureCollection(fc) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return fc || { type: "FeatureCollection", features: [] };
  }
  return {
    ...fc,
    features: fc.features.map((f) => {
      if (!f || f.type !== "Feature") return f;
      if (f.properties?.layerType === "district") return f;
      const g = computeGovernanceFields(f.properties || {});
      return {
        ...f,
        properties: { ...(f.properties || {}), ...g },
      };
    }),
  };
}

/**
 * @param {import('geojson').FeatureCollection | null} fc
 */
export function aggregateDistrictGovernance(fc) {
  const feats =
    fc?.features?.filter((f) => f?.properties?.layerType !== "district") || [];
  if (!feats.length) return null;

  const impactedVillages = new Set();
  let areaAffectedHa = 0;
  let criticalCount = 0;
  let moderatePlus = 0;
  /** @type {Record<string, { ha: number; stressedHa: number }>} */
  const cropWise = {};
  let sumScore = 0;

  feats.forEach((f) => {
    const p = f.properties || {};
    const g = p.governanceImpactScore ?? computeGovernanceFields(p).governanceImpactScore;
    sumScore += g;
    if (g > 40) {
      if (p.village) impactedVillages.add(p.village);
      areaAffectedHa += Number(p.area_ha) || 0;
      moderatePlus++;
    }
    if (g > 80) criticalCount++;

    const c = p.cropType || "Other";
    if (!cropWise[c]) cropWise[c] = { ha: 0, stressedHa: 0 };
    const ha = Number(p.area_ha) || 0;
    cropWise[c].ha += ha;
    if (g > 50) cropWise[c].stressedHa += ha;
  });

  return {
    plotCount: feats.length,
    villagesImpacted: impactedVillages.size,
    totalAreaAffectedHa: Math.round(areaAffectedHa * 100) / 100,
    criticalPlots: criticalCount,
    moderatePlusPlots: moderatePlus,
    avgImpactScore: Math.round(sumScore / feats.length),
    cropWise,
    stressPct: Math.round((moderatePlus / feats.length) * 1000) / 10,
  };
}

/**
 * @param {{ district?: string; rollup: ReturnType<typeof aggregateDistrictGovernance> }} ctx
 * @returns {string[]}
 */
export function generateGovernanceInsights(ctx) {
  const { district = "Region", rollup } = ctx;
  if (!rollup) {
    return [
      "Select a district with farm polygons (e.g. Washim soybean or Jalna banana) to activate impact intelligence.",
    ];
  }
  const lines = [];
  if (rollup.avgImpactScore >= 50) {
    lines.push(
      `${district}: composite impact score ${rollup.avgImpactScore}/100 — elevated stress vs stable baseline.`,
    );
  }
  if (rollup.criticalPlots > 0) {
    lines.push(
      `${rollup.criticalPlots} parcel(s) in Critical band (81–100) — recommend emergency field verification and advisory push.`,
    );
  }
  if (rollup.villagesImpacted > 0) {
    lines.push(
      `${rollup.villagesImpacted} village(s) include farms above moderate impact threshold; prioritize taluka desk review.`,
    );
  }
  if (rollup.stressPct > 25) {
    lines.push(
      `Approximately ${rollup.stressPct}% of loaded plots show moderate+ stress — consider irrigation support and PMFBY awareness.`,
    );
  }
  if (district === "Washim") {
    lines.push(
      "Rainfall / NDVI divergence patterns match soybean sensitivity in this window — watch Karanja cluster for yield risk.",
    );
  }
  if (district === "Jalna") {
    lines.push(
      "Banana canopy stress clusters may indicate waterlogging or pest pressure — schedule scouting in flagged villages.",
    );
  }
  if (lines.length === 0) {
    lines.push(`${district}: loaded plots are largely stable in this demo snapshot.`);
  }
  return lines.slice(0, 8);
}

/**
 * @param {import('geojson').FeatureCollection | null} fc
 * @param {number} [minScore=60]
 */
export function listPriorityFarmers(fc, minScore = 60) {
  const feats =
    fc?.features?.filter((f) => f?.properties?.layerType !== "district") || [];
  return feats
    .map((f) => {
      const p = f.properties || {};
      const score = p.governanceImpactScore ?? computeGovernanceFields(p).governanceImpactScore;
      return {
        id: p._id,
        name: p.farmerName,
        village: p.village,
        crop: p.cropType,
        score,
        band: p.governanceImpactLabel ?? impactBandFromScore(score),
      };
    })
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
