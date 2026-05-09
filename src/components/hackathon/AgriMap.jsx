import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  useMap,
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

function buildPlotHoverHtml(feature) {
  const p = feature.properties || {};
  if (p.layerType === "district") {
    const districtName = p.district || p.name || "District";
    return `
<div style="min-width:180px;font-family:system-ui,sans-serif;font-size:12px;color:#e2e8f0;">
  <div style="font-weight:700;color:#fff;margin-bottom:6px;">${esc(districtName)}</div>
  <div style="color:#cbd5e1;">District boundary view</div>
</div>`;
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

/** Maharashtra state boundary overlay (matches CropGen accent, visible on satellite basemap). */
const MAHARASHTRA_STATE_STYLE = {
  fillColor: "#79c24a",
  fillOpacity: 0.16,
  color: "#79c24a",
  weight: 3,
  opacity: 0.95,
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

const PlotGeoJsonLayer = memo(function PlotGeoJsonLayer({
  plotData,
  styleFor,
  onEachFeature,
  layerKey,
  renderer,
}) {
  if (!plotData?.features?.length) return null;
  return (
    <GeoJSON
      key={layerKey}
      data={plotData}
      style={styleFor}
      onEachFeature={onEachFeature}
      renderer={renderer}
    />
  );
});

export default function AgriMap({
  plotData,
  villageBoundary,
  /** Optional FeatureCollection — simplified Maharashtra outline from /data/maharashtra-state-outline.geojson */
  maharashtraOutline = null,
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
  const deferredPlotData = useDeferredValue(plotData);
  const hoverHtmlCacheRef = useRef(new Map());
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  useEffect(() => {
    hoverHtmlCacheRef.current.clear();
  }, [deferredPlotData]);

  const isStateOutlineExtent =
    !deferredPlotData?.features?.length && Boolean(maharashtraOutline?.features?.length);

  const bounds = useMemo(() => {
    if (deferredPlotData?.features?.length) {
      const fromPlots = bboxToLeafletBounds(deferredPlotData);
      if (fromPlots) return fromPlots;
    }
    const fromState = bboxToLeafletBounds(maharashtraOutline);
    return isStateOutlineExtent ? inflateLatLngBounds(fromState, 0.12) : fromState;
  }, [deferredPlotData, maharashtraOutline, isStateOutlineExtent]);

  const maharashtraCentroid = useMemo(
    () => featureCollectionCentroidLatLng(maharashtraOutline),
    [maharashtraOutline],
  );

  const onEachMaharashtraFeature = useCallback((_, layer) => {
    layer.bindTooltip(
      `<div style="font-size:12px;font-weight:600;color:#0f172a;">Maharashtra</div><div style="font-size:11px;color:#475569;">State boundary (OpenStreetMap)</div>`,
      { sticky: true, direction: "auto", className: "agri-mh-state-tip", opacity: 1 },
    );
  }, []);

  const styleFor = useCallback(
    (feature) => {
      const p = feature?.properties || {};
      const selected = p._id === selectedPlotId;
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

  const geoJsonKey = useMemo(
    () =>
      `${mapLayer}-${platformMode}-${showSurveyPopup}-${deferredPlotData?.features?.length ?? 0}`,
    [mapLayer, platformMode, showSurveyPopup, deferredPlotData?.features?.length],
  );

  const isDeferredRendering = deferredPlotData !== plotData;
  const shouldShowLoader = isLoading || isDeferredRendering;
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
    const remaining = Math.max(0, 2000 - elapsed);
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
      const cached = hoverHtmlCacheRef.current.get(featureId);
      const hoverHtml = cached || buildPlotHoverHtml(feature);
      if (!cached) hoverHtmlCacheRef.current.set(featureId, hoverHtml);

      layer.on({
        click: () => onPlotClick?.(feature),
      });
      layer.bindTooltip(hoverHtml, {
        sticky: true,
        opacity: 1,
        direction: "auto",
        className: "agri-plot-hover",
        interactive: false,
      });
      if (showSurveyPopup && platformMode === "survey") {
        layer.bindPopup(buildSurveyPopupHtml(feature), {
          className: "agri-survey-popup",
          maxWidth: 280,
        });
      }
    },
    [onPlotClick, showSurveyPopup, platformMode],
  );

  return (
    <div className="relative h-[min(62vh,560px)] w-full overflow-hidden rounded-xl border border-green-900/30 bg-black/20">
      <MapContainer
        center={maharashtraCentroid || [19.7515, 75.7139]}
        zoom={6}
        className="h-full w-full"
        zoomControl
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        {maharashtraOutline?.features?.length > 0 && (
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

        <PlotGeoJsonLayer
          plotData={deferredPlotData}
          styleFor={styleFor}
          onEachFeature={onEachPlotFeature}
          layerKey={geoJsonKey}
          renderer={canvasRenderer}
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
        {isStateOutlineExtent && bounds && maharashtraCentroid ? (
          <FitMaharashtraStateView cornerBounds={bounds} centroid={maharashtraCentroid} />
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
