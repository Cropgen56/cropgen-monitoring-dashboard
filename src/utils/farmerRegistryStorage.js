/**
 * Client-side manual farmer records (demo — no backend).
 * Persists to localStorage for the Farmer Registry page.
 */

const LS_KEY = "cropgen_farmer_registry_manual_v1";

export function loadManualFarmers() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveManualFarmers(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export function addManualFarmer(record) {
  const rows = loadManualFarmers();
  const entry = {
    ...record,
    _registrySource: "manual",
    _registryId: record._registryId || `manual-${Date.now()}`,
    _savedAt: new Date().toISOString(),
  };
  rows.unshift(entry);
  saveManualFarmers(rows);
  return rows;
}

export function deleteManualFarmer(registryId) {
  const rows = loadManualFarmers().filter((r) => r._registryId !== registryId);
  saveManualFarmers(rows);
  return rows;
}

export function emptyFarmerFormDefaults() {
  return {
    farmerName: "",
    farmerId: "",
    mobile: "",
    aadhaarMasked: "",
    preferredLanguage: "mr",
    village: "",
    taluka: "",
    district: "",
    surveyNo: "",
    gatNo: "",
    area_ha: "",
    cropType: "Soybean",
    irrigationType: "Rainfed",
    sowingDate: "",
    clusterId: "",
    name: "",
    cropHealth: "Decent",
    cropHealthPercent: "62",
    governanceImpactScore: "",
    governanceImpactLabel: "",
    governanceDiseaseRisk: "",
    predictedYieldTonPerAcre: "",
    surveyNdviHealth: "",
    cropLoanAvailed: false,
    cropLoanAmountINR: "",
    insuranceClaimed: false,
    insuranceScheme: "PMFBY",
    insuranceSeason: "Kharif 2026",
    schemesNote: "",
    notes: "",
  };
}
