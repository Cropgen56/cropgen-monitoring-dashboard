import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFieldData } from "../context/FieldDataContext";
import {
  getMaharashtraDemoPlots,
  getJalgaonDemoVillageBoundary,
} from "../data/maharashtraDemoPlots";
import {
  enrichWashimSoybeanFeatureCollection,
  getWashimAreaOutlineFromFeatureCollection,
} from "../data/washimSoybeanPlots";
import {
  enrichJalnaBananaFeatureCollection,
  getJalnaAreaOutlineFromFeatureCollection,
} from "../data/jalnaBananaPlots";
import { getClusterAnalytics } from "../data/agriStateData";
import {
  MAHARASHTRA_DISTRICTS,
  getTalukas,
  buildVillageOptions,
} from "../data/maharashtraHierarchy";

export const MAP_FOCUS_BY_DISTRICT = {
  Jalna: { center: [19.84, 75.88], zoom: 11 },
  Washim: { center: [20.13, 77.13], zoom: 11 },
  Jalgaon: { center: [21.01, 75.57], zoom: 11 },
};

/**
 * Shared plot loading, filters, and selection for Survey + Admin routes.
 */
export function useAgriPlatformState() {
  const {
    loadSampleFields,
    selectSampleField,
    selectField,
    selectedSampleFieldId,
    setSelectedCrop,
    fieldData,
  } = useFieldData();

  const [district, setDistrict] = useState("Washim");
  const [taluka, setTaluka] = useState("");
  const [village, setVillage] = useState("");
  const [crop, setCrop] = useState("Soybean");
  const [season, setSeason] = useState("Kharif");
  const [year, setYear] = useState(2026);

  const [adminMapLayer, setAdminMapLayer] = useState("default");
  const [surveyMapLayer, setSurveyMapLayer] = useState("crop_class");
  const [showVillageBoundary, setShowVillageBoundary] = useState(true);
  const [showValidation, setShowValidation] = useState(true);

  const [villagesByDistrictCatalog, setVillagesByDistrictCatalog] = useState(null);
  const [villageFilter, setVillageFilter] = useState("");

  const [washimSoybeanPlots, setWashimSoybeanPlots] = useState(null);
  const [washimLoadError, setWashimLoadError] = useState(null);
  const [jalnaBananaPlots, setJalnaBananaPlots] = useState(null);
  const [jalnaLoadError, setJalnaLoadError] = useState(null);
  const [jalnaLoading, setJalnaLoading] = useState(false);
  const jalnaFetchRef = useRef({ inFlight: false, failed: false });

  const basePlots = useMemo(() => getMaharashtraDemoPlots(), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/washim-soybean-plots.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("washim geojson");
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        setWashimLoadError(null);
        setWashimSoybeanPlots(enrichWashimSoybeanFeatureCollection(raw));
      })
      .catch(() => {
        if (!cancelled) {
          setWashimSoybeanPlots(null);
          setWashimLoadError("Could not load Washim soybean plots (GeoJSON).");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (jalnaBananaPlots?.features?.length) return;
    if (district !== "Jalna") {
      jalnaFetchRef.current.failed = false;
      return;
    }
    const cropNorm = (crop || "").trim().toLowerCase();
    const wantsJalnaLayer = cropNorm === "" || cropNorm === "banana";
    if (!wantsJalnaLayer) return;
    if (jalnaFetchRef.current.inFlight || jalnaFetchRef.current.failed) return;

    let cancelled = false;
    jalnaFetchRef.current.inFlight = true;
    setJalnaLoading(true);
    setJalnaLoadError(null);

    fetch("/data/jalna-banana-plots.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("jalna geojson");
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        setJalnaBananaPlots(enrichJalnaBananaFeatureCollection(raw));
        jalnaFetchRef.current.failed = false;
      })
      .catch(() => {
        if (!cancelled) {
          setJalnaBananaPlots(null);
          jalnaFetchRef.current.failed = true;
          setJalnaLoadError("Could not load Jalna banana plots (GeoJSON).");
        }
      })
      .finally(() => {
        jalnaFetchRef.current.inFlight = false;
        if (!cancelled) setJalnaLoading(false);
      });

    return () => {
      cancelled = true;
      jalnaFetchRef.current.inFlight = false;
    };
  }, [district, crop, jalnaBananaPlots]);

  const fullPlots = useMemo(() => {
    const chunks = [basePlots.features];
    if (washimSoybeanPlots?.features?.length)
      chunks.push(washimSoybeanPlots.features);
    if (jalnaBananaPlots?.features?.length)
      chunks.push(jalnaBananaPlots.features);
    if (chunks.length === 1) return basePlots;
    return { type: "FeatureCollection", features: chunks.flat() };
  }, [basePlots, washimSoybeanPlots, jalnaBananaPlots]);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/mh-villages-by-district.json")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setVillagesByDistrictCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setVillagesByDistrictCatalog({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlots = useMemo(() => {
    let features = fullPlots.features;
    if (district)
      features = features.filter((f) => f.properties?.district === district);
    if (taluka)
      features = features.filter((f) => f.properties?.taluka === taluka);
    if (village)
      features = features.filter((f) => f.properties?.village === village);
    if (crop) {
      const q = crop.trim().toLowerCase();
      features = features.filter(
        (f) => (f.properties?.cropType || "").trim().toLowerCase() === q,
      );
    }
    return { type: "FeatureCollection", features };
  }, [fullPlots, district, taluka, village, crop]);

  const mapRegionFallback = useMemo(() => {
    if (filteredPlots.features.length > 0) return null;
    if (!district || !MAP_FOCUS_BY_DISTRICT[district]) return null;
    return MAP_FOCUS_BY_DISTRICT[district];
  }, [filteredPlots.features.length, district]);

  const talukaOptions = useMemo(() => getTalukas(district), [district]);

  const demoVillagesInDistrict = useMemo(() => {
    if (!district) return [];
    const set = new Set();
    fullPlots.features.forEach((f) => {
      if (f.properties?.district !== district) return;
      const v = f.properties?.village;
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [district, fullPlots]);

  const villageOptions = useMemo(
    () =>
      buildVillageOptions({
        district,
        taluka,
        districtVillageList: district
          ? villagesByDistrictCatalog?.[district]
          : [],
        demoVillagesInDistrict,
        filterText: villageFilter,
      }),
    [
      district,
      taluka,
      villagesByDistrictCatalog,
      demoVillagesInDistrict,
      villageFilter,
    ],
  );

  const districtVillageCount = useMemo(() => {
    if (!district || !villagesByDistrictCatalog) return -1;
    return villagesByDistrictCatalog[district]?.length ?? 0;
  }, [district, villagesByDistrictCatalog]);

  useEffect(() => {
    loadSampleFields(filteredPlots);
  }, [loadSampleFields, filteredPlots]);

  useEffect(() => {
    if (!selectedSampleFieldId) return;
    const ok = filteredPlots.features.some(
      (f) => f.properties?._id === selectedSampleFieldId,
    );
    if (!ok) selectSampleField(null);
  }, [filteredPlots, selectedSampleFieldId, selectSampleField]);

  useEffect(() => {
    setTaluka("");
    setVillage("");
    setVillageFilter("");
  }, [district]);

  useEffect(() => {
    setVillage("");
  }, [taluka]);

  useEffect(() => {
    if (district === "Jalna" && crop === "Soybean") setCrop("Banana");
  }, [district, crop]);

  useEffect(() => {
    if (district === "Washim" && crop === "Banana") setCrop("Soybean");
  }, [district, crop]);

  useEffect(() => {
    setSelectedCrop(crop || "");
  }, [crop, setSelectedCrop]);

  const selectedFeature = useMemo(() => {
    if (!selectedSampleFieldId) return null;
    return fullPlots.features.find(
      (f) => f.properties?._id === selectedSampleFieldId,
    );
  }, [fullPlots, selectedSampleFieldId]);

  const villageBoundary = useMemo(() => {
    if (!showVillageBoundary) return null;
    if (district === "Jalgaon") return getJalgaonDemoVillageBoundary();
    if (district === "Washim" && washimSoybeanPlots)
      return getWashimAreaOutlineFromFeatureCollection(washimSoybeanPlots);
    if (district === "Jalna" && jalnaBananaPlots)
      return getJalnaAreaOutlineFromFeatureCollection(jalnaBananaPlots);
    return null;
  }, [showVillageBoundary, district, washimSoybeanPlots, jalnaBananaPlots]);

  const adminMapLayerComputed =
    adminMapLayer === "risk" ? "risk" : "default";

  const clusterRows = useMemo(
    () => getClusterAnalytics(district),
    [district],
  );

  const yieldCompareData = useMemo(
    () =>
      clusterRows.map((c) => ({
        name: c.clusterId,
        yield: c.yieldPerAcreTon,
        benchmark: c.benchmarkYieldTon,
      })),
    [clusterRows],
  );

  const historicalYield = [
    { y: "2023", current: 11.2, prior: 10.4 },
    { y: "2024", current: 12.1, prior: 11.2 },
    { y: "2025", current: 12.8, prior: 12.1 },
    { y: "2026", current: 13.4, prior: 12.8 },
  ];

  const p = selectedFeature?.properties;

  const handlePlotClick = useCallback(
    (feature) => {
      selectSampleField(feature.properties?._id || null);
      selectField(feature);
    },
    [selectSampleField, selectField],
  );

  const loadedFieldCount = filteredPlots.features.length;

  return {
    district,
    setDistrict,
    taluka,
    setTaluka,
    village,
    setVillage,
    crop,
    setCrop,
    season,
    setSeason,
    year,
    setYear,
    adminMapLayer,
    setAdminMapLayer,
    surveyMapLayer,
    setSurveyMapLayer,
    showVillageBoundary,
    setShowVillageBoundary,
    showValidation,
    setShowValidation,
    villageFilter,
    setVillageFilter,
    washimLoadError,
    jalnaLoadError,
    jalnaLoading,
    filteredPlots,
    fullPlots,
    mapRegionFallback,
    talukaOptions,
    villageOptions,
    districtVillageCount,
    villagesByDistrictCatalog,
    selectedSampleFieldId,
    selectedFeature,
    selectedProperties: p,
    villageBoundary,
    adminMapLayerComputed,
    clusterRows,
    yieldCompareData,
    historicalYield,
    handlePlotClick,
    selectSampleField,
    fieldData,
    loadedFieldCount,
    MAHARASHTRA_DISTRICTS,
  };
}
