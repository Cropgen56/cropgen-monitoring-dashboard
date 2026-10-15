import React, { useMemo } from "react";
import { Activity, BarChart3, Satellite, Sprout } from "lucide-react";
import { cropClassificationColor } from "../../utils/cropClassificationColors";

function formatNumber(value, digits = 0) {
  if (value == null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) : "—";
}

function InsightMetric({ label, value, note, icon: Icon, accent = "lime" }) {
  const accentClass = accent === "amber" ? "text-amber-200" : "text-lime-200";
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0c1319] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {React.createElement(Icon, { className: `h-4 w-4 ${accentClass} opacity-80` })}
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums ${accentClass}`}>{value}</p>
      {note && <p className="mt-1 text-[10px] text-gray-500">{note}</p>}
    </div>
  );
}

export default function CropClassificationInsights({ insights, predictions, villageName }) {
  const classifiedCrops = useMemo(() => {
    const counts = new Map();
    Object.values(predictions || {}).forEach((prediction) => {
      const crop = String(prediction?.best_crop || "").trim();
      if (crop) counts.set(crop, (counts.get(crop) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([crop, count]) => ({ crop, count }))
      .sort((a, b) => b.count - a.count || a.crop.localeCompare(b.crop));
  }, [predictions]);

  if (!insights) return null;

  const drought = insights.droughtAssessment || {};
  const cropMix = insights.cropMix.length ? insights.cropMix : classifiedCrops;
  const cropCountTotal = cropMix.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const temporalPeriod = insights.temporalPeriod;

  return (
    <section className="overflow-hidden rounded-2xl border border-lime-300/15 bg-gradient-to-br from-[#111a17] via-[#101820] to-[#111820] shadow-xl shadow-black/20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-lime-200">
            <BarChart3 className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Classification overview</p>
          </div>
          <h2 className="mt-1 text-base font-bold text-white">
            {villageName || "Village crop insights"}
          </h2>
          {temporalPeriod?.start_date && temporalPeriod?.end_date && (
            <p className="mt-1 text-[10px] text-gray-500">
              Observation window · {temporalPeriod.start_date} – {temporalPeriod.end_date}
            </p>
          )}
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
          insights.satelliteStatus === "available"
            ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200"
            : "border-amber-300/20 bg-amber-300/[0.08] text-amber-100"
        }`}>
          <Satellite className="h-3.5 w-3.5" />
          Satellite {insights.satelliteStatus || "status unavailable"}
        </div>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightMetric
          label="Dominant crop"
          value={insights.dominantCrop || "—"}
          note={insights.dominantShare == null
            ? "Village-wide leading classification"
            : `${formatNumber(Number(insights.dominantShare) * 100)}% of crop evidence`}
          icon={Sprout}
        />
        <InsightMetric
          label="Fields analyzed"
          value={formatNumber(insights.fieldCount)}
          note={`${formatNumber(insights.satelliteFieldCount)} with satellite matches`}
          icon={BarChart3}
        />
        <InsightMetric
          label="Average yield deficit"
          value={drought.average_yield_deficit_pct == null
            ? "—"
            : `${formatNumber(drought.average_yield_deficit_pct, 1)}%`}
          note={drought.is_trigger1_drought_area ? "Drought trigger detected" : "No drought trigger detected"}
          icon={Activity}
          accent="amber"
        />
        <InsightMetric
          label="Estimated production loss"
          value={drought.total_production_loss_tonnes == null
            ? "—"
            : `${formatNumber(drought.total_production_loss_tonnes, 1)} t`}
          note={`${formatNumber(insights.completeSensorFieldCount)} fields with complete sensor data`}
          icon={Activity}
        />

        <div className="rounded-xl border border-white/[0.07] bg-[#0c1319] p-4 sm:col-span-2 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Village crop mix</p>
              <p className="mt-1 text-[10px] text-gray-600">Share of classified fields by leading crop</p>
            </div>
            <span className="text-[10px] text-gray-500">{cropMix.length} crop groups</span>
          </div>
          {cropMix.length ? (
            <div className="space-y-3">
              {cropMix.slice(0, 6).map((item) => {
                const color = cropClassificationColor(item.crop);
                const count = Number(item.count) || 0;
                const share = item.share == null
                  ? count / Math.max(1, cropCountTotal)
                  : Number(item.share);
                const width = Math.max(0, Math.min(100, share * 100));
                return (
                  <div key={item.crop}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                      <span className="flex min-w-0 items-center gap-2 capitalize text-gray-200">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color.fill }} />
                        <span className="truncate">{item.crop}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-gray-400">
                        {formatNumber(count)} fields · {formatNumber(share * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">No crop-mix details were returned.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#0c1319] p-4 sm:col-span-2 xl:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Damage breakdown</p>
          <div className="mt-3 space-y-2">
            {Object.entries(drought.damage_breakdown || {}).length ? (
              Object.entries(drought.damage_breakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="capitalize text-gray-400">{category}</span>
                  <span className="font-semibold tabular-nums text-white">{formatNumber(count)} fields</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-500">No damage categories returned.</p>
            )}
          </div>
          {drought.district && <p className="mt-3 text-[10px] text-gray-500">{drought.district}{drought.taluka ? ` · ${drought.taluka}` : ""}</p>}
        </div>

        {insights.summary && (
          <p className="text-[10px] leading-relaxed text-gray-500 sm:col-span-2 xl:col-span-4">
            {insights.summary}
          </p>
        )}
      </div>
    </section>
  );
}
