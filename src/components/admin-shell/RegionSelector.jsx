import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import SearchSelect from "./SearchSelect";
import { useAgriPlatform } from "../../context/AgriPlatformContext";
import { useFieldDelineationContext } from "../../context/FieldDelineationContext";
import { fetchDistricts, fetchTalukas, fetchVillages, fetchVillageByName } from "../../api/boundaryApi";
import { toDatasetDistrict, toOutlineDistrict } from "../../config/districtNames";

const villageKey = (name, code) => `${code}|${name ?? ""}`;

/** Loads a list whenever `deps` change; `load` returning null clears it. */
function useRemoteList(load, deps) {
  const [state, setState] = useState({ rows: [], loading: false, error: "" });
  useEffect(() => {
    const ctrl = new AbortController();
    const pending = load(ctrl.signal);
    if (!pending) {
      setState({ rows: [], loading: false, error: "" });
      return undefined;
    }
    setState({ rows: [], loading: true, error: "" });
    pending
      .then((rows) => !ctrl.signal.aborted && setState({ rows, loading: false, error: "" }))
      .catch((e) => !ctrl.signal.aborted && setState({ rows: [], loading: false, error: e.message || "Failed to load" }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/**
 * District → taluka → village picker. Every name comes from the village-boundary
 * API's own dataset, so a picked village always resolves to its exact boundary.
 * Stays in sync with villages picked by clicking the map.
 */
export default function RegionSelector() {
  const { district, setDistrict, taluka, setTaluka } = useAgriPlatform();
  const { village, showVillage, reset } = useFieldDelineationContext();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const resolveAbort = useRef(null);

  const dataDistrict = toDatasetDistrict(district);
  const vp = village?.properties || {};

  const districts = useRemoteList((signal) => fetchDistricts({ signal }), []);
  const talukas = useRemoteList(
    (signal) => (dataDistrict ? fetchTalukas(dataDistrict, { signal }) : null),
    [dataDistrict],
  );
  const villages = useRemoteList(
    (signal) => (dataDistrict && taluka ? fetchVillages(dataDistrict, taluka, { signal }) : null),
    [dataDistrict, taluka],
  );

  // A village picked on the map (or elsewhere) moves the district/taluka pickers to it.
  const districtRef = useRef(dataDistrict);
  const talukaRef = useRef(taluka);
  districtRef.current = dataDistrict;
  talukaRef.current = taluka;
  useEffect(() => {
    if (!village?.properties?.district) return;
    const { district: d, taluka: t } = village.properties;
    const districtChanged = d !== districtRef.current;
    // setDistrict clears the taluka, so re-set it even when the name is unchanged
    // (taluka names repeat across districts, e.g. Khed).
    if (districtChanged) setDistrict(toOutlineDistrict(d));
    if (t && (districtChanged || t !== talukaRef.current)) setTaluka(t);
  }, [village, setDistrict, setTaluka]);

  // Re-selecting the village's own district (e.g. clicking it on the map) clears the
  // taluka while the village stays selected; put the village's taluka back.
  useEffect(() => {
    const vprops = village?.properties;
    if (vprops?.taluka && !taluka && vprops.district === dataDistrict) setTaluka(vprops.taluka);
  }, [village, taluka, dataDistrict, setTaluka]);

  useEffect(() => () => resolveAbort.current?.abort(), []);

  const districtOptions = useMemo(
    () =>
      districts.rows.map((r) => ({
        value: r.name,
        label: r.display_name,
        hint: r.display_name !== r.name ? `Census: ${r.name}` : `${r.village_count.toLocaleString()} villages`,
        search: `${r.display_name} ${r.name}`,
      })),
    [districts.rows],
  );

  const talukaOptions = useMemo(
    () => talukas.rows.map((r) => ({ value: r.name, label: r.name, hint: `${r.village_count} villages` })),
    [talukas.rows],
  );

  const villageOptions = useMemo(
    () =>
      villages.rows.map((r) => ({
        value: villageKey(r.name, r.census_code),
        label: r.name || "Unnamed village",
        hint: r.duplicate_name || !r.name ? `code ${r.census_code}` : undefined,
        search: `${r.name || "unnamed"} ${r.census_code}`,
      })),
    [villages.rows],
  );

  const selectedVillage =
    vp.district === dataDistrict && vp.taluka === taluka && vp.census_code ? villageKey(vp.name, vp.census_code) : "";

  const cancelResolve = () => {
    resolveAbort.current?.abort();
    setResolving(false);
    setError("");
  };

  const onDistrict = (name) => {
    cancelResolve();
    if (vp.district && vp.district !== name) reset();
    setDistrict(toOutlineDistrict(name));
  };

  const onTaluka = (name) => {
    cancelResolve();
    if (vp.taluka && vp.taluka !== name) reset();
    setTaluka(name);
  };

  const onVillage = async (key) => {
    const row = villages.rows.find((r) => villageKey(r.name, r.census_code) === key);
    if (!row) return;
    cancelResolve();
    const ctrl = new AbortController();
    resolveAbort.current = ctrl;
    setResolving(true);
    try {
      const feature = await fetchVillageByName(
        { district: dataDistrict, taluka, name: row.name, censusCode: row.census_code },
        { signal: ctrl.signal },
      );
      if (!ctrl.signal.aborted) showVillage(feature);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e.message || "Could not load the village boundary.");
    } finally {
      if (!ctrl.signal.aborted) setResolving(false);
    }
  };

  const listError = districts.error || talukas.error || villages.error;

  return (
    <div className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:gap-2 lg:flex lg:w-auto lg:items-center">
      <MapPin className="hidden h-4 w-4 shrink-0 text-cg-accent/90 xl:block" aria-hidden />
      <SearchSelect
        label="District"
        placeholder="All Maharashtra"
        options={districtOptions}
        value={dataDistrict}
        onChange={onDistrict}
        loading={districts.loading}
        disabled={!!districts.error}
        className="lg:w-[150px] xl:w-[190px]"
      />
      <SearchSelect
        label="Taluka"
        placeholder={dataDistrict ? "Choose taluka" : "Pick district first"}
        options={talukaOptions}
        value={taluka}
        onChange={onTaluka}
        loading={talukas.loading}
        disabled={!dataDistrict || talukas.loading}
        className="lg:w-[130px] xl:w-[160px]"
      />
      <SearchSelect
        label="Village"
        placeholder={taluka ? "Choose village" : "Pick taluka first"}
        options={villageOptions}
        value={selectedVillage}
        onChange={onVillage}
        loading={villages.loading || resolving}
        disabled={!taluka || villages.loading}
        className="lg:w-[150px] xl:w-[190px]"
      />
      {(error || listError) && (
        <span
          className="col-span-3 truncate rounded-md lg:col-span-1 lg:max-w-[160px] border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-100"
          title={error || listError}
          role="alert"
        >
          {error || `Region lists unavailable: ${listError}`}
        </span>
      )}
    </div>
  );
}
