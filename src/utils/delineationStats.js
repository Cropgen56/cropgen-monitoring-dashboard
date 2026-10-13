export const ACRES_PER_HA = 2.471053814671738;

/** Saved detections limited to one district ("" = all of Maharashtra). */
export function detectionsInDistrict(saved, district) {
  return district ? saved.filter((r) => r.village?.district === district) : saved;
}

export function fieldAreaHa(feature) {
  return Number(feature.properties?.area_ha) || 0;
}

/** Totals across detections: villages covered, fields found, area. */
export function summarizeDetections(detections) {
  const villages = new Set();
  let fields = 0;
  let areaHa = 0;
  for (const r of detections) {
    villages.add(`${r.village?.district}|${r.village?.taluka}|${r.village?.name}`);
    fields += r.fields.features.length;
    areaHa += r.fields.features.reduce((sum, f) => sum + fieldAreaHa(f), 0);
  }
  return {
    villages: detections.length ? villages.size : 0,
    fields,
    areaHa,
    avgFieldHa: fields ? areaHa / fields : 0,
  };
}
