// import React, { useState, useRef, useEffect, useMemo } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Polygon,
//   GeoJSON,
//   Marker,
//   useMap,
//   useMapEvents,
// } from "react-leaflet";
// import L from "leaflet";
// import * as turf from "@turf/turf";
// import "leaflet/dist/leaflet.css";

// import LocationModal from "./LocationModal";
// import MapControls from "./MapControls";
// import MapOverlays from "./MapOverlays";

// /*  Leaflet marker fix  */
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
//   iconUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
//   shadowUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
// });

// /*  Custom marker  */
// const yellowMarkerIcon = new L.divIcon({
//   className: "yellow-marker",
//   html: `<div style="
//     display:flex;
//     justify-content:center;
//     align-items:center;
//     width:24px;
//     height:24px;
//     border-radius:50%;
//     background:rgba(0,0,0,.6);
//     color:#fbbf24;
//     font-weight:bold;
//     border:2px solid #fbbf24;
//   ">+</div>`,
//   iconSize: [24, 24],
//   iconAnchor: [12, 12],
// });

// /*  Map helpers  */
// const MoveMap = ({ center, bounds, onDone }) => {
//   const map = useMap();
//   const prevRef = useRef(null);

//   useEffect(() => {
//     if (bounds) {
//       const key = JSON.stringify(bounds);
//       if (prevRef.current !== key) {
//         prevRef.current = key;
//         map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
//         onDone?.();
//       }
//     } else if (center) {
//       map.setView(center, 15);
//     }
//   }, [center, bounds, map, onDone]);

//   return null;
// };

// const ManualMarkerHandler = ({ enabled, onAdd }) => {
//   useMapEvents({
//     click(e) {
//       if (enabled) onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
//     },
//   });
//   return null;
// };

// export default function MapSection({
//   farms,
//   selectedCrop,
//   externalLocation,
//   onFieldSave,
//   savedFields,
//   selectedSavedField,
//   selectedCountry,
//   onCountryChange
// }) {
//   const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
//   const [fitBounds, setFitBounds] = useState(false);

//   const [manualMarkers, setManualMarkers] = useState([]);
//   const [manualArea, setManualArea] = useState(0);
//   const [isAddingManual, setIsAddingManual] = useState(false);
//   const mapWrapperRef = useRef(null);
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   const [toast, setToast] = useState(null);
//   const [showLocationModal, setShowLocationModal] = useState(false);
//   const [selectedIndex, setSelectedIndex] = useState("NDVI");
//   // const [selectedCountry, setSelectedCountry] = useState("");

//   const [selectedFieldId, setSelectedFieldId] = useState(null);

//   const cropFarms = useMemo(() => {
//     if (!selectedCrop) return farms;
//     return farms.filter(
//       (f) => f.cropName.toLowerCase() === selectedCrop.toLowerCase()
//     );
//   }, [farms, selectedCrop]);

//   // 2️⃣ Build field dropdown options
//   const fieldOptions = useMemo(() => {
//     return cropFarms.map((farm) => ({
//       id: farm._id,
//       name: farm.fieldName,
//       polygon: farm.field,
//     }));
//   }, [cropFarms]);

//   // 3️⃣ Selected field polygon
//   const selectedField = useMemo(() => {
//     return fieldOptions.find((f) => f.id === selectedFieldId);
//   }, [fieldOptions, selectedFieldId]);

//   useEffect(() => {
//     if (!selectedField?.polygon?.length) return;
//     if (!mapRef.current) return;

//     const bounds = selectedField.polygon.map((p) => [p.lat, p.lng]);

//     mapRef.current.fitBounds(bounds, {
//       padding: [40, 40],
//       animate: true,
//     });
//   }, [selectedField]);

//   const COUNTRIES = [
//     "India",
//     "South Africa",
//     "Zimbabwe",
//     "Australia",
//     "United States",
//     "United Kingdom",
//     "Canada",
//     "Germany",
//     "Brazil",
//     "Japan",
//   ];

//   const mapRef = useRef(null);

//   /*  farms → GeoJSON  */
//   const farmsToGeoJSON = (farms = []) => ({
//     type: "FeatureCollection",
//     features: farms.map((farm) => ({
//       type: "Feature",
//       properties: {
//         _id: farm._id,
//         cropName: farm.cropName,
//         fieldName: farm.fieldName,
//         acre: farm.acre,
//       },
//       geometry: {
//         type: "Polygon",
//         coordinates: [farm.field.map((p) => [p.lng, p.lat])],
//       },
//     })),
//   });

//   // const geoJsonData = useMemo(() => {
//   //   if (!Array.isArray(farms)) return null;

//   //   const filtered = selectedCrop
//   //     ? farms.filter((f) => f.cropName === selectedCrop)
//   //     : farms;

//   //   return farmsToGeoJSON(filtered);
//   // }, [farms, selectedCrop]);
//   const geoJsonData = useMemo(() => {
//     if (!Array.isArray(farms)) return null;

//     let filtered = farms;

//     if (selectedCountry) {
//       filtered = filtered.filter(
//         (f) => f.country?.toLowerCase() === selectedCountry.toLowerCase()
//       );
//     }

//     if (selectedCrop) {
//       filtered = filtered.filter(
//         (f) => f.cropName?.toLowerCase() === selectedCrop.toLowerCase()
//       );
//     }

//     return farmsToGeoJSON(filtered);
//   }, [farms, selectedCrop, selectedCountry]);

//   /*  Auto bounds  */
//   const bounds = useMemo(() => {
//     if (!geoJsonData?.features?.length) return null;

//     const coords = [];
//     geoJsonData.features.forEach((f) => {
//       f.geometry.coordinates[0].forEach((c) => {
//         coords.push([c[1], c[0]]);
//       });
//     });

//     if (!coords.length) return null;

//     return [
//       [
//         Math.min(...coords.map((c) => c[0])),
//         Math.min(...coords.map((c) => c[1])),
//       ],
//       [
//         Math.max(...coords.map((c) => c[0])),
//         Math.max(...coords.map((c) => c[1])),
//       ],
//     ];
//   }, [geoJsonData]);

//   useEffect(() => {
//     if (bounds) setFitBounds(true);
//   }, [bounds]);

//   /*  Manual area calc  */
//   useEffect(() => {
//     if (manualMarkers.length < 3) {
//       setManualArea(0);
//       return;
//     }

//     const coords = [
//       ...manualMarkers.map((m) => [m.lng, m.lat]),
//       [manualMarkers[0].lng, manualMarkers[0].lat],
//     ];

//     const poly = turf.polygon([coords]);
//     setManualArea(turf.area(poly) / 10000);
//   }, [manualMarkers]);

//   useEffect(() => {
//     if (externalLocation) {
//       setMapCenter(externalLocation);
//       setFitBounds(false);
//     }
//   }, [externalLocation]);

//   useEffect(() => {
//     if (!selectedSavedField || !mapRef.current) return;

//     const latLngs = selectedSavedField.coordinates.map((p) => [p.lat, p.lng]);

//     mapRef.current.fitBounds(latLngs, {
//       padding: [40, 40],
//       maxZoom: 17,
//     });
//   }, [selectedSavedField]);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       mapWrapperRef.current?.requestFullscreen();
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   useEffect(() => {
//     const handleFullscreenChange = () => {
//       const isFs = !!document.fullscreenElement;
//       setIsFullscreen(isFs);

//       if (mapRef.current) {
//         setTimeout(() => {
//           mapRef.current.invalidateSize();
//         }, 300);
//       }
//     };

//     document.addEventListener("fullscreenchange", handleFullscreenChange);
//     return () =>
//       document.removeEventListener("fullscreenchange", handleFullscreenChange);
//   }, []);

//   const handleZoomIn = () => {
//     if (mapRef.current) {
//       mapRef.current.zoomIn();
//     }
//   };

//   const handleZoomOut = () => {
//     if (mapRef.current) {
//       mapRef.current.zoomOut();
//     }
//   };

//   const handleUndoMarker = () => {
//     if (manualMarkers.length === 0) {
//       setToast({
//         message: "No marker to undo",
//         type: "error",
//       });
//       return;
//     }

//     setManualMarkers((prev) => prev.slice(0, -1));

//     setToast({
//       message: "Last marker removed",
//       type: "success",
//     });
//   };

//   const handleSaveBoundary = () => {
//     if (manualMarkers.length < 3) {
//       setToast({
//         message: "Please draw a field boundary first",
//         type: "error",
//       });
//       return;
//     }

//     onFieldSave?.({
//       points: manualMarkers,
//       area: manualArea, // already in hectares
//     });

//     setManualMarkers([]);

//     setToast({
//       message: "Field saved successfully",
//       type: "success",
//     });
//   };

//   const handleClearMarkers = () => {
//     if (manualMarkers.length === 0) {
//       setToast({
//         message: "No boundary to delete",
//         type: "error",
//       });
//       return;
//     }

//     setManualMarkers([]);
//     setToast({
//       message: "Boundary cleared",
//       type: "success",
//     });
//   };

//   return (
//     <>
//       <div
//         ref={mapWrapperRef}
//         className="bg-cg-panel rounded-xl h-[500px] relative overflow-hidden"
//       >
//         <MapContainer
//           center={mapCenter}
//           zoom={5}
//           className="w-full h-full"
//           attributionControl={false}
//           whenCreated={(mapInstance) => {
//             mapRef.current = mapInstance;
//             console.log("Map created:", mapInstance);
//           }}
//           ref={mapRef}
//           zoomControl={false}
//         >
//           <TileLayer
//             url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
//             subdomains={["mt0", "mt1", "mt2", "mt3"]}
//             maxZoom={20}
//           />

//           {geoJsonData && geoJsonData.features.length > 0 && (
//             <GeoJSON
//               key={selectedCrop || "all"}
//               data={geoJsonData}
//               style={{
//                 color: "#fbc02d",
//                 weight: 3,
//                 fillOpacity: 0.3,
//                 fillColor: "#fbc02d",
//               }}
//             />
//           )}

//           {selectedField?.polygon?.length >= 3 && (
//             <Polygon
//               positions={selectedField.polygon.map((p) => [p.lat, p.lng])}
//               pathOptions={{
//                 color: "#22c55e",
//                 weight: 4,
//                 fillColor: "#22c55e   ",
//                 fillOpacity: 0.55,
//               }}
//             />
//           )}

//           {savedFields?.map((field) => (
//             <Polygon
//               key={field.id}
//               positions={field.coordinates.map((p) => [p.lat, p.lng])}
//               pathOptions={{
//                 color:
//                   selectedSavedField?.id === field.id ? "#22c55e" : "#3b82f6",
//                 weight: selectedSavedField?.id === field.id ? 3 : 2,
//                 fillOpacity: 0.25,
//               }}
//             />
//           ))}

//           {manualMarkers.map((m, i) => (
//             <Marker key={i} position={[m.lat, m.lng]} icon={yellowMarkerIcon} />
//           ))}

//           {manualMarkers.length >= 3 && (
//             <Polygon
//               positions={manualMarkers.map((m) => [m.lat, m.lng])}
//               pathOptions={{ color: "#fbbf24", fillOpacity: 0.2 }}
//             />
//           )}

//           <ManualMarkerHandler
//             enabled={isAddingManual}
//             onAdd={(m) => setManualMarkers((p) => [...p, m])}
//           />

//           <MoveMap
//             center={!fitBounds ? mapCenter : null}
//             bounds={fitBounds ? bounds : null}
//             onDone={() => setFitBounds(false)}
//           />
//         </MapContainer>

//         <MapControls
//           isAddingManual={isAddingManual}
//           onZoomIn={handleZoomIn}
//           onZoomOut={handleZoomOut}
//           onToggleAddMode={() => setIsAddingManual((p) => !p)}
//           onUndoLastMarker={handleUndoMarker}
//           onClearAllMarkers={handleClearMarkers}
//           onSaveBoundary={handleSaveBoundary}
//           onOpenLocationModal={() => setShowLocationModal(true)}
//           countries={COUNTRIES}
//           selectedCountry={selectedCountry}
//           onCountryChange={onCountryChange}
//           isFullscreen={isFullscreen}
//           onToggleFullscreen={toggleFullscreen}
//           fieldOptions={fieldOptions}
//           selectedFieldId={selectedFieldId}
//           onFieldChange={setSelectedFieldId}
//         />

//         <MapOverlays
//           manualArea={manualArea}
//           toast={toast}
//           onToastClose={() => setToast(null)}
//           selectedIndex={selectedIndex}
//           setSelectedIndex={setSelectedIndex}
//         />
//       </div>

//       <LocationModal
//         isOpen={showLocationModal}
//         onClose={() => setShowLocationModal(false)}
//         onLocationSelect={(loc) => setMapCenter(loc)}
//       />
//     </>
//   );
// }


// MapSection.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  GeoJSON,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom yellow marker
const yellowMarkerIcon = new L.divIcon({
  className: "yellow-marker",
  html: `<div style="
    display:flex;
    justify-content:center;
    align-items:center;
    width:24px;
    height:24px;
    border-radius:50%;
    background:rgba(0,0,0,.6);
    color:#fbbf24;
    font-weight:bold;
    border:2px solid #fbbf24;
  ">+</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Helper to move map
const MoveMap = ({ bounds, center }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (center) {
      map.setView(center, 5);
    }
  }, [bounds, center, map]);

  return null;
};

export default function MapSection({
  farms,
  selectedCrop,
  externalLocation,
  onFieldSave,
  savedFields,
  selectedSavedField,
  selectedCountry,
  onCountryChange,
}) {
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // default India
  const mapRef = useRef(null);

  // Filter farms by crop and country
  const filteredFarms = useMemo(() => {
    let result = farms || [];
    if (selectedCountry) {
      result = result.filter(
        (f) => f.country?.toLowerCase() === selectedCountry.toLowerCase()
      );
    }
    if (selectedCrop) {
      result = result.filter(
        (f) => f.cropName?.toLowerCase() === selectedCrop.toLowerCase()
      );
    }
    return result;
  }, [farms, selectedCrop, selectedCountry]);

  // Convert farms to GeoJSON
  const geoJsonData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: filteredFarms.map((f) => ({
        type: "Feature",
        properties: { ...f },
        geometry: {
          type: "Polygon",
          coordinates: [f.field.map((p) => [p.lng, p.lat])],
        },
      })),
    };
  }, [filteredFarms]);

  // Calculate bounds to fit map
  const bounds = useMemo(() => {
    if (!geoJsonData?.features?.length) return null;
    const coords = [];
    geoJsonData.features.forEach((f) =>
      f.geometry.coordinates[0].forEach((c) => coords.push([c[1], c[0]]))
    );
    if (!coords.length) return null;
    return [
      [Math.min(...coords.map((c) => c[0])), Math.min(...coords.map((c) => c[1]))],
      [Math.max(...coords.map((c) => c[0])), Math.max(...coords.map((c) => c[1]))],
    ];
  }, [geoJsonData]);

  // Zoom to new country when changed
  useEffect(() => {
    if (!bounds) return;

    // Auto zoom to bounds
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [bounds]);

  return (
    <div className="bg-gray-200 rounded-xl h-[500px] relative overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={5}
        className="w-full h-full"
        whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        {geoJsonData && geoJsonData.features.length > 0 && (
          <GeoJSON
            data={geoJsonData}
            style={{ color: "#fbc02d", weight: 3, fillOpacity: 0.3, fillColor: "#fbc02d" }}
          />
        )}

        {savedFields?.map((field) => (
          <Polygon
            key={field.id}
            positions={field.coordinates.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: selectedSavedField?.id === field.id ? "#22c55e" : "#3b82f6",
              weight: selectedSavedField?.id === field.id ? 3 : 2,
              fillOpacity: 0.25,
            }}
          />
        ))}

        <MoveMap bounds={bounds} center={mapCenter} />
      </MapContainer>

      {/* Country selector */}
      <div className="absolute top-2 left-2 z-[1000]">
        <select
          value={selectedCountry || ""}
          onChange={(e) => onCountryChange(e.target.value)}
          className="bg-white text-black px-2 py-1 rounded-lg border"
        >
          <option value="">All Countries</option>
          {["India", "South Africa", "Zimbabwe", "Australia"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
