/**
 * Farmer records entered by users (no backend yet).
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
    preferredLanguage: "",
    village: "",
    taluka: "",
    district: "",
    surveyNo: "",
    gatNo: "",
    area_ha: "",
    cropType: "",
    irrigationType: "",
    sowingDate: "",
    cropLoanAvailed: false,
    cropLoanAmountINR: "",
    insuranceClaimed: false,
    insuranceScheme: "",
    insuranceSeason: "",
    schemesNote: "",
    notes: "",
  };
}
