/**
 * The village-boundary dataset (Census 2001) and the bundled district outline
 * (public/data/maharashtra-districts-outline.geojson) spell some districts
 * differently. App state (`useAgriPlatform().district`) uses the outline name so
 * the map can find the district; API calls use the dataset name.
 */
const DATASET_TO_OUTLINE = {
  Ahmadnagar: "Ahmednagar",
  Osmanabad: "Dharashiv",
  Nasik: "Nashik",
  Sangali: "Sangli",
  Buldana: "Buldhana",
  // The dataset merges Mumbai City + Mumbai Suburban; its villages are suburban.
  Mumbai: "Mumbai Suburban",
};

const OUTLINE_TO_DATASET = {
  ...Object.fromEntries(Object.entries(DATASET_TO_OUTLINE).map(([data, outline]) => [outline, data])),
  "Mumbai City": "Mumbai",
};

/** Dataset district name → outline / app-state name. */
export function toOutlineDistrict(datasetName) {
  if (!datasetName) return "";
  return DATASET_TO_OUTLINE[datasetName] || datasetName;
}

/** Outline / app-state district name → dataset name used by the boundary API. */
export function toDatasetDistrict(outlineName) {
  if (!outlineName) return "";
  return OUTLINE_TO_DATASET[outlineName] || outlineName;
}
