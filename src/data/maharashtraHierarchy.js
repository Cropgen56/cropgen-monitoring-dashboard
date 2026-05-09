import talukasByDistrict from "./maharashtraTalukas.json";

/** All districts (36), sorted A→Z */
export const MAHARASHTRA_DISTRICTS = Object.keys(talukasByDistrict).sort((a, b) =>
  a.localeCompare(b),
);

export function getTalukas(district) {
  if (!district) return [];
  return talukasByDistrict[district] || [];
}

/**
 * Build village dropdown options: Census/Wikipedia-backed list for the district,
 * merged with demo-plot villages, optional taluka-first sort, optional text filter.
 */
export function buildVillageOptions({
  taluka,
  districtVillageList,
  demoVillagesInDistrict,
  filterText,
}) {
  const fromApi = Array.isArray(districtVillageList) ? [...districtVillageList] : [];
  const fromDemo = Array.isArray(demoVillagesInDistrict) ? [...demoVillagesInDistrict] : [];
  const merged = [];
  const seen = new Set();
  for (const v of [...fromDemo, ...fromApi]) {
    const s = (v || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    merged.push(s);
  }
  let list = merged.sort((a, b) => a.localeCompare(b));

  const q = (filterText || "").trim().toLowerCase();
  if (q) {
    list = list.filter((v) => v.toLowerCase().includes(q));
  }

  if (taluka) {
    const t = taluka.toLowerCase();
    const hits = list.filter((v) => v.toLowerCase().includes(t));
    const rest = list.filter((v) => !v.toLowerCase().includes(t));
    list = [...hits, ...rest];
  }

  return list;
}
