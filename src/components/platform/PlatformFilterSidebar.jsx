import React from "react";
import Panel from "../ui/Panel";

/**
 * Shared geography + crop filters for Survey and Admin pages.
 * @param {'survey' | 'admin'} variant — which extra control blocks to show
 */
export default function PlatformFilterSidebar({
  variant,
  district,
  setDistrict,
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

      <Panel title="Geography (District-wise)" bodyClassName="mt-3 space-y-3">
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
      </Panel>

      {variant === "admin" && (
        <Panel title="Map overlay" bodyClassName="mt-3 space-y-2">
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
            Area outline (KML districts: Jalna/Washim)
          </label>
        </Panel>
      )}

      {variant === "survey" && (
        <Panel title="Survey layers" bodyClassName="mt-3 space-y-2">
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
        </Panel>
      )}
    </aside>
  );
}
