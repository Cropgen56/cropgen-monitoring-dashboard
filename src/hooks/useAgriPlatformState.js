import { useEffect, useMemo, useState } from "react";

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
  /** Empty = whole-state view; set by clicking a district on the map. */
  const [district, setDistrict] = useState("");
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
      maharashtraOutline,
      maharashtraDistrictsOutline,
      outlinesLoading,
    }),
    [district, maharashtraOutline, maharashtraDistrictsOutline, outlinesLoading],
  );
}
