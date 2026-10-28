import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as turf from "@turf/turf";
import { fetchVillageBoundary, fetchVillageByName, fetchVillages } from "../api/boundaryApi";
import { delineateArea } from "../utils/tiledDelineation";
import { DELINEATION_MAX_AREA_KM2 } from "../config/endpoints";

/** Per-run area cap — see DELINEATION_MAX_AREA_KM2 in src/config/endpoints.js. */
export const MAX_DELINEATION_AREA_KM2 = DELINEATION_MAX_AREA_KM2;

const STORAGE_KEY = "cropgen.fieldDelineations.v1";
/** Villages detected at once during a whole-taluka run (each is its own model request). */
const TALUKA_CONCURRENCY = 2;
const IDLE_TALUKA_RUN = null;
/** The village / area / fields on screen, so a page refresh keeps the current selection. */
const ACTIVE_KEY = "cropgen.fieldDelineationActive.v1";

function loadSaved() {
  try {
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function loadActive() {
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null");
    return active?.village?.geometry ? active : null;
  } catch {
    return null;
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
  const [initial] = useState(loadActive);
  const [step, setStep] = useState(initial ? (initial.fields ? "done" : "village") : "idle");
  const [village, setVillage] = useState(initial?.village ?? null);
  const [area, setArea] = useState(initial?.fields ? initial.area ?? null : null);
  const [fields, setFields] = useState(initial?.fields ?? null);
  const [error, setError] = useState("");
  const [runStartedAt, setRunStartedAt] = useState(null);
  /** Latest `{ pct, message }` progress event from the delineation stream. */
  const [progress, setProgress] = useState(null);
  const [drawSession, setDrawSession] = useState(0);
  const [saved, setSaved] = useState(loadSaved);
  const abortRef = useRef(null);
  /**
   * Whole-taluka batch: { district, taluka, total, done, skipped, noBoundary, fields,
   * failed: [{ name, error }], current: [{ name, pct, message }], startedAt, running }.
   */
  const [talukaRun, setTalukaRun] = useState(IDLE_TALUKA_RUN);
  const talukaAbortRef = useRef(null);
  /** Villages finished this session (including ones with no fields, which are never saved). */
  const talukaDoneRef = useRef(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* quota exceeded — results stay in memory for this session */
    }
  }, [saved]);

  // In-flight steps aren't written; a half-drawn area restores as just the village.
  const settled = step !== "running" && step !== "loadingVillage";
  useEffect(() => {
    if (!settled) return;
    try {
      if (village) localStorage.setItem(ACTIVE_KEY, JSON.stringify({ village, area, fields }));
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* quota exceeded — the selection just won't survive a refresh */
    }
  }, [settled, village, area, fields]);

  const abortInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => abortInFlight, [abortInFlight]);
  useEffect(() => () => talukaAbortRef.current?.abort(), []);

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

  // Latest saved rows for callbacks that run long after they were created (taluka batch).
  const savedRef = useRef(saved);
  savedRef.current = saved;

  /**
   * Tags model output with its village and adds it to `saved`. A re-run replaces the earlier
   * result instead of stacking duplicate fields: a whole-village run supersedes every run in
   * that village, a drawn area only an earlier run of the same area.
   */
  const saveDetection = useCallback((villageProps, result, { geometry, km2, wholeVillage, censusCode: code }) => {
    const { name, taluka, district } = villageProps || {};
    const censusCode = code || villageProps?.census_code;
    const id = crypto.randomUUID();
    const { tiles, failedTiles, ...collection } = result;
    // Some tiles of a large village failed: keep what was found, but let a re-run replace it.
    const incomplete = failedTiles > 0;
    const detectionFields = {
      ...collection,
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
    if (detectionFields.features.length) {
      const areaKey = JSON.stringify(geometry);
      setSaved((rows) => [
        ...rows.filter((r) => {
          const sameVillage =
            r.village?.taluka === taluka &&
            r.village?.district === district &&
            (r.village?.censusCode && censusCode ? String(r.village.censusCode) === String(censusCode) : r.village?.name === name);
          return !(sameVillage && (wholeVillage || r.areaKey === areaKey));
        }),
        {
          id,
          village: { name, taluka, district, ...(censusCode ? { censusCode } : {}) },
          areaKm2: km2,
          wholeVillage,
          areaKey: wholeVillage ? undefined : areaKey,
          ...(tiles > 1 ? { tiles } : {}),
          ...(incomplete ? { incomplete: true, failedTiles } : {}),
          createdAt: new Date().toISOString(),
          fields: detectionFields,
        },
      ]);
    }
    return detectionFields;
  }, []);

  /** Sends one geometry (inside the selected village) to the model and saves the result. */
  const runDetection = useCallback(
    async (geometry, km2) => {
      const { name, taluka, district } = village.properties || {};
      const request = { type: "Feature", geometry, properties: { name, taluka, district } };

      // Detecting one village pauses a whole-taluka run; it can be continued later.
      if (talukaAbortRef.current) {
        talukaAbortRef.current.abort();
        talukaAbortRef.current = null;
        setTalukaRun((r) => (r?.running ? { ...r, running: false, stopped: true, current: [] } : r));
      }
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
        // Areas over the per-run cap (whole large villages) are detected tile by tile.
        const result = await delineateArea(request, {
          maxKm2: MAX_DELINEATION_AREA_KM2,
          signal: ctrl.signal,
          onProgress: setProgress,
        });
        if (ctrl.signal.aborted) return;
        const detectionFields = saveDetection(village.properties, result, {
          geometry,
          km2,
          wholeVillage: geometry === village.geometry,
        });
        setFields(detectionFields);
        setStep("done");
        if (result.failedTiles) {
          setError(
            `${result.failedTiles} of ${result.tiles} tiles failed, so fields there are missing. Run the village again to retry.`,
          );
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
    [village, abortInFlight, beginDraw, saveDetection],
  );

  /**
   * Detects every village in a taluka, one model request per village, saving each as it
   * finishes. Villages already saved as whole-village runs are skipped, so running it
   * again after a stop or failures resumes where it left off.
   * @param {{ district: string, taluka: string }} region dataset (village-boundary API) names
   */
  const detectTaluka = useCallback(
    async ({ district, taluka }) => {
      if (!district || !taluka) return;
      talukaAbortRef.current?.abort();
      const ctrl = new AbortController();
      talukaAbortRef.current = ctrl;
      const { signal } = ctrl;
      const base = {
        district, taluka, total: 0, done: 0, skipped: 0, noBoundary: 0, fields: 0, failed: [], current: [], startedAt: Date.now(),
      };
      setTalukaRun({ ...base, running: true, listing: true });
      let villages;
      try {
        villages = await fetchVillages(district, taluka, { signal });
      } catch (e) {
        if (!signal.aborted) setTalukaRun({ ...base, running: false, error: e.message || "Could not list villages." });
        return;
      }
      if (signal.aborted) return;

      const alreadyDone = new Set(
        savedRef.current
          .filter(
            (r) => r.wholeVillage && !r.incomplete && r.village?.taluka === taluka && r.village?.district === district,
          )
          .map((r) => r.village?.censusCode || r.village?.name),
      );
      const doneKey = (v) => `${district}|${taluka}|${v.census_code}`;
      const queue = villages.filter(
        (v) =>
          !alreadyDone.has(v.census_code) &&
          !(v.name && alreadyDone.has(v.name)) &&
          !talukaDoneRef.current.has(doneKey(v)),
      );
      const label = (v) => v.name || `Census ${v.census_code}`;
      setTalukaRun({ ...base, total: villages.length, skipped: villages.length - queue.length, running: true });

      const update = (fn) => !signal.aborted && setTalukaRun((r) => (r ? fn(r) : r));
      const worker = async () => {
        while (queue.length && !signal.aborted) {
          const v = queue.shift();
          const name = label(v);
          const setVillageProgress = (patch) =>
            update((r) => ({ ...r, current: r.current.map((c) => (c.name === name ? { ...c, ...patch } : c)) }));
          update((r) => ({ ...r, current: [...r.current, { name, pct: 0, message: "Loading boundary…" }] }));
          let feature;
          try {
            feature = await fetchVillageByName(
              { district, taluka, name: v.name, censusCode: v.census_code },
              { signal },
            );
          } catch (e) {
            if (signal.aborted) return;
            // The village list also carries the taluka's own row (no name, taluka census code)
            // and other entries without a boundary; they are not villages, so skip them.
            if (e.status === 404) talukaDoneRef.current.add(doneKey(v));
            update((r) =>
              e.status === 404
                ? { ...r, done: r.done + 1, noBoundary: r.noBoundary + 1, current: r.current.filter((c) => c.name !== name) }
                : {
                    ...r,
                    done: r.done + 1,
                    failed: [...r.failed, { name, error: e.message || "boundary lookup failed" }],
                    current: r.current.filter((c) => c.name !== name),
                  },
            );
            continue;
          }
          try {
            const props = { ...feature.properties, name: feature.properties?.name || v.name, taluka, district };
            // One village at a time per worker; a large village's tiles run one after another.
            const result = await delineateArea(
              { type: "Feature", geometry: feature.geometry, properties: { name: props.name, taluka, district } },
              {
                maxKm2: MAX_DELINEATION_AREA_KM2,
                signal,
                concurrency: 1,
                onProgress: ({ pct, message }) => setVillageProgress({ pct, message }),
              },
            );
            if (signal.aborted) return;
            const saved = saveDetection(props, result, {
              geometry: feature.geometry,
              km2: turf.area(feature) / 1e6,
              wholeVillage: true,
              censusCode: v.census_code,
            });
            if (result.failedTiles) {
              // Partial result is saved; the village stays "to do" so Continue retries it.
              update((r) => ({
                ...r,
                done: r.done + 1,
                fields: r.fields + saved.features.length,
                failed: [...r.failed, { name, error: `${result.failedTiles} of ${result.tiles} tiles failed (partial result saved)` }],
              }));
            } else {
              talukaDoneRef.current.add(doneKey(v));
              update((r) => ({ ...r, done: r.done + 1, fields: r.fields + saved.features.length }));
            }
          } catch (e) {
            if (signal.aborted) return;
            update((r) => ({ ...r, done: r.done + 1, failed: [...r.failed, { name, error: e.message || "failed" }] }));
          } finally {
            update((r) => ({ ...r, current: r.current.filter((c) => c.name !== name) }));
          }
        }
      };
      await Promise.all(Array.from({ length: TALUKA_CONCURRENCY }, worker));
      if (!signal.aborted) setTalukaRun((r) => (r ? { ...r, running: false, current: [] } : r));
    },
    [saveDetection],
  );

  const stopTaluka = useCallback(() => {
    talukaAbortRef.current?.abort();
    talukaAbortRef.current = null;
    setTalukaRun((r) => (r ? { ...r, running: false, stopped: true, current: [] } : r));
  }, []);

  const dismissTaluka = useCallback(() => {
    talukaAbortRef.current?.abort();
    talukaAbortRef.current = null;
    setTalukaRun(IDLE_TALUKA_RUN);
  }, []);

  /**
   * Re-opens a saved detection: selects its village (boundary looked up by census code, else
   * by a point inside one of its fields) and makes its fields the active result, so it can be
   * classified / monitored like a fresh run.
   */
  const openSaved = useCallback(
    async (id) => {
      const row = savedRef.current.find((r) => String(r.id) === String(id));
      if (!row?.fields?.features?.length) return;
      abortInFlight();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setError("");
      setStep("loadingVillage");
      try {
        const { name, taluka, district, censusCode } = row.village || {};
        let feature = null;
        if (censusCode) {
          feature = await fetchVillageByName({ district, taluka, name, censusCode }, { signal: ctrl.signal }).catch(
            () => null,
          );
        }
        if (!feature && !ctrl.signal.aborted) {
          const [lng, lat] = turf.pointOnFeature(row.fields.features[0]).geometry.coordinates;
          feature = await fetchVillageBoundary(lat, lng, "village", { signal: ctrl.signal });
        }
        if (ctrl.signal.aborted) return;
        if (!feature) throw new Error(`Could not find the boundary of ${name || "this village"}.`);
        setVillage(feature);
        setArea(null);
        setFields(row.fields);
        setStep("done");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e?.message || "Could not open this detection.");
        setStep("idle");
      }
    },
    [abortInFlight],
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
    openSaved,
    talukaRun,
    detectTaluka,
    stopTaluka,
    dismissTaluka,
    removeSaved,
    clearSaved,
  };
}
