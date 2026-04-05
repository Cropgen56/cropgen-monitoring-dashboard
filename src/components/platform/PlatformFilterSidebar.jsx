import React from "react";
import { stateSummary, cropFilters } from "../../data/agriStateData";
import { SOYBEAN_CROP_IMAGE_URL } from "../../data/cropAssets";

/**
 * Shared geography + crop filters for Survey and Admin pages.
 * @param {'survey' | 'admin'} variant — which extra control blocks to show
 */
export default function PlatformFilterSidebar({
  variant,
  district,
  setDistrict,
  taluka,
  setTaluka,
  village,
  setVillage,
  villageFilter,
  setVillageFilter,
  crop,
  setCrop,
  season,
  setSeason,
  year,
  setYear,
  talukaOptions,
  villageOptions,
  districtVillageCount,
  villagesByDistrictCatalog,
  MAHARASHTRA_DISTRICTS,
  adminMapLayer,
  setAdminMapLayer,
  showVillageBoundary,
  setShowVillageBoundary,
  surveyMapLayer,
  setSurveyMapLayer,
  showValidation,
  setShowValidation,
}) {
  return (
    <aside className="custom-scrollbar lg:col-span-3 space-y-3 lg:max-h-[min(78vh,680px)] lg:overflow-y-auto">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 px-0.5">
        Scope &amp; filters
      </p>

      <div className="rounded-xl border border-[#1a3a22] bg-[#0a120d]/95 p-4 space-y-3 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Geography</h3>
        <label className="block text-[11px] text-gray-500">District</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#071008] px-3 py-2 text-sm text-white"
        >
          <option value="">Maharashtra (all)</option>
          {MAHARASHTRA_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <label className="block text-[11px] text-gray-500">Taluka</label>
        <select
          value={taluka}
          onChange={(e) => setTaluka(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#071008] px-3 py-2 text-sm text-white"
          disabled={!district}
        >
          <option value="">All talukas</option>
          {talukaOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="block text-[11px] text-gray-500">Village (searchable)</label>
        <input
          type="search"
          value={villageFilter}
          onChange={(e) => setVillageFilter(e.target.value)}
          disabled={!district}
          placeholder="Type to filter…"
          className="mb-3 w-full rounded-lg border border-white/10 bg-[#071008] px-3 py-2 text-sm text-white placeholder:text-gray-500 disabled:opacity-40"
        />
        <select
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#071008] px-3 py-2 text-sm text-white"
          disabled={!district}
        >
          <option value="">All villages</option>
          {villageOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {district && villagesByDistrictCatalog && districtVillageCount === 0 && (
          <p className="text-[10px] text-amber-200/90">
            No village list for this district in the bundle.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[#1a3a22] bg-[#0a120d]/95 p-4 space-y-3 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Crop &amp; time</h3>
        <label className="block text-[11px] text-gray-500">Crop</label>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#071008] px-3 py-2 text-sm text-white"
        >
          <option value="">All crops</option>
          {cropFilters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {crop === "Soybean" && (
          <div className="mt-2 overflow-hidden rounded-lg border border-green-900/40 bg-black/20">
            <img
              src={SOYBEAN_CROP_IMAGE_URL}
              alt="Soybean"
              className="h-24 w-full object-cover object-center"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-gray-500">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#071008] px-2 py-2 text-xs text-white"
            >
              {stateSummary.seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#071008] px-2 py-2 text-xs text-white"
            >
              {stateSummary.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {variant === "admin" && (
        <div className="rounded-xl border border-[#1a3a22] bg-[#0a120d]/95 p-4 space-y-2 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Map overlay</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="admLayer"
              checked={adminMapLayer === "default"}
              onChange={() => setAdminMapLayer("default")}
            />
            Crop health (green / yellow / red)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="admLayer"
              checked={adminMapLayer === "risk"}
              onChange={() => setAdminMapLayer("risk")}
            />
            AI risk zones
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={showVillageBoundary}
              onChange={(e) => setShowVillageBoundary(e.target.checked)}
            />
            Area outline (demo cluster)
          </label>
        </div>
      )}

      {variant === "survey" && (
        <div className="rounded-xl border border-[#1a3a22] bg-[#0a120d]/95 p-4 space-y-2 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Survey layers</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="svLayer"
              checked={surveyMapLayer === "crop_class"}
              onChange={() => setSurveyMapLayer("crop_class")}
            />
            Crop classification
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="svLayer"
              checked={surveyMapLayer === "ndvi"}
              onChange={() => setSurveyMapLayer("ndvi")}
            />
            NDVI health
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="svLayer"
              checked={surveyMapLayer === "drought"}
              onChange={() => setSurveyMapLayer("drought")}
            />
            Drought &amp; stress
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={showValidation}
              onChange={(e) => setShowValidation(e.target.checked)}
            />
            Survey validation points (Jalgaon demo)
          </label>
        </div>
      )}
    </aside>
  );
}
