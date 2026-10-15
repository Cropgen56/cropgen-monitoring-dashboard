const CROP_COLORS = [
  { stroke: "#b5e89a", fill: "#83b95f" },
  { stroke: "#d0e985", fill: "#a4bb4f" },
  { stroke: "#d8df8a", fill: "#b3b755" },
  { stroke: "#f0d879", fill: "#c4a844" },
  { stroke: "#a9df89", fill: "#79b65a" },
  { stroke: "#e8dc75", fill: "#b9a83c" },
  { stroke: "#ede59a", fill: "#c0b45a" },
  { stroke: "#c1e29a", fill: "#91b866" },
];

export function cropClassificationColor(crop) {
  const label = String(crop || "").trim().toLowerCase();
  const hash = Array.from(label).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return CROP_COLORS[hash % CROP_COLORS.length];
}

export function fieldPredictionForId(predictions, fieldId) {
  const id = String(fieldId ?? "");
  if (predictions?.[id]) return predictions[id];
  const unprefixedId = id.replace(/^field[_-]/i, "");
  if (unprefixedId !== id && predictions?.[unprefixedId]) {
    return predictions[unprefixedId];
  }
  return predictions?.[`field_${unprefixedId}`] ?? predictions?.[`field-${unprefixedId}`] ?? null;
}

export function cropCandidates(prediction) {
  const candidates =
    prediction?.top_3_candidates ??
    prediction?.temporal_ranked_candidates ??
    prediction?.crop_candidates ??
    [];
  if (!Array.isArray(candidates)) return [];
  return candidates
    .filter((candidate) => candidate?.crop)
    .map((candidate) => ({
      crop: String(candidate.crop),
      score: Number(candidate.score ?? candidate.average_score ?? candidate.share),
    }))
    .filter((candidate) => Number.isFinite(candidate.score) && candidate.score > 0)
    .slice(0, 4);
}
