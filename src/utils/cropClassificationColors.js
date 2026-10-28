/**
 * One distinct colour per crop so every field of the same crop reads as one group
 * on the map. Known crops (and their common local spellings) get fixed colours;
 * anything else falls back to a well-separated hue derived from its name.
 */
const KNOWN_CROP_COLORS = {
  soybean: { stroke: "#86efac", fill: "#22c55e" },
  cotton: { stroke: "#e9d5ff", fill: "#a855f7" },
  sugarcane: { stroke: "#fdba74", fill: "#ea580c" },
  banana: { stroke: "#fde047", fill: "#eab308" },
  rice: { stroke: "#93c5fd", fill: "#2563eb" },
  wheat: { stroke: "#fef3c7", fill: "#d6b370" },
  maize: { stroke: "#fcd34d", fill: "#ca8a04" },
  tur: { stroke: "#f9a8d4", fill: "#db2777" },
  chickpea: { stroke: "#fecaca", fill: "#b45309" },
  sorghum: { stroke: "#d9f99d", fill: "#65a30d" },
  bajra: { stroke: "#a5f3fc", fill: "#0891b2" },
  onion: { stroke: "#f0abfc", fill: "#c026d3" },
  groundnut: { stroke: "#fed7aa", fill: "#9a3412" },
  grapes: { stroke: "#c4b5fd", fill: "#6d28d9" },
  orange: { stroke: "#fed7aa", fill: "#f97316" },
  chili: { stroke: "#fca5a5", fill: "#ef4444" },
  tobacco: { stroke: "#d6d3d1", fill: "#78716c" },
  fallow: { stroke: "#cbd5e1", fill: "#64748b" },
};

const CROP_ALIASES = {
  soyabean: "soybean",
  soya: "soybean",
  paddy: "rice",
  corn: "maize",
  toor: "tur",
  arhar: "tur",
  "pigeon pea": "tur",
  pigeonpea: "tur",
  "red gram": "tur",
  gram: "chickpea",
  chana: "chickpea",
  "bengal gram": "chickpea",
  jowar: "sorghum",
  "pearl millet": "bajra",
  grape: "grapes",
  graps: "grapes",
  chilli: "chili",
  chillies: "chili",
  "sugar cane": "sugarcane",
  peanut: "groundnut",
  "bare soil": "fallow",
  "barren": "fallow",
};

function normalizeCrop(crop) {
  const label = String(crop || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return CROP_ALIASES[label] ?? label;
}

const fallbackColorCache = new Map();

export function cropClassificationColor(crop) {
  const label = normalizeCrop(crop);
  if (KNOWN_CROP_COLORS[label]) return KNOWN_CROP_COLORS[label];
  if (!fallbackColorCache.has(label)) {
    const hash = Array.from(label).reduce(
      (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
      0,
    );
    // Golden-angle hue spacing keeps unknown crops visually apart from each other.
    const hue = Math.round((hash * 137.508) % 360);
    fallbackColorCache.set(label, {
      stroke: `hsl(${hue}, 85%, 72%)`,
      fill: `hsl(${hue}, 70%, 48%)`,
    });
  }
  return fallbackColorCache.get(label);
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
