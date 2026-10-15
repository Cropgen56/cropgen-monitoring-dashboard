import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { ACRES_PER_HA, fieldAreaHa } from "../../utils/delineationStats";
import { fieldPredictionForId } from "../../utils/cropClassificationColors";

const thCls = "px-3 py-2 font-bold";
const tdCls = "px-3 py-2";

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-[12px] text-gray-500">
        {children}
      </td>
    </tr>
  );
}

function TableShell({ title, subtitle, actions, children }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="custom-scrollbar max-h-[420px] overflow-auto">
        <table className="w-full text-left text-[11px]">{children}</table>
      </div>
    </div>
  );
}

const EMPTY_HINT = "No fields detected yet — search a place or pick a village on the map, then draw an area.";

/** One row per saved detection run (village + drawn area). */
export function DetectionsByVillageTable({ detections, onRemove }) {
  return (
    <TableShell title="Detections by village" subtitle="Each row is one area run through the field boundary model.">
      <thead className="sticky top-0 bg-[#0d1219] text-[10px] uppercase tracking-wide text-gray-500">
        <tr>
          <th className={thCls}>Village</th>
          <th className={thCls}>Taluka · District</th>
          <th className={`${thCls} text-right`}>Fields</th>
          <th className={`${thCls} text-right`}>Area (ha)</th>
          <th className={`${thCls} text-right`}>Avg field (ac)</th>
          <th className={thCls}>Detected</th>
          {onRemove && <th className={thCls} />}
        </tr>
      </thead>
      <tbody>
        {detections.length === 0 && <EmptyRow colSpan={onRemove ? 7 : 6}>{EMPTY_HINT}</EmptyRow>}
        {detections.map((r) => {
          const count = r.fields.features.length;
          const ha = r.fields.features.reduce((sum, f) => sum + fieldAreaHa(f), 0);
          return (
            <tr key={r.id} className="border-t border-white/[0.05] text-gray-300">
              <td className={`${tdCls} font-semibold text-white`}>{r.village?.name || "—"}</td>
              <td className={tdCls}>
                {r.village?.taluka || "—"} · {r.village?.district || "—"}
              </td>
              <td className={`${tdCls} text-right tabular-nums`}>{count}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{ha.toFixed(2)}</td>
              <td className={`${tdCls} text-right tabular-nums`}>
                {count ? ((ha / count) * ACRES_PER_HA).toFixed(2) : "—"}
              </td>
              <td className={`${tdCls} text-gray-500`}>
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
              </td>
              {onRemove && (
                <td className={tdCls}>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="text-gray-500 hover:text-red-300"
                    aria-label={`Remove detection for ${r.village?.name || "area"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}

const MAX_FIELD_ROWS = 500;

/** One row per detected field polygon. */
export function DetectedFieldsTable({
  detections,
  actions,
  selectedFieldKey = "",
  onSelectField,
  fieldClassifications = {},
  classificationDetectionId = "",
}) {
  const rows = useMemo(
    () =>
      detections.flatMap((r) =>
        r.fields.features.map((feature) => ({
          key: `${r.id}:${feature.properties?.field_id}`,
          detectionId: r.id,
          feature,
          village: r.village,
          p: feature.properties || {},
        })),
      ),
    [detections],
  );

  return (
    <TableShell
      title="Detected fields"
      subtitle={
        rows.length > MAX_FIELD_ROWS
          ? `Showing first ${MAX_FIELD_ROWS} of ${rows.length} fields — download GeoJSON for all.`
          : `${rows.length} field${rows.length === 1 ? "" : "s"}`
      }
      actions={actions}
    >
      <thead className="sticky top-0 bg-[#0d1219] text-[10px] uppercase tracking-wide text-gray-500">
        <tr>
          <th className={thCls}>Field</th>
          <th className={thCls}>Village</th>
          <th className={`${thCls} text-right`}>Area (ha)</th>
          <th className={`${thCls} text-right`}>Area (ac)</th>
          <th className={`${thCls} text-right`}>Perimeter (m)</th>
          <th className={thCls}>Classified crop</th>
          <th className={`${thCls} text-right`}>Predicted yield (t)</th>
          <th className={`${thCls} text-right`}>Yield deficit</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow colSpan={8}>{EMPTY_HINT}</EmptyRow>}
        {rows.slice(0, MAX_FIELD_ROWS).map(({ key, detectionId, feature, village, p }) => {
          const ha = Number(p.area_ha) || 0;
          const prediction = detectionId === String(classificationDetectionId)
            ? fieldPredictionForId(fieldClassifications, p.field_id)
            : null;
          const yieldPrediction = prediction?.yield_prediction;
          const estimatedYield = yieldPrediction?.estimated_yield_tonnes == null
            ? NaN
            : Number(yieldPrediction.estimated_yield_tonnes);
          const yieldDeficit = yieldPrediction?.yield_deficit_pct == null
            ? NaN
            : Number(yieldPrediction.yield_deficit_pct);
          return (
            <tr
              key={key}
              role={onSelectField ? "button" : undefined}
              tabIndex={onSelectField ? 0 : undefined}
              aria-pressed={onSelectField ? key === selectedFieldKey : undefined}
              aria-label={onSelectField ? `View details for field ${p.field_id ?? ""}` : undefined}
              onClick={() => onSelectField?.({ key, feature, village, detectionId })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectField?.({ key, feature, village, detectionId });
                }
              }}
              className={`border-t border-white/[0.05] text-gray-300 ${
                onSelectField
                  ? "cursor-pointer transition-colors hover:bg-lime-300/[0.06] focus:bg-lime-300/[0.08] focus:outline-none"
                  : ""
              } ${key === selectedFieldKey ? "bg-lime-300/[0.08]" : ""}`}
            >
              <td className={`${tdCls} font-mono text-white`}>#{p.field_id ?? "—"}</td>
              <td className={tdCls}>
                {village?.name || "—"}
                <span className="text-gray-500"> · {village?.district || "—"}</span>
              </td>
              <td className={`${tdCls} text-right tabular-nums`}>{ha.toFixed(3)}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{(ha * ACRES_PER_HA).toFixed(2)}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{Math.round(Number(p.perimeter_m) || 0)}</td>
              <td className={`${tdCls} font-medium ${prediction ? "text-lime-200" : "text-gray-600"}`}>
                {prediction?.best_crop || "Not classified"}
              </td>
              <td className={`${tdCls} text-right tabular-nums text-gray-300`}>
                {Number.isFinite(estimatedYield) ? estimatedYield.toFixed(1) : "—"}
              </td>
              <td className={`${tdCls} text-right tabular-nums text-gray-300`}>
                {Number.isFinite(yieldDeficit) ? `${yieldDeficit.toFixed(1)}%` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}
