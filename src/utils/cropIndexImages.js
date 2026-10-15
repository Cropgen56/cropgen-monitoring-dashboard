function validLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function validLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function normalizeFeatureId(value) {
  if (value == null) return "";
  const id = String(value).trim();
  return id ? id.toLowerCase() : "";
}

export function cropIndexFeatureId(feature) {
  return cropIndexFeatureIds(feature)[0] || "";
}

export function cropIndexFeatureIds(feature) {
  const properties = feature?.properties || {};
  return [
    properties.field_id,
    properties.fieldId,
    properties.feature_id,
    properties.id,
    properties.fid,
    feature?.id,
  ].map(normalizeFeatureId).filter(Boolean);
}

export function cropIndexFeatureKey(feature) {
  const id = cropIndexFeatureId(feature);
  const detectionId = normalizeFeatureId(feature?.properties?.detectionId);
  return detectionId ? `${detectionId}:${id}` : id;
}

export function cropIndexResultFeatureId(result) {
  return cropIndexResultFeatureIds(result)[0] || "";
}

export function cropIndexResultFeatureIds(result) {
  const properties = result?.properties || {};
  return [
    result?.id,
    result?.field_id,
    result?.fieldId,
    result?.feature_id,
    result?.featureId,
    properties.field_id,
    properties.fieldId,
    properties.feature_id,
    properties.id,
    properties.fid,
  ].map(normalizeFeatureId).filter(Boolean);
}

export function cropIndexMappedFeatureKeys(results = [], features = []) {
  return cropIndexResultsMappedToFeatures(results, features)
    .map(({ feature }) => cropIndexFeatureKey(feature));
}

export function cropIndexFeatureBounds(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && !Array.isArray(value[0]) && !Array.isArray(value[1])) {
      const longitude = Number(value[0]);
      const latitude = Number(value[1]);
      if (validLongitude(longitude) && validLatitude(latitude)) {
        west = Math.min(west, longitude);
        south = Math.min(south, latitude);
        east = Math.max(east, longitude);
        north = Math.max(north, latitude);
      }
      return;
    }
    value.forEach(visit);
  };

  visit(coordinates);
  return Number.isFinite(west) && west < east && south < north
    ? [[south, west], [north, east]]
    : null;
}

export function cropIndexImageSource(value, format = "png") {
  if (typeof value !== "string" || !value.trim()) return "";
  const image = value.trim();
  const dataUrl = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/i);
  if (dataUrl) {
    const encoded = dataUrl[2].replace(/\s/g, "");
    return /^[a-z\d+/]+=*$/i.test(encoded)
      ? `data:image/${dataUrl[1]};base64,${encoded}`
      : "";
  }
  const encoded = image.replace(/\s/g, "");
  if (/^[a-z\d+/]+=*$/i.test(encoded)) {
    const mime = String(format).toLowerCase().includes("jpg") ||
      String(format).toLowerCase().includes("jpeg")
      ? "image/jpeg"
      : String(format).toLowerCase().includes("webp")
        ? "image/webp"
        : "image/png";
    return `data:${mime};base64,${encoded}`;
  }
  return "";
}

export function cropIndexImageBounds(value) {
  if (!Array.isArray(value)) return null;

  if (
    value.length === 2 &&
    value.every((point) => Array.isArray(point) && point.length >= 2)
  ) {
    const [[south, west], [north, east]] = value.map((point) => point.map(Number));
    if (
      validLatitude(south) &&
      validLatitude(north) &&
      validLongitude(west) &&
      validLongitude(east) &&
      south < north &&
      west < east
    ) {
      return [[south, west], [north, east]];
    }
    return null;
  }

  if (value.length !== 4) return null;
  const [first, second, third, fourth] = value.map(Number);
  if (![first, second, third, fourth].every(Number.isFinite)) return null;

  // Recognize [south, west, north, east] when the values are ordered as lat/lon.
  if (
    validLatitude(first) &&
    validLongitude(second) &&
    validLatitude(third) &&
    validLongitude(fourth) &&
    first < third &&
    second < fourth &&
    (first < second || Math.abs(second) > 90)
  ) {
    return [[first, second], [third, fourth]];
  }

  // Standard GeoJSON/raster bbox order: [west, south, east, north].
  if (
    validLongitude(first) &&
    validLatitude(second) &&
    validLongitude(third) &&
    validLatitude(fourth) &&
    first < third &&
    second < fourth
  ) {
    return [[second, first], [fourth, third]];
  }

  return null;
}

function boundsOverlapRatio(firstBounds, secondBounds) {
  if (!firstBounds || !secondBounds) return 0;
  const [[firstSouth, firstWest], [firstNorth, firstEast]] = firstBounds;
  const [[secondSouth, secondWest], [secondNorth, secondEast]] = secondBounds;
  const overlapWidth = Math.max(0, Math.min(firstEast, secondEast) - Math.max(firstWest, secondWest));
  const overlapHeight = Math.max(0, Math.min(firstNorth, secondNorth) - Math.max(firstSouth, secondSouth));
  const intersectionArea = overlapWidth * overlapHeight;
  const firstArea = (firstEast - firstWest) * (firstNorth - firstSouth);
  return firstArea > 0 ? intersectionArea / firstArea : 0;
}

export function cropIndexResultsMappedToFeatures(results = [], features = []) {
  if (!Array.isArray(results) || !Array.isArray(features)) return [];
  const imageResults = results
    .map((result, resultIndex) => ({ result, resultIndex }))
    .filter(({ result }) => cropIndexImageSource(result?.image_base64, result?.image_format));
  const featureById = new Map();
  features.forEach((feature, featureIndex) => {
    cropIndexFeatureIds(feature).forEach((id) => {
      if (!featureById.has(id)) featureById.set(id, { feature, featureIndex });
    });
  });

  const usedFeatureIndexes = new Set();
  const mapped = [];
  imageResults.forEach(({ result, resultIndex }, imageIndex) => {
    const idMatch = cropIndexResultFeatureIds(result)
      .map((id) => featureById.get(id))
      .find((match) => match && !usedFeatureIndexes.has(match.featureIndex));
    if (idMatch) {
      usedFeatureIndexes.add(idMatch.featureIndex);
      mapped.push({ result, feature: idMatch.feature, resultIndex, matchMethod: "id" });
      return;
    }

    const imageBounds = cropIndexImageBounds(result?.bounds);
    if (imageBounds) {
      let bestMatch = null;
      features.forEach((feature, featureIndex) => {
        if (usedFeatureIndexes.has(featureIndex)) return;
        const overlapRatio = boundsOverlapRatio(imageBounds, cropIndexFeatureBounds(feature));
        if (!bestMatch || overlapRatio > bestMatch.overlapRatio) {
          bestMatch = { feature, featureIndex, overlapRatio };
        }
      });
      if (bestMatch?.overlapRatio >= 0.2) {
        usedFeatureIndexes.add(bestMatch.featureIndex);
        mapped.push({ result, feature: bestMatch.feature, resultIndex, matchMethod: "bounds" });
        return;
      }
    }

    if (features[imageIndex] && !usedFeatureIndexes.has(imageIndex)) {
      usedFeatureIndexes.add(imageIndex);
      mapped.push({ result, feature: features[imageIndex], resultIndex, matchMethod: "order" });
    }
  });
  return mapped;
}

export function cropIndexGeometryPathInBounds(feature, bounds, size = 1000) {
  if (!Array.isArray(bounds)) return "";
  const [[south, west], [north, east]] = bounds;
  if (!(south < north && west < east)) return "";
  return cropIndexGeometryPath(feature, (latitude, longitude) => ({
    x: ((longitude - west) / (east - west)) * size,
    y: ((north - latitude) / (north - south)) * size,
  }));
}

export function cropIndexGeometryPath(feature, project) {
  const geometry = feature?.geometry;
  if (!geometry || typeof project !== "function") return "";

  const pathForRing = (ring) => {
    if (!Array.isArray(ring) || ring.length < 3) return "";
    const points = ring
      .map((point) => {
        const longitude = Number(point?.[0]);
        const latitude = Number(point?.[1]);
        if (!validLongitude(longitude) || !validLatitude(latitude)) return null;
        const projected = project(latitude, longitude);
        return Number.isFinite(projected?.x) && Number.isFinite(projected?.y)
          ? `${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`
          : null;
      })
      .filter(Boolean);
    return points.length >= 3 ? `M${points.join(" L")} Z` : "";
  };

  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
  return polygons
    .flatMap((polygon) => (Array.isArray(polygon) ? polygon.map(pathForRing) : []))
    .filter(Boolean)
    .join(" ");
}
