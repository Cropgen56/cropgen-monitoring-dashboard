import React, { useEffect, useMemo } from "react";
import { GeoJSON, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { useFieldDelineationContext } from "../../context/FieldDelineationContext";

const ACRES_PER_HA = 2.471053814671738;

const VILLAGE_STYLE = { fill: false, color: "#60a5fa", weight: 2.5, dashArray: "6 6", opacity: 0.95 };
const AREA_STYLE = { fill: false, color: "#ffffff", weight: 1.5, dashArray: "4 4", opacity: 0.8 };
const FIELD_STYLE = { color: "#facc15", weight: 1.5, fillColor: "#facc15", fillOpacity: 0.12 };

function bindFieldTooltip(feature, layer) {
  const p = feature.properties || {};
  const ha = Number(p.area_ha) || 0;
  layer.bindTooltip(
    `<strong>Field #${p.field_id ?? "—"}</strong>` +
      (p.village ? ` · ${p.village}` : "") +
      "<br/>" +
      `${ha.toFixed(2)} ha (${(ha * ACRES_PER_HA).toFixed(2)} ac)<br/>` +
      `Perimeter ${Math.round(Number(p.perimeter_m) || 0)} m`,
    { sticky: true, className: "agri-plot-hover" },
  );
}

/**
 * Leaflet-side half of the field delineation tool: map clicks pick a village,
 * leaflet-draw captures the area, and results are drawn on top. Must render
 * inside <MapContainer>. State lives in `FieldDelineationContext`; every saved
 * detection is drawn, so results show on all maps.
 */
export default function FieldDelineationLayer() {
  const map = useMap();
  const { step, village, area, fields, savedFields, saved, drawSession, pickVillageAt, submitArea } =
    useFieldDelineationContext();
  /** Whole-village runs return thousands of polygons; canvas keeps panning smooth. */
  const fieldsRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  useMapEvents({
    click(e) {
      if (step === "pickVillage") pickVillageAt(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = step === "pickVillage" ? "crosshair" : "";
    return () => {
      el.style.cursor = "";
    };
  }, [map, step]);

  useEffect(() => {
    if (!village) return;
    const b = L.geoJSON(village).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
  }, [map, village]);

  useEffect(() => {
    if (!fields?.features?.length) return;
    const b = L.geoJSON(fields).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
  }, [map, fields]);

  useEffect(() => {
    if (step !== "draw") return undefined;
    const handler = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: false,
      shapeOptions: { color: "#ffffff", weight: 2, fillOpacity: 0.08 },
    });
    const onCreated = (e) => submitArea(e.layer.toGeoJSON());
    map.on(L.Draw.Event.CREATED, onCreated);
    handler.enable();
    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      handler.disable();
    };
  }, [map, step, drawSession, submitArea]);

  // react-leaflet <GeoJSON> ignores `data` changes, so key each layer by its content.
  const villageKey = village?.properties?.census_code ?? village?.properties?.name;
  return (
    <>
      {village && (
        <GeoJSON key={`dl-village-${villageKey}`} data={village} style={VILLAGE_STYLE} interactive={false} />
      )}
      {area && (
        <GeoJSON
          key={`dl-area-${drawSession}`}
          data={area}
          style={AREA_STYLE}
          interactive={false}
        />
      )}
      {savedFields.features.length > 0 && (
        <GeoJSON
          key={`dl-fields-${saved.map((r) => r.id).join(",")}`}
          data={savedFields}
          style={FIELD_STYLE}
          onEachFeature={bindFieldTooltip}
          renderer={fieldsRenderer}
        />
      )}
    </>
  );
}
