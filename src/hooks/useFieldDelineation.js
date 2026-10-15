import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as turf from "@turf/turf";
import { delineateFields, fetchVillageBoundary } from "../api/boundaryApi";
import { DELINEATION_MAX_AREA_KM2 } from "../config/endpoints";

/** Per-run area cap — see DELINEATION_MAX_AREA_KM2 in src/config/endpoints.js. */
export const MAX_DELINEATION_AREA_KM2 = DELINEATION_MAX_AREA_KM2;

const STORAGE_KEY = "cropgen.fieldDelineations.v1";

function loadSaved() {
  try {
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Steps: idle → pickVillage → loadingVillage → village → draw → running → done.
 * `drawSession` bumps every time a fresh polygon should be drawn, so the map
 * layer can re-arm the draw tool (e.g. after a rejected area).
 * Finished detections accumulate in `saved` (persisted to localStorage) so every
 * map in the app renders them.
 */
export default function useFieldDelineation() {
  const [step, setStep] = useState("idle");
  const [village, setVillage] = useState(null);
  const [area, setArea] = useState(null);
  const [fields, setFields] = useState(null);
  const [error, setError] = useState("");
  const [runStartedAt, setRunStartedAt] = useState(null);
  /** Latest `{ pct, message }` progress event from the delineation stream. */
  const [progress, setProgress] = useState(null);
  const [drawSession, setDrawSession] = useState(0);
  const [saved, setSaved] = useState(loadSaved);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* quota exceeded — results stay in memory for this session */
    }
  }, [saved]);

  const abortInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => abortInFlight, [abortInFlight]);

  const beginDraw = useCallback(() => {
    setStep("draw");
    setDrawSession((n) => n + 1);
  }, []);

  const start = useCallback(() => {
    abortInFlight();
    setVillage(null);
    setArea(null);
    setFields(null);
    setError("");
    setStep("pickVillage");
  }, [abortInFlight]);

  const reset = useCallback(() => {
    abortInFlight();
    setVillage(null);
    setArea(null);
    setFields(null);
    setError("");
    setStep("idle");
  }, [abortInFlight]);

  const redraw = useCallback(() => {
    abortInFlight();
    setArea(null);
    setFields(null);
    setError("");
    beginDraw();
  }, [abortInFlight, beginDraw]);

  /** Loads the village under a point. `thenDraw: false` just shows it (e.g. after a place search). */
  const pickVillageAt = useCallback(
    async (lat, lng, { thenDraw = true } = {}) => {
      abortInFlight();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setError("");
      setArea(null);
      setFields(null);
      setStep("loadingVillage");
      try {
        const feature = await fetchVillageBoundary(lat, lng, "village", { signal: ctrl.signal });
        if (ctrl.signal.aborted) return null;
        if (!feature) {
          setError("No village boundary found at that point. Coverage is Maharashtra only.");
          setStep(thenDraw ? "pickVillage" : "idle");
          return null;
        }
        setVillage(feature);
        if (thenDraw) beginDraw();
        else setStep("village");
        return feature;
      } catch (e) {
        if (ctrl.signal.aborted) return null;
        setError(e?.name === "TimeoutError" ? "Village lookup timed out. Try again." : e.message);
        setStep(thenDraw ? "pickVillage" : "idle");
        return null;
      }
    },
    [abortInFlight, beginDraw],
  );

  /** Shows an already-fetched village boundary (e.g. picked by name); null clears it. */
  const showVillage = useCallback(
    (feature) => {
      abortInFlight();
      setVillage(feature);
      setArea(null);
      setFields(null);
      setError("");
      setStep(feature ? "village" : "idle");
    },
    [abortInFlight],
  );

  /** Sends one geometry (inside the selected village) to the model and saves the result. */
  const runDetection = useCallback(
    async (geometry, km2) => {
      const { name, taluka, district } = village.properties || {};
      const request = { type: "Feature", geometry, properties: { name, taluka, district } };

      abortInFlight();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setArea({ ...request, properties: { ...request.properties, area_km2: km2 } });
      setFields(null);
      setError("");
      setProgress(null);
      setRunStartedAt(Date.now());
      setStep("running");
      try {
        const result = await delineateFields(request, { signal: ctrl.signal, onProgress: setProgress });
        if (ctrl.signal.aborted) return;
        const id = crypto.randomUUID();
        const detectionFields = {
          ...result,
          features: (result.features || []).map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              village: f.properties?.village || name,
              taluka: f.properties?.taluka || taluka,
              district,
              detectionId: id,
            },
          })),
        };
        setFields(detectionFields);
        setStep("done");
        if (detectionFields.features.length) {
          setSaved((rows) => [
            ...rows,
            {
              id,
              village: { name, taluka, district },
              areaKm2: km2,
              createdAt: new Date().toISOString(),
              fields: detectionFields,
            },
          ]);
        }
      } catch (e) {
        if (ctrl.signal.aborted && e?.name === "AbortError") return;
        setError(
          e?.name === "TimeoutError"
            ? "Field detection stopped responding. Try again or use a smaller area."
            : e.message || "Field detection failed.",
        );
        beginDraw();
      }
    },
    [village, abortInFlight, beginDraw],
  );

  /** Runs the model over the whole selected village (only offered when it fits the area cap). */
  const detectWholeVillage = useCallback(() => {
    if (!village) return;
    runDetection(village.geometry, turf.area(village) / 1e6);
  }, [village, runDetection]);

  /** @param {object} drawn GeoJSON Polygon Feature from the draw tool */
  const submitArea = useCallback(
    (drawn) => {
      if (!village) return;
      let clipped = null;
      try {
        clipped = turf.intersect(turf.featureCollection([drawn, village]));
      } catch {
        clipped = null;
      }
      if (!clipped) {
        setError("The drawn area does not overlap the selected village. Draw inside the blue outline.");
        beginDraw();
        return;
      }
      const km2 = turf.area(clipped) / 1e6;
      if (km2 > MAX_DELINEATION_AREA_KM2) {
        setError(
          `Area is ${km2.toFixed(2)} km² — keep it under ${MAX_DELINEATION_AREA_KM2} km² so the model finishes in time.`,
        );
        beginDraw();
        return;
      }

      runDetection(clipped.geometry, km2);
    },
    [village, beginDraw, runDetection],
  );

  const removeSaved = useCallback((id) => setSaved((rows) => rows.filter((r) => r.id !== id)), []);
  const clearSaved = useCallback(() => setSaved([]), []);

  /** Every saved detection merged into one collection for map rendering / export. */
  const savedFields = useMemo(
    () => ({ type: "FeatureCollection", features: saved.flatMap((r) => r.fields.features) }),
    [saved],
  );

  return {
    step,
    village,
    area,
    fields,
    error,
    runStartedAt,
    progress,
    drawSession,
    saved,
    savedFields,
    start,
    reset,
    redraw,
    beginDraw,
    pickVillageAt,
    showVillage,
    submitArea,
    detectWholeVillage,
    removeSaved,
    clearSaved,
  };
}
