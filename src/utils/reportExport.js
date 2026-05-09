/**
 * Client-side report export (demo — no server).
 */

function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function downloadCsv(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildDistrictGovernanceRows(rollup, district) {
  if (!rollup) return [];
  return [
    {
      metric: "district",
      value: district || "",
    },
    {
      metric: "plots_loaded",
      value: rollup.plotCount,
    },
    {
      metric: "avg_impact_score",
      value: rollup.avgImpactScore,
    },
    {
      metric: "villages_impacted",
      value: rollup.villagesImpacted,
    },
    {
      metric: "area_affected_ha",
      value: rollup.totalAreaAffectedHa,
    },
    {
      metric: "critical_parcels",
      value: rollup.criticalPlots,
    },
    {
      metric: "stress_pct",
      value: rollup.stressPct,
    },
  ];
}

export function buildFarmerExportRows(fc) {
  const feats =
    fc?.features?.filter(
      (f) => f?.properties?.layerType !== "district" && f?.geometry,
    ) || [];
  return feats.map((f) => {
    const p = f.properties || {};
    return {
      farmer_id: p.farmerId || p._id,
      name: p.farmerName,
      village: p.village,
      taluka: p.taluka,
      district: p.district,
      survey_no: p.surveyNo,
      crop: p.cropType,
      area_ha: p.area_ha,
      impact_score: p.governanceImpactScore,
      impact_band: p.governanceImpactLabel,
      disease_risk: p.governanceDiseaseRisk,
      yield_risk: p.governanceYieldRisk,
      rainfall_dev_pct: p.governanceRainfallDeviationPct,
      crop_match_pct: p.verificationCropMatchPct,
      land_match_pct: p.verificationLandMatchPct,
      verification_risk: p.verificationRiskLevel,
    };
  });
}
