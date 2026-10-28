import * as turf from "@turf/turf";
import { delineateFields } from "../api/boundaryApi";

/** Grid cells a bit under the cap, so a full cell plus float error never exceeds it. */
const TILE_FILL = 0.95;
/**
 * A piece's vertices this close to a grid line count as its cut edge. The model clips fields
 * to the requested area, so cut edges land within ~0.5 m of the tile edge (measured), while
 * real field boundaries near a line are usually metres away; a tight tolerance keeps
 * neighbouring fields on either side of a line from being joined.
 */
const SEAM_TOLERANCE_M = 1;
/** Cut edges of two pieces must overlap this much (and this share of the shorter edge) to be one field. */
const SEAM_MIN_OVERLAP_M = 5;
const SEAM_MIN_OVERLAP_SHARE = 0.4;
/** Pieces are grown by this before the union so a hairline gap at the seam closes, then shrunk back. */
const STITCH_BUFFER_M = 1;
const M_PER_DEG_LAT = 111_320;

/**
 * Splits an area into square grid cells (clipped to the area) of at most `maxKm2` each.
 * Returns the clipped tiles plus the interior grid lines, which stitching needs.
 */
export function splitIntoTiles(area, maxKm2) {
  const [west, south, east, north] = turf.bbox(area);
  const midLat = (south + north) / 2;
  const sideM = Math.sqrt(maxKm2 * TILE_FILL) * 1000;
  const dLat = sideM / M_PER_DEG_LAT;
  const dLng = sideM / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));
  const cols = Math.max(1, Math.ceil((east - west) / dLng));
  const rows = Math.max(1, Math.ceil((north - south) / dLat));

  const tiles = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = turf.bboxPolygon([
        west + c * dLng,
        south + r * dLat,
        Math.min(east, west + (c + 1) * dLng),
        Math.min(north, south + (r + 1) * dLat),
      ]);
      let clipped = null;
      try {
        clipped = turf.intersect(turf.featureCollection([cell, area]));
      } catch {
        clipped = null;
      }
      if (clipped && turf.area(clipped) > 1) tiles.push(clipped);
    }
  }
  return {
    tiles,
    seams: {
      lngs: Array.from({ length: cols - 1 }, (_, i) => west + (i + 1) * dLng),
      lats: Array.from({ length: rows - 1 }, (_, i) => south + (i + 1) * dLat),
      tolLat: SEAM_TOLERANCE_M / M_PER_DEG_LAT,
      tolLng: SEAM_TOLERANCE_M / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180)),
      degPerMLat: 1 / M_PER_DEG_LAT,
      degPerMLng: 1 / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180)),
    },
  };
}

function forEachVertex(geometry, visit) {
  const walk = (value) => {
    if (typeof value?.[0] === "number") visit(value[0], value[1]);
    else if (Array.isArray(value)) value.forEach(walk);
  };
  walk(geometry?.coordinates);
}

/**
 * Where a piece runs along each grid line: for a north–south line the latitude range of the
 * piece's vertices on it, for an east–west line the longitude range, plus which side the piece is on.
 */
function seamEdges(feature, bbox, seams) {
  const edges = [];
  const [w, s, e, n] = bbox;
  const lines = [
    ...seams.lngs.map((x, index) => ({ axis: "lng", index, at: x, tol: seams.tolLng })),
    ...seams.lats.map((y, index) => ({ axis: "lat", index, at: y, tol: seams.tolLat })),
  ];
  for (const line of lines) {
    const [min, max] = line.axis === "lng" ? [w, e] : [s, n];
    if (min - line.tol > line.at || max + line.tol < line.at) continue;
    let lo = Infinity;
    let hi = -Infinity;
    let count = 0;
    forEachVertex(feature.geometry, (lng, lat) => {
      const across = line.axis === "lng" ? lng : lat;
      if (Math.abs(across - line.at) > line.tol) return;
      const along = line.axis === "lng" ? lat : lng;
      lo = Math.min(lo, along);
      hi = Math.max(hi, along);
      count += 1;
    });
    if (count < 2 || hi <= lo) continue;
    const middle = line.axis === "lng" ? (w + e) / 2 : (s + n) / 2;
    edges.push({ key: `${line.axis}:${line.index}`, axis: line.axis, lo, hi, side: middle < line.at ? -1 : 1 });
  }
  return edges;
}

function withMeasures(feature) {
  const areaM2 = turf.area(feature);
  return {
    ...feature,
    properties: {
      ...feature.properties,
      area_m2: areaM2,
      area_ha: areaM2 / 10_000,
      perimeter_m: turf.length(turf.polygonToLine(feature), { units: "meters" }),
    },
  };
}

function unionOf(pieces, bufferM) {
  const parts = bufferM ? pieces.map((p) => turf.buffer(p, bufferM, { units: "meters" })) : pieces;
  const joined = turf.union(turf.featureCollection(parts));
  if (!bufferM) return joined;
  return joined && turf.buffer(joined, -bufferM, { units: "meters" });
}

/** Joins the pieces of one field into one polygon, keeping the largest piece's properties. */
function unionPieces(pieces) {
  let joined = null;
  // Grow–union–shrink closes a small gap at the seam; a plain union is the fallback when the
  // clipping library rejects the grown shapes.
  for (const bufferM of [STITCH_BUFFER_M, 0]) {
    try {
      joined = unionOf(pieces, bufferM);
    } catch {
      joined = null;
    }
    if (joined?.geometry) break;
  }
  if (!joined?.geometry) return null;
  const largest = pieces.reduce((a, b) => (turf.area(b) > turf.area(a) ? b : a));
  const confidences = pieces.map((p) => Number(p.properties?.confidence)).filter(Number.isFinite);
  return withMeasures({
    type: "Feature",
    geometry: joined.geometry,
    properties: {
      ...largest.properties,
      ...(confidences.length ? { confidence: confidences.reduce((a, b) => a + b, 0) / confidences.length } : {}),
      stitched_pieces: pieces.length,
    },
  });
}

/**
 * Merges per-tile results: a field cut by a tile edge comes back as one piece per tile, so
 * pieces near a seam that overlap a piece from another tile are unioned. Field ids restart
 * in every tile, so all fields are renumbered 1..N (crop classification matches by field_id).
 */
export function stitchTileFields(tileFeatures, seams) {
  const all = [];
  tileFeatures.forEach((features, tile) =>
    features.forEach((f) => {
      if (f?.geometry) all.push({ feature: f, tile, bbox: turf.bbox(f) });
    }),
  );

  const parent = all.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  // Pieces of one field share its cut edge: same grid line, opposite sides, overlapping extent.
  const byLine = new Map();
  all.forEach((item, i) => {
    for (const edge of seamEdges(item.feature, item.bbox, seams)) {
      if (!byLine.has(edge.key)) byLine.set(edge.key, []);
      byLine.get(edge.key).push({ ...edge, i });
    }
  });
  const minOverlap = { lng: SEAM_MIN_OVERLAP_M * seams.degPerMLat, lat: SEAM_MIN_OVERLAP_M * seams.degPerMLng };
  for (const edges of byLine.values()) {
    edges.sort((a, b) => a.lo - b.lo);
    for (let a = 0; a < edges.length; a += 1) {
      for (let b = a + 1; b < edges.length && edges[b].lo < edges[a].hi; b += 1) {
        const x = edges[a];
        const y = edges[b];
        if (x.side === y.side || all[x.i].tile === all[y.i].tile) continue;
        const overlap = Math.min(x.hi, y.hi) - Math.max(x.lo, y.lo);
        const shorter = Math.min(x.hi - x.lo, y.hi - y.lo);
        if (overlap >= minOverlap[x.axis] && overlap >= shorter * SEAM_MIN_OVERLAP_SHARE) parent[find(y.i)] = find(x.i);
      }
    }
  }

  const groups = new Map();
  all.forEach((item, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item.feature);
  });

  const merged = [];
  for (const pieces of groups.values()) {
    if (pieces.length === 1) {
      merged.push(pieces[0]);
      continue;
    }
    let joined = null;
    try {
      joined = unionPieces(pieces);
    } catch {
      joined = null;
    }
    // A failed union keeps the pieces as separate fields rather than dropping them.
    if (joined) merged.push(joined);
    else merged.push(...pieces);
  }
  return merged.map((f, i) => ({ ...f, properties: { ...f.properties, field_id: i + 1 } }));
}

/**
 * Field detection for an area of any size: areas over `maxKm2` are split into tiles that are
 * detected separately (each retried once) and stitched back together.
 * Resolves to { type, features, tiles, failedTiles }; throws only if every tile fails.
 */
export async function delineateArea(feature, { maxKm2, signal, onProgress, concurrency = 2 } = {}) {
  const km2 = turf.area(feature) / 1e6;
  if (!(km2 > maxKm2)) {
    const result = await delineateFields(feature, { signal, onProgress });
    return { ...result, tiles: 1, failedTiles: 0 };
  }

  const { tiles, seams } = splitIntoTiles(feature, maxKm2);
  const progress = tiles.map(() => 0);
  let finished = 0;
  const report = (message) =>
    onProgress?.({
      pct: (progress.reduce((a, b) => a + b, 0) / tiles.length) || 0,
      message: `Tile ${Math.min(finished + 1, tiles.length)}/${tiles.length} · ${message}`,
    });

  const results = new Array(tiles.length);
  const errors = [];
  let next = 0;
  const runTile = async (i) => {
    const request = { type: "Feature", geometry: tiles[i].geometry, properties: { ...feature.properties } };
    const onTileProgress = ({ pct, message }) => {
      progress[i] = Number(pct) || 0;
      report(message || "detecting");
    };
    try {
      return await delineateFields(request, { signal, onProgress: onTileProgress });
    } catch (error) {
      if (signal?.aborted) throw error;
      progress[i] = 0;
      return delineateFields(request, { signal, onProgress: onTileProgress });
    }
  };
  const worker = async () => {
    while (next < tiles.length && !signal?.aborted) {
      const i = next++;
      try {
        results[i] = (await runTile(i)).features || [];
      } catch (error) {
        if (signal?.aborted) throw error;
        results[i] = [];
        errors.push(error);
      }
      progress[i] = 100;
      finished += 1;
      report(finished === tiles.length ? "joining tiles" : "done");
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tiles.length) }, worker));
  if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
  if (errors.length === tiles.length) throw errors[0];

  return {
    type: "FeatureCollection",
    features: stitchTileFields(results, seams),
    tiles: tiles.length,
    failedTiles: errors.length,
  };
}
