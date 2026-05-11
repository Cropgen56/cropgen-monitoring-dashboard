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
import {
  generateSoybeanPlotsInDistrict,
  enrichDistrictSyntheticFeatureCollection,
  getSyntheticDistrictPlotsExtentOutline,
  talukaPoolForDistrict,
  combineDistrictGeometriesToOneFeature,
} from "../data/maharashtraDistrictSyntheticPlots";
import { getClusterAnalytics } from "../data/agriStateData";
import {
  MAHARASHTRA_DISTRICTS,
  getTalukas,
  buildVillageOptions,
} from "../data/maharashtraHierarchy";
import * as turf from "@turf/turf";
import {
  normalizeDistrictKey,
  districtKeyCandidates,
  sanitizeFeatureCollection,
  classifyMapDataMode,
  MAP_DATA_MODE,
} from "../data/monitoringDefinitions";
import {
  enrichGovernanceFeatureCollection,
  aggregateDistrictGovernance,
  generateGovernanceInsights,
} from "../data/governanceEngine";
import { fetchCountries, fetchStates } from "../api/locationApi";

/** Lazy loaders only — eager loading all district GeoJSON OOMs the tab (Chromium error 5). */
const DISTRICT_GEOJSON_LOADERS = import.meta.glob("../data/*.geojson", {
  query: "?raw",
  import: "default",
});

function toFeatureCollection(input) {
  if (!input) return null;
  if (input.type === "FeatureCollection") return input;
  if (input.type === "Feature") return { type: "FeatureCollection", features: [input] };
  return null;
}

function findDistrictGeoLoaderPath(districtName) {
  const candidates = districtKeyCandidates(districtName);
  return Object.keys(DISTRICT_GEOJSON_LOADERS).find((path) => {
    const file = path.split("/").pop() || "";
    const key = normalizeDistrictKey(file.replace(/\.geojson$/i, ""));
    return candidates.some((c) => key === c || key.includes(c) || c.includes(key));
  });
}

/**
 * Washim/Jalna-style titles: `Soybean · Taluka · plot N` — here `Crop · District · boundary`.
 */
function decorateDistrictFeatures(fc, districtName, { crop, season, year } = {}) {
  const cropLabel = String(crop || "Soybean").trim() || "Soybean";
  const seasonLabel = String(season || "Kharif").trim() || "Kharif";
  const yearLabel = year ?? 2026;
  if (!fc?.features?.length) return { type: "FeatureCollection", features: [] };
  const multi = fc.features.length > 1;
  const prefix = normalizeDistrictKey(districtName).slice(0, 3).toUpperCase() || "MH";
  return {
    type: "FeatureCollection",
    features: fc.features.map((f, idx) => {
      const tract = multi ? ` · tract ${idx + 1}` : "";
      const name = `${cropLabel} · ${districtName} · district boundary${multi ? ` ${idx + 1}` : ""}`;
      const shortLabel = `${cropLabel} · ${districtName}${tract}`;
      return {
        ...f,
        properties: {
          ...(f.properties || {}),
          _id: `district-file-${districtName.toLowerCase().replace(/\s+/g, "-")}-${idx}`,
          district: districtName,
          name: shortLabel,
          mapTitle: name,
          cropType: cropLabel,
          season: seasonLabel,
          year: yearLabel,
          clusterId: `${prefix}-BD-${String(idx + 1).padStart(2, "0")}`,
          layerType: "district",
          boundarySource: "district-geojson-file",
        },
      };
    }),
  };
}

/** Field / plot features only, matching sidebar district (demo + merged GeoJSON). */
function filterPlotsFeatureCollectionByDistrict(fc, districtName) {
  if (!fc?.features?.length || !districtName) return { type: "FeatureCollection", features: [] };
  const want = String(districtName).trim();
  return {
    type: "FeatureCollection",
    features: fc.features.filter((f) => {
      if (f?.properties?.layerType === "district") return false;
      return String(f?.properties?.district || "").trim() === want;
    }),
  };
}

export const MAP_FOCUS_BY_DISTRICT = {
  Jalna: { center: [19.84, 75.88], zoom: 11 },
  Washim: { center: [20.13, 77.13], zoom: 11 },
  Jalgaon: { center: [21.01, 75.57], zoom: 11 },
  Yavatmal: { center: [20.32, 78.12], zoom: 10 },
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

  /** Location API — ISO2 country (default India). */
  const [filterCountryCode, setFilterCountryCode] = useState("IN");
  /** State/UT code from API (MH = Maharashtra). */
  const [filterStateCode, setFilterStateCode] = useState("MH");

  const [locationCountries, setLocationCountries] = useState([]);
  const [locationStates, setLocationStates] = useState([]);
  const [locationApiError, setLocationApiError] = useState(null);
  const [locationApiLoading, setLocationApiLoading] = useState(false);

  /** Empty = all districts outline for Maharashtra; set when drilling into one district. */
  const [district, setDistrict] = useState("");
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
  /** Simplified OSM Maharashtra boundary for map highlight (see public/data/maharashtra-state-outline.geojson). */
  const [maharashtraOutline, setMaharashtraOutline] = useState(null);
  /** Natural Earth 50m — India country + state/UT boundaries (see public/data/india-*-outline.geojson). */
  const [indiaCountryOutline, setIndiaCountryOutline] = useState(null);
  const [indiaStatesOutline, setIndiaStatesOutline] = useState(null);

  const [washimSoybeanPlots, setWashimSoybeanPlots] = useState(null);
  const [washimLoading, setWashimLoading] = useState(false);
  const [washimLoadError, setWashimLoadError] = useState(null);
  const [jalnaBananaPlots, setJalnaBananaPlots] = useState(null);
  const [jalnaLoadError, setJalnaLoadError] = useState(null);
  const [jalnaLoading, setJalnaLoading] = useState(false);
  const jalnaFetchRef = useRef({ inFlight: false, failed: false });
  const districtGeoCacheRef = useRef(new Map());

  /** Raw geometry from `src/data/<DISTRICT>.geojson` (labels applied in useMemo with crop/season). */
  const [lazyDistrictOutlineRaw, setLazyDistrictOutlineRaw] = useState(null);
  const [districtOutlineLoading, setDistrictOutlineLoading] = useState(false);
  /** Simplified 36-district outline (public/data/maharashtra-districts-outline.geojson). */
  const [maharashtraDistrictsOutline, setMaharashtraDistrictsOutline] = useState(null);
  const [mhAllDistrictsOutlineLoading, setMhAllDistrictsOutlineLoading] = useState(false);
  const mhDistrictsOutlineCacheRef = useRef(null);

  const basePlots = useMemo(() => getMaharashtraDemoPlots(), []);

  const prevFilterCountryRef = useRef(null);

  useEffect(() => {
    if (prevFilterCountryRef.current === null) {
      prevFilterCountryRef.current = filterCountryCode;
      return;
    }
    if (prevFilterCountryRef.current !== filterCountryCode) {
      prevFilterCountryRef.current = filterCountryCode;
      setFilterStateCode("");
    }
  }, [filterCountryCode]);

  useEffect(() => {
    let cancelled = false;
    setLocationApiError(null);
    fetchCountries()
      .then((rows) => {
        if (!cancelled) setLocationCountries(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setLocationApiError(e?.message || "Could not load countries");
          setLocationCountries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filterCountryCode) return;
    let cancelled = false;
    setLocationApiLoading(true);
    setLocationApiError(null);
    fetchStates(filterCountryCode)
      .then((rows) => {
        if (cancelled) return;
        const sorted = [...rows].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "en"),
        );
        setLocationStates(sorted);
      })
      .catch((e) => {
        if (!cancelled) {
          setLocationApiError(e?.message || "Could not load states");
          setLocationStates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLocationApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterCountryCode]);

  useEffect(() => {
    setDistrict("");
    setTaluka("");
    setVillage("");
    setVillageFilter("");
  }, [filterStateCode]);

  useEffect(() => {
    if (filterStateCode !== "MH" || district !== "Washim") return;
    if (washimSoybeanPlots?.features?.length) return;

    let cancelled = false;
    setWashimLoading(true);
    setWashimLoadError(null);
    fetch("/data/washim-soybean-plots.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("washim geojson");
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        setWashimSoybeanPlots(enrichWashimSoybeanFeatureCollection(raw));
        setWashimLoadError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setWashimSoybeanPlots(null);
          setWashimLoadError("Could not load Washim soybean plots (GeoJSON).");
        }
      })
      .finally(() => {
        if (!cancelled) setWashimLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterStateCode, district, washimSoybeanPlots]);

  useEffect(() => {
    if (filterStateCode !== "MH") return;
    if (jalnaBananaPlots?.features?.length) return;
    if (district !== "Jalna") {
      jalnaFetchRef.current.failed = false;
      return;
    }
    if (jalnaFetchRef.current.inFlight || jalnaFetchRef.current.failed) return;

    let cancelled = false;
    const jalnaFetchState = jalnaFetchRef.current;
    jalnaFetchState.inFlight = true;
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
        jalnaFetchState.failed = false;
      })
      .catch(() => {
        if (!cancelled) {
          setJalnaBananaPlots(null);
          jalnaFetchState.failed = true;
          setJalnaLoadError("Could not load Jalna banana plots (GeoJSON).");
        }
      })
      .finally(() => {
        jalnaFetchState.inFlight = false;
        if (!cancelled) setJalnaLoading(false);
      });

    return () => {
      cancelled = true;
      jalnaFetchState.inFlight = false;
    };
  }, [filterStateCode, district, jalnaBananaPlots]);

  /** Bundled KML/demo plots only (no per-district synthetic). */
  const bundledRealPlotsRaw = useMemo(() => {
    const chunks = [basePlots.features];
    if (washimSoybeanPlots?.features?.length)
      chunks.push(washimSoybeanPlots.features);
    if (jalnaBananaPlots?.features?.length)
      chunks.push(jalnaBananaPlots.features);
    if (chunks.length === 1) return basePlots;
    return { type: "FeatureCollection", features: chunks.flat() };
  }, [basePlots, washimSoybeanPlots, jalnaBananaPlots]);

  /**
   * When a district has no real plot GeoJSON in `bundledRealPlotsRaw`, generate demo parcels
   * (Washim-style card data) clipped to high-res `src/data/<DISTRICT>.geojson` when available,
   * else to the simplified district polygon from `maharashtra-districts-outline`.
   */
  const districtSyntheticPlots = useMemo(() => {
    if (filterStateCode !== "MH" || !district) return null;
    if (district === "Washim" || district === "Jalna") return null;
    const realInDistrict = filterPlotsFeatureCollectionByDistrict(
      bundledRealPlotsRaw,
      district,
    );
    if (realInDistrict.features.length > 0) return null;

    const fromBundledFile =
      lazyDistrictOutlineRaw?.features?.length > 0
        ? combineDistrictGeometriesToOneFeature(lazyDistrictOutlineRaw)
        : null;
    const outlineFeat =
      fromBundledFile ||
      maharashtraDistrictsOutline?.features?.find(
        (f) => String(f.properties?.district || "").trim() === String(district).trim(),
      );
    if (!outlineFeat?.geometry) return null;

    const raw = generateSoybeanPlotsInDistrict(outlineFeat, 48);
    if (!raw.features?.length) return null;
    return enrichDistrictSyntheticFeatureCollection(
      raw,
      district,
      talukaPoolForDistrict(district),
      crop,
    );
  }, [
    filterStateCode,
    district,
    maharashtraDistrictsOutline,
    bundledRealPlotsRaw,
    lazyDistrictOutlineRaw,
    crop,
  ]);

  /**
   * Global plot pool only (demo + Washim + Jalna). Per-district synthetic parcels are
   * merged in `filteredPlotsRaw` only — otherwise every district change re-enriches
   * governance over thousands of Washim/Jalna polygons (main thread freeze).
   */
  const fullPlotsRaw = useMemo(() => {
    const chunks = [basePlots.features];
    if (washimSoybeanPlots?.features?.length)
      chunks.push(washimSoybeanPlots.features);
    if (jalnaBananaPlots?.features?.length)
      chunks.push(jalnaBananaPlots.features);
    if (chunks.length === 1) return basePlots;
    return { type: "FeatureCollection", features: chunks.flat() };
  }, [basePlots, washimSoybeanPlots, jalnaBananaPlots]);

  const fullPlots = useMemo(
    () =>
      enrichGovernanceFeatureCollection(
        sanitizeFeatureCollection(fullPlotsRaw, { idPrefix: "full" }),
      ),
    [fullPlotsRaw],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/data/maharashtra-state-outline.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("mh outline");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setMaharashtraOutline(data);
      })
      .catch(() => {
        if (!cancelled) setMaharashtraOutline(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (filterCountryCode !== "IN") {
      setIndiaCountryOutline(null);
      setIndiaStatesOutline(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch("/data/india-country-outline.geojson").then((r) => {
        if (!r.ok) throw new Error("in country");
        return r.json();
      }),
      fetch("/data/india-states-outline.geojson").then((r) => {
        if (!r.ok) throw new Error("in states");
        return r.json();
      }),
    ])
      .then(([co, st]) => {
        if (!cancelled) {
          setIndiaCountryOutline(co);
          setIndiaStatesOutline(st);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIndiaCountryOutline(null);
          setIndiaStatesOutline(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filterCountryCode]);

  useEffect(() => {
    if (filterStateCode !== "MH") {
      setMaharashtraDistrictsOutline(null);
      setMhAllDistrictsOutlineLoading(false);
      return;
    }
    if (mhDistrictsOutlineCacheRef.current) {
      setMaharashtraDistrictsOutline(mhDistrictsOutlineCacheRef.current);
      setMhAllDistrictsOutlineLoading(false);
      return;
    }
    let cancelled = false;
    setMhAllDistrictsOutlineLoading(true);
    setMaharashtraDistrictsOutline(null);
    fetch("/data/maharashtra-districts-outline.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("mh districts outline");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        mhDistrictsOutlineCacheRef.current = data;
        setMaharashtraDistrictsOutline(data);
      })
      .catch(() => {
        if (!cancelled) {
          mhDistrictsOutlineCacheRef.current = null;
          setMaharashtraDistrictsOutline(null);
        }
      })
      .finally(() => {
        if (!cancelled) setMhAllDistrictsOutlineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterStateCode]);

  useEffect(() => {
    if (filterStateCode !== "MH") {
      mhDistrictsOutlineCacheRef.current = null;
    }
  }, [filterStateCode]);

  useEffect(() => {
    if (filterStateCode !== "MH") return;
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
  }, [filterStateCode]);

  useEffect(() => {
    if (filterStateCode !== "MH" || !district) {
      setLazyDistrictOutlineRaw(null);
      setDistrictOutlineLoading(false);
      return;
    }
    if (district === "Washim" || district === "Jalna") {
      setLazyDistrictOutlineRaw(null);
      setDistrictOutlineLoading(false);
      return;
    }

    const cached = districtGeoCacheRef.current.get(district);
    if (cached) {
      setLazyDistrictOutlineRaw(cached);
      setDistrictOutlineLoading(false);
      return;
    }

    const path = findDistrictGeoLoaderPath(district);
    const loader = path ? DISTRICT_GEOJSON_LOADERS[path] : null;
    if (!loader) {
      setLazyDistrictOutlineRaw({ type: "FeatureCollection", features: [] });
      setDistrictOutlineLoading(false);
      return;
    }

    let cancelled = false;
    setDistrictOutlineLoading(true);
    setLazyDistrictOutlineRaw(null);

    loader()
      .then((mod) => {
        const raw = mod?.default ?? mod;
        let parsed;
        try {
          parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          parsed = null;
        }
        const fc = toFeatureCollection(parsed) || { type: "FeatureCollection", features: [] };
        districtGeoCacheRef.current.set(district, fc);
        if (!cancelled) setLazyDistrictOutlineRaw(fc);
      })
      .catch(() => {
        if (!cancelled) setLazyDistrictOutlineRaw({ type: "FeatureCollection", features: [] });
      })
      .finally(() => {
        if (!cancelled) setDistrictOutlineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterStateCode, district]);

  const lazyDistrictOutlineLabeled = useMemo(() => {
    if (!lazyDistrictOutlineRaw?.features?.length || !district) return null;
    if (district === "Washim" || district === "Jalna") return null;
    return decorateDistrictFeatures(lazyDistrictOutlineRaw, district, {
      crop,
      season,
      year,
    });
  }, [lazyDistrictOutlineRaw, district, crop, season, year]);

  const filteredPlotsRaw = useMemo(() => {
    if (filterStateCode !== "MH") {
      return { type: "FeatureCollection", features: [] };
    }
    if (!district) {
      return fullPlotsRaw;
    }

    let plotsPart = { type: "FeatureCollection", features: [] };

    if (district === "Washim" && washimSoybeanPlots?.features?.length) {
      plotsPart = washimSoybeanPlots;
    } else if (district === "Jalna" && jalnaBananaPlots?.features?.length) {
      plotsPart = jalnaBananaPlots;
    } else {
      const inDistrict = filterPlotsFeatureCollectionByDistrict(fullPlotsRaw, district);
      if (inDistrict.features.length > 0) {
        plotsPart = inDistrict;
      } else if (districtSyntheticPlots?.features?.length) {
        plotsPart = districtSyntheticPlots;
      }
    }

    /** High-res boundary only when there are no parcel features (same UI as Washim = field polygons only). */
    const detailBoundary =
      district !== "Washim" &&
      district !== "Jalna" &&
      plotsPart.features.length === 0 &&
      lazyDistrictOutlineLabeled?.features?.length
        ? lazyDistrictOutlineLabeled
        : null;

    if (detailBoundary) {
      return detailBoundary;
    }
    if (plotsPart.features.length > 0) {
      return plotsPart;
    }
    return { type: "FeatureCollection", features: [] };
  }, [
    filterStateCode,
    district,
    fullPlotsRaw,
    lazyDistrictOutlineLabeled,
    washimSoybeanPlots,
    jalnaBananaPlots,
    districtSyntheticPlots,
  ]);

  const filteredPlots = useMemo(
    () =>
      enrichGovernanceFeatureCollection(
        sanitizeFeatureCollection(filteredPlotsRaw, { idPrefix: "plot" }),
      ),
    [filteredPlotsRaw],
  );

  const governanceRollup = useMemo(
    () => aggregateDistrictGovernance(filteredPlots),
    [filteredPlots],
  );

  const governanceInsights = useMemo(
    () =>
      generateGovernanceInsights({
        district: filterStateCode === "MH" ? district || "Maharashtra" : "",
        rollup: governanceRollup,
      }),
    [district, filterStateCode, governanceRollup],
  );

  const mapDataQuality = useMemo(() => {
    const { mode, hint } = classifyMapDataMode(filteredPlots);
    if (
      filterStateCode === "MH" &&
      maharashtraDistrictsOutline?.features?.length &&
      mode === MAP_DATA_MODE.EMPTY
    ) {
      return {
        mode: MAP_DATA_MODE.DISTRICT_OUTLINE,
        hint: district
          ? `${district} — district grid visible; add fields or switch district.`
          : "All 36 Maharashtra districts — click a district to open it.",
      };
    }
    return { mode, hint };
  }, [filteredPlots, filterStateCode, district, maharashtraDistrictsOutline]);

  const mapRegionFallback = useMemo(() => {
    if (filteredPlots.features.length > 0) return null;
    if (!district) return null;
    if (MAP_FOCUS_BY_DISTRICT[district]) return MAP_FOCUS_BY_DISTRICT[district];
    const f = maharashtraDistrictsOutline?.features?.find(
      (x) => x.properties?.district === district,
    );
    if (!f) return null;
    try {
      const c = turf.centroid(f);
      const [lng, lat] = c.geometry.coordinates;
      const b = turf.bbox(f);
      const w = b[2] - b[0];
      const zoom = w > 3.5 ? 8 : w > 2 ? 9 : w > 1 ? 10 : 11;
      return { center: [lat, lng], zoom };
    } catch {
      return null;
    }
  }, [filteredPlots.features.length, district, maharashtraDistrictsOutline]);

  const talukaOptions = useMemo(() => getTalukas(district), [district]);

  const demoVillagesInDistrict = useMemo(() => {
    if (!district) return [];
    const set = new Set();
    fullPlots.features.forEach((f) => {
      if (f.properties?.district !== district) return;
      const v = f.properties?.village;
      if (v) set.add(v);
    });
    if (districtSyntheticPlots?.features?.length) {
      districtSyntheticPlots.features.forEach((f) => {
        const v = f.properties?.village;
        if (v) set.add(v);
      });
    }
    return Array.from(set);
  }, [district, fullPlots, districtSyntheticPlots]);

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
    const isMhAllDistrictMap = filterStateCode === "MH" && !district;
    loadSampleFields(isMhAllDistrictMap ? fullPlots : filteredPlots);
  }, [loadSampleFields, filteredPlots, fullPlots, filterStateCode, district]);

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
    setSelectedCrop(crop || "");
  }, [crop, setSelectedCrop]);

  const selectedFeature = useMemo(() => {
    if (!selectedSampleFieldId) return null;
    return (
      fullPlots.features.find((f) => f.properties?._id === selectedSampleFieldId) ??
      filteredPlots.features.find((f) => f.properties?._id === selectedSampleFieldId)
    );
  }, [fullPlots, filteredPlots, selectedSampleFieldId]);

  const villageBoundary = useMemo(() => {
    if (!showVillageBoundary) return null;
    if (district === "Jalgaon") return getJalgaonDemoVillageBoundary();
    if (district === "Washim" && washimSoybeanPlots)
      return getWashimAreaOutlineFromFeatureCollection(washimSoybeanPlots);
    if (district === "Jalna" && jalnaBananaPlots)
      return getJalnaAreaOutlineFromFeatureCollection(jalnaBananaPlots);
    if (districtSyntheticPlots?.features?.length)
      return getSyntheticDistrictPlotsExtentOutline(districtSyntheticPlots, district);
    return null;
  }, [
    showVillageBoundary,
    district,
    washimSoybeanPlots,
    jalnaBananaPlots,
    districtSyntheticPlots,
  ]);

  const adminMapLayerComputed =
    adminMapLayer === "risk"
      ? "risk"
      : adminMapLayer === "impact"
        ? "impact"
        : "default";

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

  const historicalYield = useMemo(
    () => [
      { y: "2023", current: 11.2, prior: 10.4 },
      { y: "2024", current: 12.1, prior: 11.2 },
      { y: "2025", current: 12.8, prior: 12.1 },
      { y: "2026", current: 13.4, prior: 12.8 },
    ],
    [],
  );

  const handlePlotClick = useCallback(
    (feature) => {
      const p = feature?.properties;
      if (p?.layerType === "district" && p?.district) {
        setDistrict(String(p.district));
        selectSampleField(null);
        selectField(null);
        return;
      }
      selectSampleField(p?._id || null);
      selectField(feature);
    },
    [selectSampleField, selectField],
  );

  const handleIndiaStateBoundaryClick = useCallback((feature) => {
    const code = feature?.properties?.state_code;
    if (code) setFilterStateCode(String(code).toUpperCase());
  }, []);

  const loadedFieldCount = useMemo(() => {
    if (filterStateCode === "MH" && !district) return fullPlots.features.length;
    return filteredPlots.features.length;
  }, [filterStateCode, district, filteredPlots, fullPlots]);

  const districtOutlineLoadingCombined =
    districtOutlineLoading || mhAllDistrictsOutlineLoading;

  return useMemo(
    () => ({
      filterCountryCode,
      setFilterCountryCode,
      filterStateCode,
      setFilterStateCode,
      locationCountries,
      locationStates,
      locationApiError,
      locationApiLoading,
      isMaharashtraContext: filterStateCode === "MH",
      isIndiaContext: filterCountryCode === "IN",
      indiaCountryOutline,
      indiaStatesOutline,
      handleIndiaStateBoundaryClick,
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
      washimLoading,
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
      selectedProperties: selectedFeature?.properties,
      villageBoundary,
      adminMapLayerComputed,
      clusterRows,
      yieldCompareData,
      historicalYield,
      handlePlotClick,
      selectSampleField,
      fieldData,
      loadedFieldCount,
      districtOutlineLoading: districtOutlineLoadingCombined,
      MAHARASHTRA_DISTRICTS,
      mapDataQuality,
      governanceRollup,
      governanceInsights,
      maharashtraOutline,
      maharashtraDistrictsOutline,
    }),
    [
      filterCountryCode,
      setFilterCountryCode,
      filterStateCode,
      setFilterStateCode,
      locationCountries,
      locationStates,
      locationApiError,
      locationApiLoading,
      indiaCountryOutline,
      indiaStatesOutline,
      handleIndiaStateBoundaryClick,
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
      washimLoading,
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
      villageBoundary,
      adminMapLayerComputed,
      clusterRows,
      yieldCompareData,
      historicalYield,
      handlePlotClick,
      selectSampleField,
      fieldData,
      loadedFieldCount,
      districtOutlineLoadingCombined,
      mapDataQuality,
      governanceRollup,
      governanceInsights,
      maharashtraOutline,
      maharashtraDistrictsOutline,
    ],
  );
}
