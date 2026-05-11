import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Contact2, Plus, Search, Trash2, Download, ChevronDown, ChevronRight } from "lucide-react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import FarmerProfileTabs from "../components/admin-shell/FarmerProfileTabs";
import { downloadCsv, buildFarmerExportRows } from "../utils/reportExport";
import {
  loadManualFarmers,
  addManualFarmer,
  deleteManualFarmer,
  emptyFarmerFormDefaults,
} from "../utils/farmerRegistryStorage";
import {
  getFarmerRegistrySeedRows,
  filterSeedRowsByDistrict,
  FARMER_REGISTRY_SEED_COUNT,
} from "../data/farmerRegistrySeed";

const PAGE_SIZE = 80;

function plotFeaturesToRows(fc) {
  const feats =
    fc?.features?.filter(
      (f) => f?.properties?.layerType !== "district" && f?.geometry,
    ) || [];
  return feats.map((f) => {
    const p = { ...(f.properties || {}) };
    const plotId = p._id ?? p.id;
    return {
      ...p,
      _source: "map",
      _plotId: plotId != null ? String(plotId) : null,
    };
  });
}

function rowKey(r) {
  if (r._registryId) return `m:${r._registryId}`;
  if (r._registrySeedId) return `s:${r._registrySeedId}`;
  if (r._plotId) return `p:${r._plotId}`;
  return `f:${r.farmerId || r.farmerName || Math.random()}`;
}

function renderValue(v, depth = 0) {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    if (depth > 4) return JSON.stringify(v);
    return (
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-gray-400">
        {v.slice(0, 40).map((item, i) => (
          <li key={i}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
        ))}
        {v.length > 40 ? <li>… +{v.length - 40} more</li> : null}
      </ul>
    );
  }
  if (typeof v === "object") {
    const entries = Object.entries(v);
    if (entries.length === 0) return "—";
    if (depth > 5) return JSON.stringify(v);
    return (
      <dl className="mt-1 space-y-1 border-l border-white/[0.08] pl-2">
        {entries.map(([k, val]) => (
          <div key={k}>
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{k}</dt>
            <dd className="text-[11px] text-gray-300">{renderValue(val, depth + 1)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return String(v);
}

function AllFieldsPanel({ data }) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    return Object.keys(data)
      .sort((a, b) => a.localeCompare(b))
      .map((k) => [k, data[k]]);
  }, [data]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d1219]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[11px] font-bold text-gray-300 hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          All fields (raw record)
        </span>
        <span className="text-[10px] font-normal text-gray-500">{entries.length} keys</span>
      </button>
      {open && (
        <div className="custom-scrollbar max-h-[320px] overflow-y-auto border-t border-white/[0.06] p-3 space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-black/25 px-2 py-1.5">
              <p className="font-mono text-[10px] text-cg-accent/90">{k}</p>
              <div className="mt-0.5 break-words text-[11px] text-gray-300">{renderValue(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FarmersRegistryPage() {
  const s = useAgriPlatform();
  const [manual, setManual] = useState(() => loadManualFarmers());
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedKey, setSelectedKey] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(() => emptyFarmerFormDefaults());

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      district: prev.district || s.district || "",
      taluka: prev.taluka || (s.talukaOptions?.[0] ?? ""),
    }));
  }, [s.district, s.talukaOptions]);

  const mapRows = useMemo(() => plotFeaturesToRows(s.filteredPlots), [s.filteredPlots]);

  const seedRows = useMemo(
    () => filterSeedRowsByDistrict(getFarmerRegistrySeedRows(), s.district),
    [s.district],
  );

  const allRows = useMemo(() => {
    const manualNorm = manual.map((p) => ({
      ...p,
      _source: "manual",
      _plotId: p._registryId,
    }));
    const seedNorm = seedRows.map((p) => ({
      ...p,
      _source: "seed",
      _plotId: p._id != null ? String(p._id) : p._registrySeedId,
    }));
    return [...manualNorm, ...seedNorm, ...mapRows];
  }, [manual, seedRows, mapRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      [
        r.farmerName,
        r.name,
        r.farmerId,
        r.village,
        r.taluka,
        r.district,
        r.cropType,
        r.surveyNo,
        r.clusterId,
        r._plotId,
      ].some((v) => String(v || "").toLowerCase().includes(q)),
    );
  }, [allRows, query]);

  useEffect(() => {
    setPage(0);
  }, [query, s.district, s.filteredPlots]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return filtered.find((r) => rowKey(r) === selectedKey) || null;
  }, [filtered, selectedKey]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !filtered.some((r) => rowKey(r) === selectedKey)) {
      setSelectedKey(rowKey(filtered[0]));
    }
  }, [filtered, selectedKey]);

  const profileForTabs = useMemo(() => {
    if (!selected) return null;
    const {
      _source,
      _plotId,
      _registryId,
      _savedAt,
      _registrySource,
      _registrySeedId,
      _registrySeedBatch,
      ...rest
    } = selected;
    return rest;
  }, [selected]);

  const handleAdd = useCallback(
    (e) => {
      e.preventDefault();
      const loanAmt = form.cropLoanAmountINR === "" ? 0 : Number(form.cropLoanAmountINR);
      const record = {
        farmerName: form.farmerName.trim(),
        farmerId: form.farmerId.trim() || `FR-MH-${Date.now().toString().slice(-8)}`,
        mobile: form.mobile.trim(),
        aadhaarMasked: form.aadhaarMasked.trim(),
        preferredLanguage: form.preferredLanguage.trim() || "mr",
        village: form.village.trim(),
        taluka: form.taluka.trim(),
        district: form.district.trim(),
        surveyNo: form.surveyNo.trim(),
        gatNo: form.gatNo.trim(),
        area_ha: form.area_ha === "" ? "" : String(form.area_ha),
        cropType: form.cropType.trim() || "Soybean",
        irrigationType: form.irrigationType.trim() || "Rainfed",
        sowingDate: form.sowingDate.trim(),
        clusterId: form.clusterId.trim(),
        name: form.name.trim() || `${form.cropType} · ${form.taluka || "plot"} · manual`,
        cropHealth: form.cropHealth.trim(),
        cropHealthPercent: form.cropHealthPercent === "" ? "" : Number(form.cropHealthPercent),
        governanceImpactScore:
          form.governanceImpactScore === "" ? undefined : Number(form.governanceImpactScore),
        governanceImpactLabel: form.governanceImpactLabel.trim(),
        governanceDiseaseRisk:
          form.governanceDiseaseRisk === "" ? undefined : Number(form.governanceDiseaseRisk),
        predictedYieldTonPerAcre:
          form.predictedYieldTonPerAcre === "" ? undefined : Number(form.predictedYieldTonPerAcre),
        surveyNdviHealth:
          form.surveyNdviHealth === "" ? undefined : Number(form.surveyNdviHealth),
        cropLoan: {
          availed: !!form.cropLoanAvailed,
          amountINR: Number.isFinite(loanAmt) ? loanAmt : 0,
        },
        insurance: {
          claimed: !!form.insuranceClaimed,
          scheme: form.insuranceScheme.trim() || "PMFBY",
          season: form.insuranceSeason.trim() || "Kharif 2026",
        },
        schemesMahadbt: form.schemesNote.trim()
          ? [{ name: form.schemesNote.trim(), status: "noted" }]
          : [],
        registryNotes: form.notes.trim(),
      };
      if (!record.farmerName) return;
      const next = addManualFarmer(record);
      setManual(next);
      setShowAdd(false);
      setForm({ ...emptyFarmerFormDefaults(), district: s.district || "" });
      setSelectedKey(`m:${next[0]._registryId}`);
    },
    [form, s.district],
  );

  const handleDeleteManual = useCallback(() => {
    if (!selected || selected._source !== "manual" || !selected._registryId) return;
    if (!window.confirm("Remove this manually added farmer from the registry?")) return;
    const next = deleteManualFarmer(selected._registryId);
    setManual(next);
    setSelectedKey(null);
  }, [selected]);

  const fcForExport = useMemo(() => {
    const features = filtered.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { ...r },
    }));
    return { type: "FeatureCollection", features };
  }, [filtered]);

  return (
    <div className="p-5 md:p-6 max-w-[1920px] mx-auto space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <Contact2 className="h-6 w-6 text-cg-accent" />
            Farmer registry
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-gray-500">
            <strong className="text-gray-300">{FARMER_REGISTRY_SEED_COUNT.toLocaleString("en-IN")}</strong> demo
            farmers: crop and district follow the Maharashtra major-crops profile (Vidarbha cotton, Jalgaon banana,
            etc.), each with a <strong className="text-gray-400">unique name</strong>. Scoped by Quick filters
            district. Map parcels and manual saves (
            <span className="text-gray-400">localStorage</span>) merge below the seed list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#111820] px-3 py-2 text-[12px] font-semibold text-gray-200 hover:bg-white/[0.04]"
            onClick={() =>
              downloadCsv(`farmer-registry-${s.district || "all"}.csv`, buildFarmerExportRows(fcForExport))
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-cg-accent/90 px-3 py-2 text-[12px] font-bold text-[#0c2214] hover:bg-cg-accent"
            onClick={() => setShowAdd((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            {showAdd ? "Close form" : "Add farmer"}
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-cg-accent/25 bg-[#111820] p-4 shadow-lg space-y-4"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cg-accent">New farmer record</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["farmerName", "Farmer name *", "text", true],
              ["farmerId", "Farmer ID", "text", false],
              ["mobile", "Mobile", "text", false],
              ["aadhaarMasked", "Aadhaar (masked)", "text", false],
              ["preferredLanguage", "Language code (mr/hi/en)", "text", false],
              ["district", "District", "text", false],
              ["taluka", "Taluka", "text", false],
              ["village", "Village", "text", false],
              ["surveyNo", "Survey no.", "text", false],
              ["gatNo", "Gat / subdivision", "text", false],
              ["area_ha", "Area (ha)", "text", false],
              ["cropType", "Crop", "text", false],
              ["irrigationType", "Irrigation", "text", false],
              ["sowingDate", "Sowing date", "text", false],
              ["clusterId", "Cluster ID", "text", false],
              ["name", "Plot label / map title", "text", false],
              ["cropHealth", "Crop health label", "text", false],
              ["cropHealthPercent", "Crop health %", "text", false],
              ["governanceImpactScore", "Impact score", "text", false],
              ["governanceImpactLabel", "Impact band", "text", false],
              ["governanceDiseaseRisk", "Disease risk", "text", false],
              ["predictedYieldTonPerAcre", "Yield (t/ac)", "text", false],
              ["surveyNdviHealth", "NDVI", "text", false],
              ["insuranceScheme", "Insurance scheme", "text", false],
              ["insuranceSeason", "Insurance season", "text", false],
              ["schemesNote", "Scheme / subsidy note", "text", false],
              ["notes", "Internal notes", "text", false],
            ].map(([key, label, type]) => (
              <label key={key} className="block text-[11px]">
                <span className="mb-1 block text-gray-500">{label}</span>
                <input
                  type={type}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0d1219] px-2.5 py-2 text-[12px] text-gray-200 outline-none focus:border-cg-accent/50"
                  value={String(form[key] ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-[12px]">
            <label className="inline-flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={!!form.cropLoanAvailed}
                onChange={(e) => setForm((f) => ({ ...f, cropLoanAvailed: e.target.checked }))}
              />
              Crop loan availed
            </label>
            <label className="inline-flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={!!form.insuranceClaimed}
                onChange={(e) => setForm((f) => ({ ...f, insuranceClaimed: e.target.checked }))}
              />
              Insurance claim filed
            </label>
            <label className="inline-flex items-center gap-2 text-gray-300">
              <span className="text-gray-500">Loan amount (₹)</span>
              <input
                type="text"
                className="w-28 rounded border border-white/[0.08] bg-[#0d1219] px-2 py-1 text-[12px]"
                value={form.cropLoanAmountINR}
                onChange={(e) => setForm((f) => ({ ...f, cropLoanAmountINR: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-cg-accent px-4 py-2 text-[12px] font-bold text-[#0c2214] disabled:opacity-50"
              disabled={!form.farmerName?.trim()}
            >
              Save to registry
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-[12px] text-gray-400 hover:bg-white/[0.04]"
              onClick={() => setForm({ ...emptyFarmerFormDefaults(), district: s.district || "" })}
            >
              Reset
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Search name, ID, village, district, crop…"
            className="w-full rounded-lg border border-white/[0.08] bg-[#111820] py-2 pl-9 pr-3 text-[12px] text-gray-200 outline-none focus:border-cg-accent/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="text-[12px] text-gray-500">
          <span className="tabular-nums text-gray-300">{filtered.length}</span> record
          {filtered.length !== 1 ? "s" : ""}
          {" · "}
          <span className="tabular-nums text-sky-300/90">{seedRows.length}</span> seed
          {manual.length ? (
            <>
              {" "}
              · <span className="text-cg-accent/90">{manual.length}</span> manual
            </>
          ) : null}
          {" · "}
          scope: <span className="text-gray-300">{s.district || "All Maharashtra"}</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-2 space-y-2">
          <div className="rounded-xl border border-white/[0.08] bg-[#111820] overflow-hidden">
            <div className="custom-scrollbar max-h-[min(70vh,640px)] overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 z-[1] bg-[#0d1219] text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Farmer</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Crop</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const k = rowKey(r);
                    const active = k === selectedKey;
                    return (
                      <tr
                        key={k}
                        className={`cursor-pointer border-t border-white/[0.05] ${
                          active ? "bg-cg-accent/10" : "hover:bg-white/[0.03]"
                        }`}
                        onClick={() => setSelectedKey(k)}
                      >
                        <td className="px-3 py-2">
                          <p className="font-semibold text-gray-100">{r.farmerName || r.name || "—"}</p>
                          <p className="font-mono text-[10px] text-gray-500">{r.farmerId || r._plotId || "—"}</p>
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {r.village || "—"}
                          <br />
                          <span className="text-gray-500">{r.taluka || "—"} · {r.district || "—"}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-300">{r.cropType || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              r._source === "manual"
                                ? "bg-amber-500/20 text-amber-200"
                                : r._source === "seed"
                                  ? "bg-sky-500/20 text-sky-200"
                                  : "bg-emerald-500/15 text-emerald-200"
                            }`}
                          >
                            {r._source === "manual" ? "Manual" : r._source === "seed" ? "Seed" : "Map"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2 text-[11px] text-gray-500">
                <button
                  type="button"
                  className="rounded px-2 py-1 hover:bg-white/[0.06] disabled:opacity-40"
                  disabled={pageSafe <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span className="tabular-nums">
                  Page {pageSafe + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  className="rounded px-2 py-1 hover:bg-white/[0.06] disabled:opacity-40"
                  disabled={pageSafe >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {selected && profileForTabs ? (
            <>
              {selected._source === "manual" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDeleteManual}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove manual record
                  </button>
                </div>
              )}
              <FarmerProfileTabs profile={profileForTabs} district={s.district} />
              <AllFieldsPanel data={selected} />
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-8 text-center text-[13px] text-gray-500">
              Select a row to view full farmer data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
