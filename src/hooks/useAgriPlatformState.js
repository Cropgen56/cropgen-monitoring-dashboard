import { useCallback, useEffect, useMemo, useState } from "react";

async function fetchGeoJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/**
 * App-wide map context. The platform is scoped to Maharashtra; the only bundled data is
 * the administrative state + district outlines (public/data). Field data comes from the
 * village-boundary and field-delineation APIs (see FieldDelineationContext).
 */
export function useAgriPlatformState() {
  /** Empty = whole-state view; set by clicking a district on the map or the top-bar picker. */
  const [district, setDistrictState] = useState("");
  /** Taluka within `district` (dataset spelling); cleared whenever the district is set. */
  const [taluka, setTaluka] = useState("");

  const setDistrict = useCallback((name) => {
    setDistrictState(name);
    setTaluka("");
  }, []);
  const [maharashtraOutline, setMaharashtraOutline] = useState(null);
  const [maharashtraDistrictsOutline, setMaharashtraDistrictsOutline] = useState(null);
  const [outlinesLoading, setOutlinesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchGeoJson("/data/maharashtra-state-outline.geojson"),
      fetchGeoJson("/data/maharashtra-districts-outline.geojson"),
    ]).then(([state, districts]) => {
      if (cancelled) return;
      setMaharashtraOutline(state.status === "fulfilled" ? state.value : null);
      setMaharashtraDistrictsOutline(districts.status === "fulfilled" ? districts.value : null);
      setOutlinesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      district,
      setDistrict,
      taluka,
      setTaluka,
      maharashtraOutline,
      maharashtraDistrictsOutline,
      outlinesLoading,
    }),
    [district, setDistrict, taluka, maharashtraOutline, maharashtraDistrictsOutline, outlinesLoading],
  );
}
