import React, { useEffect, useMemo, useRef } from "react";
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
      <div style="display:flex;justify-content:space-between;gap:8px;"><span>🌐 Language</span><span style="font-weight:600;color:#0f172a;">Hi</span></div>
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

/** Crop classification colors: Banana yellow, Soybean green, Rice blue, Cotton purple, Sugarcane orange */
const CROP_HEX = {
  Banana: "#eab308",
  Soybean: "#22c55e",
  Rice: "#2563eb",
  Cotton: "#a855f7",
  Sugarcane: "#ea580c",
  Chili: "#ef4444",
  Wheat: "#d6d3d1",
  Maize: "#ca8a04",
  Tobacco: "#78716c",
};

function getHealthColor(health) {
  const value = (health || "").toLowerCase();
  switch (value) {
    case "very good":
      return "#22c55e";
    case "good":
      return "#4ade80";
    case "decent":
      return "#eab308";
    case "poor":
      return "#f97316";
    default:
      return "#9ca3af";
  }
}

function ndviColor(v) {
  const x = Number(v) || 0;
  if (x >= 0.7) return "#16a34a";
  if (x >= 0.55) return "#84cc16";
  if (x >= 0.45) return "#eab308";
  if (x >= 0.35) return "#f97316";
  return "#dc2626";
}

function droughtStyle(cls) {
  switch (cls) {
    case "high":
      return { fill: "#dc2626", stroke: "#991b1b" };
    case "moderate":
      return { fill: "#f97316", stroke: "#c2410c" };
    default:
      return { fill: "#22c55e", stroke: "#15803d" };
  }
}

function surveyRiskLevel(p) {
  const ndvi = Number(p?.surveyNdviHealth ?? p?.avgNDVI ?? 0);
  const h = String(p?.cropHealth || "").toLowerCase();
  if (h === "poor" || ndvi < 0.4) return "High";
  if (h === "decent" || ndvi < 0.55) return "Moderate";
  return "Low";
}

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
  const risk = surveyRiskLevel(p);
  return `
<div style="min-width:200px;font-family:system-ui,sans-serif;font-size:12px;color:#e2e8f0;">
  <div style="font-weight:700;color:#fff;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:6px;">Field insight</div>
  <div style="display:grid;gap:6px;">
    <div><span style="color:#94a3b8;">Crop</span><br/><strong style="color:#f8fafc;">${crop}</strong></div>
    <div><span style="color:#94a3b8;">Health (NDVI)</span><br/><strong style="color:#86efac;">${ndviStr}</strong></div>
    <div><span style="color:#94a3b8;">Predicted yield</span><br/><strong style="color:#fde047;">${yieldStr}</strong></div>
    <div><span style="color:#94a3b8;">Risk level</span><br/><strong style="color:${
      risk === "High" ? "#f87171" : risk === "Moderate" ? "#fbbf24" : "#4ade80"
    };">${risk}</strong></div>
  </div>
</div>`;
}

function riskStyle(feature) {
  const tags = feature?.properties?.aiRiskTags || [];
  if (tags.includes("high_risk_zone"))
    return { fill: "#dc2626", stroke: "#7f1d1d" };
  if (tags.includes("over_fertilization"))
    return { fill: "#a855f7", stroke: "#6b21a8" };
  if (tags.includes("moderate_et_deficit"))
    return { fill: "#f97316", stroke: "#9a3412" };
  return { fill: "#22c55e", stroke: "#14532d" };
}

const FitBounds = ({ bounds }) => {
  const map = useMap();
  const prev = useRef(null);

  useEffect(() => {
    if (!bounds) {
      prev.current = null;
      return;
    }
    const key = JSON.stringify(bounds);
    if (prev.current === key) return;
    prev.current = key;
    const t = setTimeout(() => {
      try {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15, animate: true });
      } catch {
        /* ignore */
      }
    }, 80);
    return () => clearTimeout(t);
  }, [bounds, map]);

  return null;
};

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

export default function AgriMap({
  plotData,
  villageBoundary,
  mapLayer,
  platformMode,
  selectedPlotId,
  onPlotClick,
  showValidationPoints,
  regionFallback = null,
  /** When true (survey mode), bind click popup with crop / NDVI / yield / risk */
  showSurveyPopup = false,
}) {
  const bounds = useMemo(() => {
    if (!plotData?.features?.length) return null;
    try {
      const b = turf.bbox(plotData);
      const [minLng, minLat, maxLng, maxLat] = b;
      return [
        [minLat, minLng],
        [maxLat, maxLng],
      ];
    } catch {
      return null;
    }
  }, [plotData]);

  const styleFor = (feature) => {
    const p = feature?.properties || {};
    const selected = p._id === selectedPlotId;
    const weight = selected ? 3 : 1.2;
    let fill = "#22c55e";
    let stroke = "#15803d";

    if (platformMode === "admin" && mapLayer === "risk") {
      const r = riskStyle(feature);
      fill = r.fill;
      stroke = r.stroke;
    } else if (platformMode === "survey") {
      if (mapLayer === "crop_class") {
        const key = Object.keys(CROP_HEX).find(
          (k) => k.toLowerCase() === String(p.cropType || "").trim().toLowerCase(),
        );
        fill = (key && CROP_HEX[key]) || "#64748b";
        stroke = "#0f172a";
      } else if (mapLayer === "ndvi") {
        fill = ndviColor(p.surveyNdviHealth ?? p.avgNDVI);
        stroke = "#14532d";
      } else if (mapLayer === "drought") {
        const d = droughtStyle(p.droughtClass);
        fill = d.fill;
        stroke = d.stroke;
      } else {
        fill = getHealthColor(p.cropHealth);
        stroke = "#14532d";
      }
    } else {
      fill = getHealthColor(p.cropHealth);
      stroke = "#14532d";
    }

    return {
      fillColor: fill,
      fillOpacity: selected ? 0.72 : 0.58,
      color: stroke,
      weight,
      opacity: 0.95,
    };
  };

  return (
    <div className="relative h-[min(62vh,560px)] w-full overflow-hidden rounded-xl border border-green-900/30 bg-black/20">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={7}
        className="h-full w-full"
        zoomControl
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        {villageBoundary && (
          <GeoJSON
            data={villageBoundary}
            style={{
              fill: false,
              color: "#93c5fd",
              weight: 2,
              dashArray: "6 8",
              opacity: 0.85,
            }}
          />
        )}

        {plotData && (
          <GeoJSON
            key={`${mapLayer}-${platformMode}-${showSurveyPopup}-${plotData.features?.length}`}
            data={plotData}
            style={styleFor}
            onEachFeature={(feature, layer) => {
              layer.on({
                click: () => onPlotClick?.(feature),
              });
              layer.bindTooltip(buildPlotHoverHtml(feature), {
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
            }}
          />
        )}

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
        <FitBounds bounds={bounds} />
      </MapContainer>

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
