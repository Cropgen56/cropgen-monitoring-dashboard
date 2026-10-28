import React, { useEffect } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CropIndexImageOverlays from "./CropIndexImageOverlays";

const OUTLINE_STYLE = { fill: false, color: "#fef08a", weight: 3, opacity: 1 };

function FitFarm({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return undefined;
    const b = L.geoJSON(feature).getBounds();
    if (!b.isValid()) return undefined;
    // The panel may have just mounted or resized; measure before fitting.
    const t = setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.fitBounds(b, { padding: [28, 28], maxZoom: 19, animate: false });
    }, 60);
    return () => clearTimeout(t);
  }, [feature, map]);
  return null;
}

/**
 * One farm on real satellite imagery, with its index image clipped to the boundary on top.
 * `showIndex` / `opacity` let the viewer compare the index with what the ground looks like.
 */
export default function FarmImageMap({ feature, fieldKey, result, showIndex = true, opacity = 0.85, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-white/[0.08] bg-[#080d12] ${className}`}>
      <MapContainer
        center={[20, 77]}
        zoom={16}
        className="h-full w-full"
        zoomControl
        attributionControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={21}
          maxNativeZoom={20}
        />
        {result && (
          <CropIndexImageOverlays
            results={[result]}
            features={[feature]}
            visible={showIndex}
            opacity={opacity}
            idPrefix="farm-panel"
          />
        )}
        <GeoJSON key={fieldKey} data={feature} style={OUTLINE_STYLE} interactive={false} />
        <FitFarm feature={feature} />
      </MapContainer>
    </div>
  );
}
