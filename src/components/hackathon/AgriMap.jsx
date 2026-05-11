import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  memo,
} from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import { validationPoints } from "../../data/agriStateData";
import { BANANA_CROP_IMAGE_URL, SOYBEAN_CROP_IMAGE_URL } from "../../data/cropAssets";
import {
  CROP_HEX,
  aiRiskZoneColors,
  droughtStressColors,
  formatFarmerLanguageLabel,
  healthBucketColor,
  ndviFillColor,
  surveyRiskColor,
  surveyRiskLevelFromProps,
} from "../../data/monitoringDefinitions";
import {
  governanceHeatColor,
  rainfallDeviationStyle,
} from "../../data/governanceEngine";
import SatelliteScanLoader from "../ui/SatelliteScanLoader";

const ACRES_PER_HA = 2.471053814671738;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSowingDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function outerRingCoords(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return geometry.coordinates[0];
  if (geometry.type === "MultiPolygon") return geometry.coordinates[0][0];
  return null;
}

function geomMetrics(feature) {
  const ring = outerRingCoords(feature.geometry);
  const vertices = ring ? Math.max(0, ring.length - 1) : 0;
  let center = "—";
  let perimeterM = 0;
  let areaHa = Number(feature.properties?.area_ha);
  try {
    const c = turf.centroid(feature);
    const [lng, lat] = c.geometry.coordinates;
    center = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (ring && ring.length > 2) {
      const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring
        : [...ring, ring[0]];
      const line = turf.lineString(closed.map(([lng2, lat2]) => [lng2, lat2]));
      perimeterM = turf.length(line, { units: "kilometers" }) * 1000;
    }
    if (!Number.isFinite(areaHa) || areaHa <= 0) {
      areaHa = turf.area(feature) / 10000;
    }
  } catch {
    /* keep fallbacks */
  }
  return { vertices, center, perimeterM, areaHa: Number.isFinite(areaHa) ? areaHa : 0 };
}

function farmingLabel(p) {
  const irr = (p.irrigationType || "").toLowerCase();
  if (irr.includes("drip") || irr.includes("sprinkler")) return "Integrated";
  if (irr.includes("canal") || irr.includes("flood") || irr.includes("open"))
    return "Open irrigation";
  if (irr.includes("rain")) return "Rainfed";
  return "Integrated";
}

function buildMhDistrictBaseTooltipHtml(feature, selectedDistrict) {
  const p = feature.properties || {};
  const districtName = esc(p.district || p.name || "District");
  const active =
    selectedDistrict &&
    String(p.district || "").trim() === String(selectedDistrict).trim();
  return `
<div style="min-width:200px;max-width:240px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;border-radius:10px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.35);border:1px solid rgba(148,163,184,.35);background:linear-gradient(180deg,#0f172a 0%,#1e293b 100%);color:#f1f5f9;">
  <div style="padding:10px 12px;border-bottom:1px solid rgba(51,65,85,.6);display:flex;align-items:center;justify-content:space-between;gap:8px;">
    <span style="font-weight:650;font-size:13px;letter-spacing:.01em;">${districtName}</span>
    <span style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;padding:3px 7px;border-radius:999px;background:${active ? "rgba(14,165,233,.25)" : "rgba(100,116,139,.2)"};color:${active ? "#7dd3fc" : "#94a3b8"};">${active ? "Selected" : "District"}</span>
  </div>
  <div style="padding:9px 12px 11px;font-size:11px;line-height:1.45;color:#cbd5e1;">
    <div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Maharashtra · India</div>
    <span style="color:#e2e8f0;">Click to filter</span> this district in Quick filters. Field polygons load for <strong style="color:#fde68a;">Washim</strong> &amp; <strong style="color:#fde68a;">Jalna</strong> in this demo.
  </div>
</div>`;
}

function buildDistrictFileBoundaryHoverHtml(feature) {
  const p = feature.properties || {};
  const title = esc((p.mapTitle || p.name || "District boundary").split("—")[0].trim());
  const subtitle = `${esc(p.cropType || "Crop")} · ${esc(p.clusterId || "—")}`;
  const { areaHa, center } = geomMetrics(feature);
  const haStr = areaHa > 0 ? areaHa.toFixed(2) : "—";
  const season = esc(p.season || "—");
  const year = esc(p.year != null ? String(p.year) : "—");
  return `
<div style="width:100%;max-width:280px;border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,.45);font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#1e293b;background:#fff;">
  <div style="background:linear-gradient(135deg,#b91c1c,#dc2626);color:#fff;padding:10px 12px;">
    <div style="font-weight:700;font-size:13px;letter-spacing:.02em;">${title}</div>
    <div style="opacity:.92;font-size:11px;margin-top:2px;">${subtitle}</div>
  </div>
  <div style="padding:10px 12px 12px;background:#fafafa;">
    <div style="display:grid;gap:6px;font-size:11px;color:#334155;">
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>📐 Area (GIS)</span><span style="font-weight:600;color:#0f172a;">${esc(haStr)} ha</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>📆 Season</span><span style="font-weight:600;color:#0f172a;">${season} ${year}</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>◎ Center</span><span style="font-weight:600;color:#0f172a;font-family:ui-monospace,monospace;font-size:10px;">${esc(center)}</span></div>
    </div>
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;font-weight:600;color:#15803d;">District boundary (GeoJSON file)</div>
  </div>
</div>`;
}

function buildPlotHoverHtml(feature) {
  const p = feature.properties || {};
  if (
    p.layerType === "district" &&
    (p.boundarySource === "district-geojson-file" ||
      p.boundarySource === "district-simplified-outline")
  ) {
    return buildDistrictFileBoundaryHoverHtml(feature);
  }
  if (p.layerType === "district") {
    return buildMhDistrictBaseTooltipHtml(feature, "");
  }
  const title =
    (p.name || "Field").split("—")[0].trim() || "Field";
  const subtitle = `${p.cropType || "Crop"} · ${p.clusterId || "—"}`;
  const farmer = (p.farmerName || "Farmer").trim();
  const mobile = p.mobile || "—";
  const { vertices, center, perimeterM, areaHa } = geomMetrics(feature);
  const acres = areaHa * ACRES_PER_HA;
  const haStr = areaHa > 0 ? areaHa.toFixed(3) : "—";
  const acStr = areaHa > 0 ? acres.toFixed(3) : "—";
  const perimStr =
    perimeterM > 0 ? `${Math.round(perimeterM)} m` : "—";

  const ct = String(p.cropType || "").toLowerCase();
  const isSoybean = ct === "soybean" || ct === "soyabean";
  const isBanana = ct === "banana";
  const cropBanner =
    isSoybean || isBanana
      ? `<div style="height:72px;overflow:hidden;line-height:0;background:${
          isBanana ? "#422006" : "#1c1917"
        };">
  <img src="${isBanana ? BANANA_CROP_IMAGE_URL : SOYBEAN_CROP_IMAGE_URL}" alt="" width="300" height="72" style="width:100%;height:72px;object-fit:cover;object-position:center 35%;display:block;"/>
</div>`
      : "";

  return `
<div style="width:100%;max-width:288px;border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,.45);font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#1e293b;background:#fff;">
  <div style="background:linear-gradient(135deg,#b91c1c,#dc2626);color:#fff;padding:10px 12px;">
    <div style="font-weight:700;font-size:13px;letter-spacing:.02em;">${esc(title)}</div>
    <div style="opacity:.92;font-size:11px;margin-top:2px;">${esc(subtitle)}</div>
  </div>
  ${cropBanner}
  <div style="padding:10px 12px 12px;background:#fafafa;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="width:36px;height:36px;border-radius:999px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>
      <div style="min-width:0;">
        <div style="font-weight:700;font-size:12px;color:#0f172a;">${esc(farmer.toUpperCase())}</div>
        <div style="font-size:11px;color:#64748b;filter:blur(3.5px);user-select:none;">${esc(mobile)}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;">
      <div style="background:#fff;border-radius:8px;padding:6px;text-align:center;border:1px solid #e2e8f0;">
        <div style="font-size:9px;color:#64748b;">Area</div>
        <div style="font-weight:700;color:#15803d;font-size:11px;">${esc(acStr)} ac</div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:6px;text-align:center;border:1px solid #e2e8f0;">
        <div style="font-size:9px;color:#64748b;">Ha</div>
        <div style="font-weight:700;color:#1d4ed8;font-size:11px;">${esc(haStr)} ha</div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:6px;text-align:center;border:1px solid #e2e8f0;">
        <div style="font-size:9px;color:#64748b;">Perim</div>
        <div style="font-weight:700;color:#c2410c;font-size:11px;">${esc(perimStr)}</div>
      </div>
    </div>
    <div style="display:grid;gap:5px;font-size:11px;color:#334155;">
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>🌱 Farming</span><span style="font-weight:600;color:#0f172a;">${esc(farmingLabel(p))}</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>💧 Irrigation</span><span style="font-weight:600;color:#0f172a;text-align:right;">${esc(p.irrigationType || "—")}</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>📅 Sowing</span><span style="font-weight:600;color:#0f172a;">${esc(formatSowingDate(p.sowingDate))}</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>📍 Vertices</span><span style="font-weight:600;color:#0f172a;">${vertices} pts</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>◎ Center</span><span style="font-weight:600;color:#0f172a;font-family:ui-monospace,monospace;font-size:10px;">${esc(center)}</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>🌐 Language</span><span style="font-weight:600;color:#0f172a;">${esc(formatFarmerLanguageLabel(p))}</span></div>
    </div>
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;font-weight:600;color:#15803d;">Click to inspect field →</div>
  </div>
</div>`;
}

function buildIndiaStateHoverHtml(feature) {
  const p = feature.properties || {};
  const name = esc(p.name || "State / UT");
  const code = esc(p.state_code || "—");
  return `
<div style="min-width:188px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.2);border:1px solid rgba(203,213,225,.9);background:#fff;">
  <div style="padding:8px 11px;background:linear-gradient(135deg,#1e3a5f,#0f172a);color:#f8fafc;">
    <div style="font-weight:650;font-size:12px;letter-spacing:.02em;">${name}</div>
    <div style="font-size:10px;opacity:.88;margin-top:2px;font-variant-numeric:tabular-nums;">IN-${code}</div>
  </div>
  <div style="padding:7px 11px 9px;font-size:10px;color:#64748b;font-weight:500;">Click to set state filter</div>
</div>`;
}

function buildDistrictPopupHtml(feature) {
  const p = feature.properties || {};
  const name = esc(p.district || p.name || "District");
  if (
    p.boundarySource === "district-geojson-file" ||
    p.boundarySource === "district-simplified-outline"
  ) {
    const title = esc(p.mapTitle || p.name || name);
    const crop = esc(p.cropType || "—");
    const cl = esc(p.clusterId || "—");
    const { areaHa } = geomMetrics(feature);
    const haStr = areaHa > 0 ? areaHa.toFixed(2) : "—";
    const season = esc(p.season || "—");
    const year = esc(p.year != null ? String(p.year) : "—");
    return `
<div style="min-width:240px;max-width:300px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;color:#0f172a;line-height:1.5;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.12);">
  <div style="padding:12px 14px;background:linear-gradient(135deg,#fee2e2,#fecaca);border-bottom:1px solid #f87171;">
    <div style="font-weight:700;font-size:15px;color:#991b1b;letter-spacing:-.01em;">${title}</div>
    <div style="font-size:11px;color:#b91c1c;margin-top:4px;font-weight:500;">${crop} · ${cl} · Maharashtra · IN-MH</div>
  </div>
  <div style="padding:12px 14px 14px;background:#fafafa;color:#475569;font-size:11px;">
    <div style="margin-bottom:8px;">High-resolution boundary from bundled <strong style="color:#0f172a;">GeoJSON</strong> (same labeling pattern as Washim/Jalna field parcels).</div>
    <div style="font-variant-numeric:tabular-nums;">Area (GIS): <strong>${esc(haStr)} ha</strong> · ${season} ${year}</div>
  </div>
</div>`;
  }
  return `
<div style="min-width:240px;max-width:300px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;color:#0f172a;line-height:1.5;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.12);">
  <div style="padding:12px 14px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-bottom:1px solid #a7f3d0;">
    <div style="font-weight:700;font-size:15px;color:#065f46;letter-spacing:-.01em;">${name}</div>
    <div style="font-size:11px;color:#047857;margin-top:4px;font-weight:500;">Maharashtra · <span style="font-variant-numeric:tabular-nums;">IN-MH</span></div>
  </div>
  <div style="padding:12px 14px 14px;background:#fafafa;color:#475569;font-size:11px;">
    Administrative boundary (LGD / demo). Use <strong style="color:#0f172a;">Quick filters</strong> to align dashboards with this district. Demo plot footprints: <strong>Washim</strong> (soybean), <strong>Jalna</strong> (banana).
  </div>
</div>`;
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function buildSurveyPopupHtml(feature) {
  const p = feature.properties || {};
  const crop = esc(p.cropType || "—");
  const ndvi = Number(p.surveyNdviHealth ?? p.avgNDVI ?? 0);
  const ndviStr = Number.isFinite(ndvi) ? ndvi.toFixed(2) : "—";
  const yieldVal =
    p.predictedYieldTonPerAcre ??
    p.aiYield ??
    p.soilHealth?.aiYield ??
    "—";
  const yieldStr =
    typeof yieldVal === "number" ? `${yieldVal} t/ac` : esc(String(yieldVal));
  const risk = surveyRiskLevelFromProps(p);
  const impact =
    p.governanceImpactScore != null
      ? `${p.governanceImpactScore} (${p.governanceImpactLabel || "—"})`
      : "—";
  return `
<div style="min-width:200px;font-family:system-ui,sans-serif;font-size:12px;color:#e2e8f0;">
  <div style="font-weight:700;color:#fff;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:6px;">Field insight</div>
  <div style="display:grid;gap:6px;">
    <div><span style="color:#94a3b8;">Crop</span><br/><strong style="color:#f8fafc;">${crop}</strong></div>
    <div><span style="color:#94a3b8;">Health (NDVI)</span><br/><strong style="color:#86efac;">${ndviStr}</strong></div>
    <div><span style="color:#94a3b8;">AI impact score</span><br/><strong style="color:#fdba74;">${esc(impact)}</strong></div>
    <div><span style="color:#94a3b8;">Predicted yield</span><br/><strong style="color:#fde047;">${yieldStr}</strong></div>
    <div><span style="color:#94a3b8;">Risk level</span><br/><strong style="color:${surveyRiskColor(risk)};">${risk}</strong></div>
  </div>
</div>`;
}

const DEFAULT_FIT_OPTIONS = { padding: [40, 40], maxZoom: 15, animate: true };

/** Below this count, render all features (viewport cull + simplify disabled). */
const DENSE_PLOT_THRESHOLD = 180;
/** Pad view bbox by this fraction (each side) so panning doesn’t pop polygons in/out. */
const VIEWPORT_PAD_RATIO = 0.12;

/** Pan deltas smaller than this (deg) skip React state → fewer heavy recomputes. */
const BBOX_EPS = 1.2e-4;

function bboxNearlyEqual(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null || a.length !== 4 || b.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    if (Math.abs(a[i] - b[i]) > BBOX_EPS) return false;
  }
  return true;
}

function featureBBoxIntersects(
  feature,
  west,
  south,
  east,
  north,
) {
  try {
    const [minX, minY, maxX, maxY] = turf.bbox(feature);
    return !(maxX < west || minX > east || maxY < south || minY > north);
  } catch {
    return true;
  }
}

function ringBBoxIntersects(bb, west, south, east, north) {
  if (!bb) return true;
  const [minX, minY, maxX, maxY] = bb;
  return !(maxX < west || minX > east || maxY < south || minY > north);
}

function padLngLatBBox(bbox, ratio) {
  if (!bbox) return null;
  const [west, south, east, north] = bbox;
  const dLng = (east - west) * ratio;
  const dLat = (north - south) * ratio;
  return [west - dLng, south - dLat, east + dLng, north + dLat];
}

/**
 * Low zoom + many parcels: simplify rings so Canvas/SVG paths stay cheap.
 * highQuality:false is noticeably faster on thousand-polygon loads.
 */
function simplifyPlotsForZoom(fc, zoom) {
  if (!fc?.features?.length || zoom == null) return fc;
  const n = fc.features.length;
  if (n < 320) return fc;
  let tol;
  if (zoom <= 9) tol = 0.00028;
  else if (zoom <= 10) tol = 0.00016;
  else if (zoom <= 11) tol = 0.00009;
  else if (zoom <= 12) tol = 0.000045;
  else return fc;
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => {
      try {
        const s = turf.simplify(f, { tolerance: tol, highQuality: false });
        if (!s?.geometry) return f;
        return s;
      } catch {
        return f;
      }
    }),
  };
}

/** Precompute ring bboxes once per simplified layer (avoids turf.bbox on every pan). */
function buildFeatureBBoxIndex(fc) {
  if (!fc?.features?.length) return null;
  const out = new Array(fc.features.length);
  for (let i = 0; i < fc.features.length; i++) {
    try {
      out[i] = turf.bbox(fc.features[i]);
    } catch {
      out[i] = null;
    }
  }
  return out;
}

function filterPlotsToViewport(fc, bbox, ringBBoxes = null) {
  if (!fc?.features?.length || !bbox) return fc;
  const padded = padLngLatBBox(bbox, VIEWPORT_PAD_RATIO);
  if (!padded) return fc;
  const [west, south, east, north] = padded;
  const filtered = [];
  for (let i = 0; i < fc.features.length; i++) {
    const f = fc.features[i];
    const bb = ringBBoxes ? ringBBoxes[i] : null;
    const ok = bb
      ? ringBBoxIntersects(bb, west, south, east, north)
      : featureBBoxIntersects(f, west, south, east, north);
    if (ok) filtered.push(f);
  }
  if (filtered.length === 0) return fc;
  if (filtered.length === fc.features.length) return fc;
  return { type: "FeatureCollection", features: filtered };
}

function useDebouncedMapView(debounceMs) {
  const map = useMap();
  const timerRef = useRef(null);
  const [view, setView] = useState(() => ({
    bbox: null,
    zoom: typeof map?.getZoom === "function" ? map.getZoom() : 12,
  }));

  const flush = useCallback(() => {
    try {
      const b = map.getBounds();
      const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const zoom = map.getZoom();
      startTransition(() => {
        setView((prev) => {
          if (prev.zoom === zoom && bboxNearlyEqual(prev.bbox, bbox)) return prev;
          return { bbox, zoom };
        });
      });
    } catch {
      /* ignore */
    }
  }, [map]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, debounceMs);
  }, [debounceMs, flush]);

  useMapEvents({
    moveend: schedule,
    zoomend: schedule,
  });

  useEffect(() => {
    flush();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map, flush]);

  return view;
}

/**
 * react-leaflet <GeoJSON> does not apply `data` updates (only `style`).
 * A single Leaflet GeoJSON layer is created on map.whenReady, then clearLayers + addData
 * keeps vectors in sync. Refs for style/onEach avoid stale closures. Default SVG renderer
 * avoids canvas/renderer races with react-leaflet’s map instance.
 */
function ImperativePlotGeoJsonLayer({ plotData, styleFor, onEachFeature }) {
  const map = useMap();
  const layerRef = useRef(null);
  const styleRef = useRef(styleFor);
  const onEachRef = useRef(onEachFeature);
  const plotDataRef = useRef(plotData);
  const lastSyncedPlotDataRef = useRef(undefined);

  useLayoutEffect(() => {
    styleRef.current = styleFor;
    onEachRef.current = onEachFeature;
    plotDataRef.current = plotData;
  }, [styleFor, onEachFeature, plotData]);

  const syncData = useCallback((lyr, data) => {
    if (!lyr) return;
    try {
      lyr.clearLayers();
      if (data?.features?.length) {
        lyr.addData(data);
        lyr.setStyle((feature) => styleRef.current(feature));
      }
    } catch {
      /* ignore corrupt geojson edge cases */
    }
  }, []);

  useEffect(() => {
    let layer = null;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      layer = L.geoJSON([], {
        style: (feature) => styleRef.current(feature),
        onEachFeature: (feature, lyr) => onEachRef.current(feature, lyr),
        interactive: true,
      });
      layer.addTo(map);
      if (typeof layer.bringToFront === "function") {
        layer.bringToFront();
      }
      layerRef.current = layer;
      syncData(layer, plotDataRef.current);
      lastSyncedPlotDataRef.current = plotDataRef.current;
    };

    map.whenReady(attach);

    return () => {
      cancelled = true;
      if (layer) {
        try {
          map.removeLayer(layer);
        } catch {
          /* ignore */
        }
      }
      layerRef.current = null;
      lastSyncedPlotDataRef.current = undefined;
    };
  }, [map, syncData]);

  useEffect(() => {
    const lyr = layerRef.current;
    if (!lyr) return;
    if (plotData === lastSyncedPlotDataRef.current) return;
    lastSyncedPlotDataRef.current = plotData;
    syncData(lyr, plotData);
  }, [plotData, syncData]);

  useEffect(() => {
    const lyr = layerRef.current;
    if (!lyr?.getLayers?.()?.length) return;
    try {
      lyr.setStyle((feature) => styleRef.current(feature));
    } catch {
      /* ignore */
    }
  }, [styleFor]);

  return null;
}

const ViewportPlotGeoJson = memo(function ViewportPlotGeoJson({
  plotData,
  styleFor,
  onEachFeature,
}) {
  const { bbox, zoom } = useDebouncedMapView(280);
  const zoomKey = zoom != null ? Math.round(zoom) : null;
  const isDense = Boolean(plotData?.features?.length >= DENSE_PLOT_THRESHOLD);

  const simplifiedPlots = useMemo(() => {
    if (!plotData?.features?.length) return plotData;
    if (!isDense) return plotData;
    return simplifyPlotsForZoom(plotData, zoomKey);
  }, [plotData, zoomKey, isDense]);

  const ringBBoxes = useMemo(() => {
    if (!isDense || !simplifiedPlots?.features?.length) return null;
    return buildFeatureBBoxIndex(simplifiedPlots);
  }, [isDense, simplifiedPlots]);

  const displayData = useMemo(() => {
    if (!simplifiedPlots?.features?.length) return simplifiedPlots;
    if (!isDense) return simplifiedPlots;
    return filterPlotsToViewport(simplifiedPlots, bbox, ringBBoxes);
  }, [simplifiedPlots, bbox, isDense, ringBBoxes]);

  return (
    <ImperativePlotGeoJsonLayer
      plotData={displayData}
      styleFor={styleFor}
      onEachFeature={onEachFeature}
    />
  );
});

const FitBounds = ({ bounds, fitOptions = DEFAULT_FIT_OPTIONS }) => {
  const map = useMap();
  const prev = useRef(null);

  useEffect(() => {
    if (!bounds) {
      prev.current = null;
      return;
    }
    const key = JSON.stringify({ bounds, fitOptions });
    if (prev.current === key) return;
    prev.current = key;
    const t = setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
        map.fitBounds(bounds, { ...DEFAULT_FIT_OPTIONS, ...fitOptions });
      } catch {
        /* ignore */
      }
    }, 80);
    return () => clearTimeout(t);
  }, [bounds, fitOptions, map]);

  return null;
};

/**
 * Maharashtra “all districts” view: full outline in frame, centered on turf centroid.
 * Retries after layout / flex sizing; zooms out until LatLngBounds fully contains the state bbox.
 */
function FitMaharashtraStateView({ cornerBounds, centroid }) {
  const map = useMap();

  useEffect(() => {
    if (!cornerBounds || !centroid) return;

    const latLngBounds = L.latLngBounds(cornerBounds[0], cornerBounds[1]);
    const center = L.latLng(centroid[0], centroid[1]);

    const apply = () => {
      try {
        map.invalidateSize({ animate: false });
        const size = map.getSize();
        if (size.x < 2 || size.y < 2) return;

        const edge = Math.round(Math.min(size.x, size.y) * 0.12);
        const pad = Math.max(96, edge);
        map.fitBounds(latLngBounds, {
          padding: [pad, pad],
          animate: false,
          maxZoom: 18,
        });
        map.panTo(center, { animate: false });

        let guard = 0;
        while (guard < 8 && !map.getBounds().contains(latLngBounds)) {
          const z = map.getZoom();
          if (z <= 1) break;
          map.setZoom(z - 1, { animate: false });
          map.panTo(center, { animate: false });
          guard += 1;
        }
      } catch {
        /* ignore */
      }
    };

    const r0 = requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
    const t1 = window.setTimeout(apply, 150);
    const t2 = window.setTimeout(apply, 450);
    const onResize = () => {
      apply();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(r0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResize);
    };
  }, [map, cornerBounds, centroid]);

  return null;
}

/** When there are no plot features (loading or filter mismatch), pan to a known district view. */
function RegionFallback({ bounds, regionFallback }) {
  const map = useMap();
  const prev = useRef(null);

  useEffect(() => {
    if (bounds) {
      prev.current = null;
      return;
    }
    if (!regionFallback?.center) return;
    const key = JSON.stringify(regionFallback);
    if (prev.current === key) return;
    prev.current = key;
    const t = setTimeout(() => {
      try {
        map.flyTo(regionFallback.center, regionFallback.zoom ?? 11, {
          duration: 0.45,
          animate: true,
        });
      } catch {
        /* ignore */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [bounds, regionFallback, map]);

  return null;
}

const VILLAGE_OUTLINE_STYLE = {
  fill: false,
  color: "#93c5fd",
  weight: 2,
  dashArray: "6 8",
  opacity: 0.85,
};

/** Maharashtra state boundary — green ring on satellite (drawn above district fills). */
const MAHARASHTRA_STATE_STYLE = {
  fillColor: "#22c55e",
  fillOpacity: 0.07,
  color: "#16a34a",
  weight: 3.5,
  opacity: 0.98,
};

/** India country boundary (only when not focused on Maharashtra). */
const INDIA_COUNTRY_STYLE = {
  fillColor: "#f59e0b",
  fillOpacity: 0.14,
  color: "#d97706",
  weight: 2.2,
  opacity: 0.92,
};

function bboxToLeafletBounds(fc) {
  if (!fc?.features?.length) return null;
  try {
    const b = turf.bbox(fc);
    const [minLng, minLat, maxLng, maxLat] = b;
    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  } catch {
    return null;
  }
}

/** Expand bbox so stroke, padding, and centroid pan do not clip the outline. */
function inflateLatLngBounds(bounds, ratio = 0.12) {
  if (!bounds) return null;
  const [[lat1, lng1], [lat2, lng2]] = bounds;
  const minLat = Math.min(lat1, lat2);
  const maxLat = Math.max(lat1, lat2);
  const minLng = Math.min(lng1, lng2);
  const maxLng = Math.max(lng1, lng2);
  const dLat = (maxLat - minLat) * ratio;
  const dLng = (maxLng - minLng) * ratio;
  return [
    [minLat - dLat, minLng - dLng],
    [maxLat + dLat, maxLng + dLng],
  ];
}

function featureCollectionCentroidLatLng(fc) {
  if (!fc?.features?.length) return null;
  try {
    const c = turf.centroid(fc);
    const [lng, lat] = c.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

export default function AgriMap({
  plotData,
  villageBoundary,
  /** Optional FeatureCollection — simplified Maharashtra outline from /data/maharashtra-state-outline.geojson */
  maharashtraOutline = null,
  /** When false, hide state boundary (e.g. non-Maharashtra API selection). */
  showMaharashtraOutline = true,
  /** All 36 districts (simplified) — stays visible when a district is selected. */
  maharashtraDistrictsBaseOutline = null,
  /** Sidebar / filter district name — highlights matching polygon on the base grid. */
  selectedMhDistrict = "",
  /** India (IN) basemap from /data/india-*-outline.geojson */
  indiaCountryOutline = null,
  indiaStatesOutline = null,
  /** ISO 3166-2 state code without IN- prefix, e.g. MH, KA */
  indiaSelectedStateCode = "",
  showIndiaOutlines = false,
  onIndiaStateSelect,
  mapLayer,
  platformMode,
  selectedPlotId,
  onPlotClick,
  showValidationPoints,
  regionFallback = null,
  isLoading = false,
  /** When true (survey mode), bind click popup with crop / NDVI / yield / risk */
  showSurveyPopup = false,
}) {
  /** Keeps UI responsive while React recomputes heavy GeoJSON (feature/hackethon-changes pattern). */
  const deferredPlotData = useDeferredValue(plotData);
  const hoverHtmlCacheRef = useRef(new Map());
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  useEffect(() => {
    hoverHtmlCacheRef.current.clear();
  }, [plotData]);

  const hasMhDistrictGrid = Boolean(maharashtraDistrictsBaseOutline?.features?.length);

  const selectedMhDistrictBounds = useMemo(() => {
    const d = String(selectedMhDistrict || "").trim();
    if (!d || !hasMhDistrictGrid) return null;
    const f = maharashtraDistrictsBaseOutline.features.find(
      (x) => String(x.properties?.district || "").trim() === d,
    );
    if (!f) return null;
    return bboxToLeafletBounds({ type: "FeatureCollection", features: [f] });
  }, [selectedMhDistrict, hasMhDistrictGrid, maharashtraDistrictsBaseOutline]);

  const isStateOutlineExtent =
    showMaharashtraOutline &&
    !deferredPlotData?.features?.length &&
    !hasMhDistrictGrid &&
    Boolean(maharashtraOutline?.features?.length);

  const bounds = useMemo(() => {
    if (deferredPlotData?.features?.length) {
      const fromPlots = bboxToLeafletBounds(deferredPlotData);
      if (fromPlots) return fromPlots;
    }
    if (selectedMhDistrictBounds) {
      return inflateLatLngBounds(selectedMhDistrictBounds, 0.1);
    }
    if (hasMhDistrictGrid) {
      const fromGrid = bboxToLeafletBounds(maharashtraDistrictsBaseOutline);
      return fromGrid ? inflateLatLngBounds(fromGrid, 0.06) : null;
    }
    const fromState = bboxToLeafletBounds(
      showMaharashtraOutline ? maharashtraOutline : null,
    );
    return isStateOutlineExtent ? inflateLatLngBounds(fromState, 0.12) : fromState;
  }, [
    deferredPlotData,
    selectedMhDistrictBounds,
    hasMhDistrictGrid,
    maharashtraDistrictsBaseOutline,
    maharashtraOutline,
    isStateOutlineExtent,
    showMaharashtraOutline,
  ]);

  const shouldPreferFitBounds = useMemo(() => {
    if (!bounds) return false;
    if (deferredPlotData?.features?.length) return true;
    if (hasMhDistrictGrid) return true;
    return false;
  }, [bounds, deferredPlotData, hasMhDistrictGrid]);

  const hideIndiaOverlaysForMaharashtra = useMemo(() => {
    const mh = String(indiaSelectedStateCode || "").toUpperCase() === "MH";
    return mh || hasMhDistrictGrid;
  }, [indiaSelectedStateCode, hasMhDistrictGrid]);

  const showIndiaCountryPolygons = useMemo(() => {
    if (!showIndiaOutlines || !indiaCountryOutline?.features?.length) return false;
    if (hideIndiaOverlaysForMaharashtra) return false;
    return true;
  }, [showIndiaOutlines, indiaCountryOutline, hideIndiaOverlaysForMaharashtra]);

  const showIndiaStatePolygons = useMemo(() => {
    if (!showIndiaOutlines || !indiaStatesOutline?.features?.length) return false;
    if (hideIndiaOverlaysForMaharashtra) return false;
    return true;
  }, [showIndiaOutlines, indiaStatesOutline, hideIndiaOverlaysForMaharashtra]);

  const mhDistrictBaseStyle = useCallback(
    (feature) => {
      const d = String(feature?.properties?.district || "").trim();
      const sel = String(selectedMhDistrict || "").trim();
      const active = Boolean(sel && d === sel);
      return {
        fillColor: active ? "#0284c7" : "#1e293b",
        fillOpacity: active ? 0.18 : 0.09,
        color: active ? "#0c4a6e" : "#0f172a",
        weight: active ? 3 : 2,
        opacity: active ? 1 : 0.94,
      };
    },
    [selectedMhDistrict],
  );

  const onEachMhDistrictBase = useCallback(
    (feature, layer) => {
      layer.bindTooltip(buildMhDistrictBaseTooltipHtml(feature, selectedMhDistrict), {
        sticky: true,
        direction: "auto",
        className: "agri-mh-district-tip",
        opacity: 1,
      });
      layer.bindPopup(buildDistrictPopupHtml(feature), {
        className: "agri-district-popup",
        maxWidth: 320,
      });
      layer.on({
        click: () => onPlotClick?.(feature),
      });
    },
    [onPlotClick, selectedMhDistrict],
  );

  const maharashtraCentroid = useMemo(
    () => featureCollectionCentroidLatLng(maharashtraOutline),
    [maharashtraOutline],
  );

  const indiaCountryCentroid = useMemo(
    () => featureCollectionCentroidLatLng(indiaCountryOutline),
    [indiaCountryOutline],
  );

  const indiaCountryBoundsInflated = useMemo(() => {
    const b = bboxToLeafletBounds(indiaCountryOutline);
    return b ? inflateLatLngBounds(b, 0.06) : null;
  }, [indiaCountryOutline]);

  const indiaSelectedStateFeature = useMemo(() => {
    if (!indiaStatesOutline?.features?.length || !indiaSelectedStateCode) return null;
    const want = String(indiaSelectedStateCode).toUpperCase();
    return (
      indiaStatesOutline.features.find(
        (f) => String(f.properties?.state_code || "").toUpperCase() === want,
      ) || null
    );
  }, [indiaStatesOutline, indiaSelectedStateCode]);

  const indiaSelectedStateBounds = useMemo(() => {
    if (!indiaSelectedStateFeature) return null;
    const fc = { type: "FeatureCollection", features: [indiaSelectedStateFeature] };
    const b = bboxToLeafletBounds(fc);
    return b ? inflateLatLngBounds(b, 0.1) : null;
  }, [indiaSelectedStateFeature]);

  const indiaSelectedCentroid = useMemo(() => {
    if (!indiaSelectedStateFeature) return null;
    try {
      const c = turf.centroid(indiaSelectedStateFeature);
      const [lng, lat] = c.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    } catch {
      return null;
    }
  }, [indiaSelectedStateFeature]);

  const mapInitialCenter = useMemo(() => {
    if (showIndiaOutlines && indiaCountryCentroid) return indiaCountryCentroid;
    return maharashtraCentroid || [19.7515, 75.7139];
  }, [showIndiaOutlines, indiaCountryCentroid, maharashtraCentroid]);

  const indiaStateStyle = useCallback(
    (feature) => {
      const code = String(feature?.properties?.state_code || "");
      const sel = String(indiaSelectedStateCode || "").toUpperCase();
      const active = Boolean(sel && code.toUpperCase() === sel);
      return {
        fillColor: active ? "#38bdf8" : "#64748b",
        fillOpacity: active ? 0.22 : 0.06,
        color: active ? "#0284c7" : "#475569",
        weight: active ? 2 : 0.75,
        opacity: 0.9,
      };
    },
    [indiaSelectedStateCode],
  );

  const onEachIndiaStateFeature = useCallback(
    (feature, layer) => {
      layer.bindTooltip(buildIndiaStateHoverHtml(feature), {
        sticky: true,
        direction: "auto",
        className: "agri-india-state-tip",
        opacity: 1,
      });
      layer.on({
        click: () => onIndiaStateSelect?.(feature),
      });
    },
    [onIndiaStateSelect],
  );

  const onEachMaharashtraFeature = useCallback((_, layer) => {
    layer.bindTooltip(
      `<div style="font-family:ui-sans-serif,system-ui,sans-serif;min-width:160px;border-radius:8px;padding:8px 10px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.12);"><div style="font-weight:650;font-size:12px;color:#0f172a;">Maharashtra</div><div style="font-size:10px;color:#64748b;margin-top:3px;">State boundary</div></div>`,
      { sticky: true, direction: "auto", className: "agri-mh-state-tip", opacity: 1 },
    );
  }, []);

  const styleFor = useCallback(
    (feature) => {
      const p = feature?.properties || {};
      const sid = p._id ?? p.id;
      const selected =
        selectedPlotId != null &&
        sid != null &&
        String(sid) === String(selectedPlotId);
      const weight = selected ? 3 : 1.2;
      if (p.layerType === "district") {
        return {
          fillColor: selected ? "#22c55e" : "#38bdf8",
          fillOpacity: selected ? 0.4 : 0.22,
          color: selected ? "#166534" : "#0f766e",
          weight: selected ? 2.5 : 1.4,
          opacity: 0.95,
        };
      }
      let fill = "#22c55e";
      let stroke = "#15803d";

      if (platformMode === "admin" && mapLayer === "risk") {
        const r = aiRiskZoneColors(feature);
        fill = r.fill;
        stroke = r.stroke;
      } else if (platformMode === "admin" && mapLayer === "impact") {
        const sc = Number(p.governanceImpactScore ?? 0);
        const h = governanceHeatColor(sc);
        fill = h.fill;
        stroke = h.stroke;
      } else if (platformMode === "survey") {
        if (mapLayer === "crop_class") {
          const key = Object.keys(CROP_HEX).find(
            (k) =>
              k.toLowerCase() === String(p.cropType || "").trim().toLowerCase(),
          );
          fill = (key && CROP_HEX[key]) || "#64748b";
          stroke = "#0f172a";
        } else if (mapLayer === "ndvi") {
          fill = ndviFillColor(p.surveyNdviHealth ?? p.avgNDVI);
          stroke = "#14532d";
        } else if (mapLayer === "drought") {
          const d = droughtStressColors(p.droughtClass);
          fill = d.fill;
          stroke = d.stroke;
        } else if (mapLayer === "disease_risk") {
          const h = governanceHeatColor(Number(p.governanceDiseaseRisk ?? 0));
          fill = h.fill;
          stroke = h.stroke;
        } else if (mapLayer === "yield_risk") {
          const h = governanceHeatColor(Number(p.governanceYieldRisk ?? 0));
          fill = h.fill;
          stroke = h.stroke;
        } else if (mapLayer === "rainfall_dev") {
          const r = rainfallDeviationStyle(p.governanceRainfallDeviationPct);
          fill = r.fill;
          stroke = r.stroke;
        } else if (mapLayer === "impact") {
          const h = governanceHeatColor(Number(p.governanceImpactScore ?? 0));
          fill = h.fill;
          stroke = h.stroke;
        } else {
          fill = healthBucketColor(p.cropHealth);
          stroke = "#14532d";
        }
      } else {
        fill = healthBucketColor(p.cropHealth);
        stroke = "#14532d";
      }

      return {
        fillColor: fill,
        fillOpacity: selected ? 0.72 : 0.58,
        color: stroke,
        weight,
        opacity: 0.95,
      };
    },
    [mapLayer, platformMode, selectedPlotId],
  );

  const isPlotsDeferred =
    deferredPlotData !== plotData && Boolean(plotData?.features?.length);
  const shouldShowLoader = isLoading || isPlotsDeferred;
  const [loaderVisible, setLoaderVisible] = useState(false);
  const loaderStartRef = useRef(0);
  const loaderHideTimerRef = useRef(null);

  useEffect(() => {
    if (shouldShowLoader) {
      if (loaderHideTimerRef.current) {
        clearTimeout(loaderHideTimerRef.current);
        loaderHideTimerRef.current = null;
      }
      if (!loaderVisible) {
        loaderStartRef.current = Date.now();
        setLoaderVisible(true);
      }
      return;
    }

    if (!loaderVisible) return;
    const elapsed = Date.now() - loaderStartRef.current;
    const remaining = Math.max(0, 120 - elapsed);
    loaderHideTimerRef.current = setTimeout(() => {
      setLoaderVisible(false);
      loaderHideTimerRef.current = null;
    }, remaining);

    return () => {
      if (loaderHideTimerRef.current) {
        clearTimeout(loaderHideTimerRef.current);
        loaderHideTimerRef.current = null;
      }
    };
  }, [shouldShowLoader, loaderVisible]);

  const onEachPlotFeature = useCallback(
    (feature, layer) => {
      const featureId =
        feature?.properties?._id ||
        feature?.id ||
        `${feature?.properties?.name || "plot"}-${feature?.geometry?.type || "geom"}`;

      layer.on({
        click: () => onPlotClick?.(feature),
      });

      const p = feature?.properties || {};

      const tooltipHtmlCached = () => {
        let html = hoverHtmlCacheRef.current.get(featureId);
        if (!html) {
          html = buildPlotHoverHtml(feature);
          hoverHtmlCacheRef.current.set(featureId, html);
        }
        return html;
      };

      if (p.layerType === "district") {
        const hoverHtml = tooltipHtmlCached();
        layer.bindTooltip(hoverHtml, {
          sticky: true,
          opacity: 1,
          direction: "auto",
          className: "agri-plot-hover",
          interactive: false,
        });
        /** Grid districts: popup on click. File-backed outlines: tooltip only (avoid double panel). */
        if (
          p.boundarySource !== "district-geojson-file" &&
          p.boundarySource !== "district-simplified-outline"
        ) {
          layer.bindPopup(buildDistrictPopupHtml(feature), {
            className: "agri-district-popup",
            maxWidth: 300,
          });
        }
        return;
      }

      /** Parcels (Washim/Jalna, etc.): bind full card immediately — deferred tooltipopen breaks with Canvas GeoJSON. */
      const plotCardHtml = tooltipHtmlCached();
      layer.bindTooltip(plotCardHtml, {
        sticky: true,
        opacity: 1,
        direction: "auto",
        className: "agri-plot-hover",
        interactive: false,
      });

      if (platformMode === "survey" && showSurveyPopup) {
        layer.bindPopup(buildSurveyPopupHtml(feature), {
          className: "agri-survey-popup",
          maxWidth: 280,
        });
      } else {
        layer.bindPopup(plotCardHtml, {
          className: "agri-plot-hover",
          maxWidth: 320,
        });
      }
    },
    [onPlotClick, showSurveyPopup, platformMode],
  );

  return (
    <div className="relative h-[min(62vh,560px)] w-full overflow-hidden rounded-xl border border-green-900/30 bg-black/20">
      <MapContainer
        center={mapInitialCenter}
        zoom={showIndiaOutlines ? 5 : 6}
        className="h-full w-full"
        zoomControl
        attributionControl
        preferCanvas
      >
        {/* Google hybrid: satellite + labels (cities, roads). Ensure use complies with Google Maps ToS. */}
        <TileLayer
          attribution="© Google Maps"
          url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        {showIndiaCountryPolygons && (
          <GeoJSON
            key="india-country-outline"
            data={indiaCountryOutline}
            style={() => INDIA_COUNTRY_STYLE}
            renderer={canvasRenderer}
          />
        )}

        {showIndiaStatePolygons && (
          <GeoJSON
            key={`india-states-${indiaSelectedStateCode || "all"}`}
            data={indiaStatesOutline}
            style={indiaStateStyle}
            onEachFeature={onEachIndiaStateFeature}
            renderer={canvasRenderer}
          />
        )}

        {hasMhDistrictGrid && (
          <GeoJSON
            key={`mh-districts-base-${selectedMhDistrict || "all"}`}
            data={maharashtraDistrictsBaseOutline}
            style={mhDistrictBaseStyle}
            onEachFeature={onEachMhDistrictBase}
            renderer={canvasRenderer}
          />
        )}

        {showMaharashtraOutline && maharashtraOutline?.features?.length > 0 && (
          <GeoJSON
            key="maharashtra-state-outline"
            data={maharashtraOutline}
            style={() => MAHARASHTRA_STATE_STYLE}
            onEachFeature={onEachMaharashtraFeature}
            renderer={canvasRenderer}
          />
        )}

        {villageBoundary && (
          <GeoJSON data={villageBoundary} style={VILLAGE_OUTLINE_STYLE} renderer={canvasRenderer} />
        )}

        {/* Immediate data so polygon clicks match current filters (deferred value lag cleared selection). */}
        <ViewportPlotGeoJson
          plotData={plotData}
          styleFor={styleFor}
          onEachFeature={onEachPlotFeature}
        />

        {showValidationPoints &&
          validationPoints.map((vp) => (
            <CircleMarker
              key={vp.id}
              center={[vp.lat, vp.lng]}
              radius={7}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#0ea5e9",
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs text-gray-900">
                  <strong>{vp.id}</strong>
                  <br />
                  {vp.syncedFrom}
                  <br />
                  Photos: {vp.photoCount}
                </div>
              </Popup>
            </CircleMarker>
          ))}

        <RegionFallback bounds={bounds} regionFallback={regionFallback} />
        {shouldPreferFitBounds && bounds ? (
          <FitBounds bounds={bounds} fitOptions={DEFAULT_FIT_OPTIONS} />
        ) : isStateOutlineExtent && bounds && maharashtraCentroid ? (
          <FitMaharashtraStateView cornerBounds={bounds} centroid={maharashtraCentroid} />
        ) : showIndiaOutlines &&
          indiaCountryBoundsInflated &&
          indiaCountryCentroid &&
          !indiaSelectedStateCode &&
          !isStateOutlineExtent ? (
          <FitMaharashtraStateView
            cornerBounds={indiaCountryBoundsInflated}
            centroid={indiaCountryCentroid}
          />
        ) : showIndiaOutlines &&
          indiaSelectedStateBounds &&
          indiaSelectedCentroid &&
          !isStateOutlineExtent ? (
          <FitMaharashtraStateView
            cornerBounds={indiaSelectedStateBounds}
            centroid={indiaSelectedCentroid}
          />
        ) : (
          <FitBounds bounds={bounds} fitOptions={DEFAULT_FIT_OPTIONS} />
        )}
      </MapContainer>

      {loaderVisible && <SatelliteScanLoader />}

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
        <span className="pointer-events-auto rounded-md bg-black/65 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm">
          {platformMode === "admin"
            ? "Admin: Smart farmer mapping"
            : "Survey: Satellite intelligence"}
        </span>
        {platformMode === "survey" && (
          <span className="pointer-events-auto rounded-md bg-black/65 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm">
            Layer: {mapLayer.replace("_", " ")}
          </span>
        )}
      </div>
    </div>
  );
}
