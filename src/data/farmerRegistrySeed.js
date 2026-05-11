/**
 * 1,000 deterministic demo farmers aligned to `maharashtraMajorCropsProfile.json`
 * (crop ↔ district major belts). Every farmer gets a unique full name.
 */

import cropProfile from "./maharashtraMajorCropsProfile.json";
import { MAHARASHTRA_DISTRICTS } from "./maharashtraHierarchy";
import { buildFullDemoPlotProps, talukaPoolForDistrict } from "./maharashtraDistrictSyntheticPlots";
import { computeGovernanceFields } from "./governanceEngine";

export const FARMER_REGISTRY_SEED_COUNT = 1000;

/** Legacy / alternate spellings → keys in `maharashtraTalukas.json` */
const DISTRICT_ALIASES = {
  Osmanabad: "Dharashiv",
};

const DISTRICT_SET = new Set(MAHARASHTRA_DISTRICTS);

/** 40 × 25 = 1000 unique pairs for indices 0..999 */
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
  "Anita",
  "Ganesh",
  "Pooja",
  "Rajendra",
  "Sunita",
  "Amit",
  "Vandana",
  "Kishor",
  "Deepak",
  "Swati",
  "Nitin",
  "Rekha",
  "Manoj",
  "Usha",
  "Sachin",
  "Priya",
  "Harish",
  "Kalpana",
  "Om",
  "Neha",
  "Chetan",
  "Radha",
  "Bhagwan",
  "Lata",
  "Subhash",
  "Indira",
  "Mahesh",
  "Kiran",
  "Nikhil",
  "Vaishali",
];

const LAST_NAMES = [
  "Patil",
  "Kulkarni",
  "Deshmukh",
  "Jadhav",
  "Shinde",
  "More",
  "Gawai",
  "Rathod",
  "Wankhede",
  "Chaudhari",
  "Ahire",
  "Pawar",
  "Gaikwad",
  "Bhosale",
  "Kamble",
  "Suryawanshi",
  "Ingle",
  "Bansode",
  "Dhakne",
  "Salunkhe",
  "Chavan",
  "Raut",
  "Khaire",
  "Dhole",
  "Sable",
];

const FIRST_LEN = FIRST_NAMES.length;
const LAST_LEN = LAST_NAMES.length;

function hash01(i) {
  let h = i * 1103515245 + 12345;
  h = (h % 2147483647) / 2147483647;
  return Math.abs(h);
}

function canonicalDistrict(raw) {
  const s = String(raw || "").trim();
  return DISTRICT_ALIASES[s] || s;
}

function expandCropDistrictSlots() {
  /** @type {{ cropType: string; district: string; season: string; majorRegion: string }[]} */
  const slots = [];
  const majors = cropProfile?.major_crops;
  if (!Array.isArray(majors)) return slots;

  for (const mc of majors) {
    const cropType = String(mc.crop_name || "").trim();
    if (!cropType) continue;
    const season = String(mc.season || "").trim();
    const majorRegion = Array.isArray(mc.major_regions) ? mc.major_regions.join(" · ") : "";
    const districts = Array.isArray(mc.major_districts) ? mc.major_districts : [];
    for (const d of districts) {
      const district = canonicalDistrict(d);
      if (!DISTRICT_SET.has(district)) continue;
      slots.push({ cropType, district, season, majorRegion });
    }
  }
  return slots;
}

const CROP_DISTRICT_SLOTS = expandCropDistrictSlots();

function uniqueFarmerName(index) {
  const i = index % (FIRST_LEN * LAST_LEN);
  return `${FIRST_NAMES[i % FIRST_LEN]} ${LAST_NAMES[Math.floor(i / FIRST_LEN) % LAST_LEN]}`;
}

/** @type {Record<string, object>[] | null} */
let cachedRows = null;

export function getFarmerRegistrySeedRows() {
  if (cachedRows) return cachedRows;
  const slots = CROP_DISTRICT_SLOTS;
  if (!slots.length) {
    cachedRows = [];
    return cachedRows;
  }

  const rows = [];
  for (let i = 0; i < FARMER_REGISTRY_SEED_COUNT; i++) {
    const slot = slots[i % slots.length];
    const { cropType, district, season, majorRegion } = slot;
    const pool = talukaPoolForDistrict(district);
    const areaHa = 0.28 + hash01(i * 17 + 3) * 5.4;
    const base = buildFullDemoPlotProps(i, areaHa, district, pool, cropType);
    const gov = computeGovernanceFields({ ...base, cropType });
    const farmerName = uniqueFarmerName(i);
    const priorCrop =
      cropType === "Banana"
        ? "Soybean"
        : cropType === "Sugarcane" || cropType === "Grapes"
          ? "Soybean"
          : cropType === "Wheat" || cropType === "Gram (Chana)"
            ? "Soybean"
            : "Cotton";

    rows.push({
      ...base,
      ...gov,
      farmerName,
      name: `${cropType} · ${base.taluka || pool[0] || district} · plot ${i + 1}`,
      cropType,
      cropHistory: {
        2026: cropType,
        2025: i % 3 === 0 ? priorCrop : cropType,
        2024: i % 5 === 0 ? "Tur" : cropType,
      },
      profileMajorRegions: majorRegion,
      profileCropSeason: season,
      profileState: cropProfile.state,
      _registrySeedId: `seed-${String(i + 1).padStart(4, "0")}`,
      _registrySeedBatch: "mh-major-crops-v2",
    });
  }

  cachedRows = rows;
  return cachedRows;
}

export function filterSeedRowsByDistrict(rows, districtName) {
  if (!districtName || !String(districtName).trim()) return rows;
  const want = String(districtName).trim();
  return rows.filter((r) => String(r.district || "").trim() === want);
}
