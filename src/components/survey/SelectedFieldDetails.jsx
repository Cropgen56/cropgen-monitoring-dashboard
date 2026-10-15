import React, { useMemo } from "react";
import { Activity, MapPin, Ruler, Sprout } from "lucide-react";
import { ACRES_PER_HA } from "../../utils/delineationStats";
import {
  cropCandidates,
  cropClassificationColor,
} from "../../utils/cropClassificationColors";

function formatScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return "—";
  return `${Math.round(score <= 1 ? score * 100 : score)}%`;
}

function getTemporalSamples(prediction) {
  const samples = prediction?.temporal_signature;
  if (!Array.isArray(samples)) return [];
  return samples
    .map((sample) => ({
      label: sample.date || sample.month || sample.period || "",
      value: Number(sample.ndvi),
    }))
    .filter((sample) => Number.isFinite(sample.value));
}

function Metric({ icon, label, value, accent = false }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0d1319] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {React.createElement(icon, { className: "h-3.5 w-3.5 text-lime-300/70" })}
        {label}
      </div>
      <p className={`mt-2 text-lg font-semibold tabular-nums ${accent ? "text-lime-200" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

export default function SelectedFieldDetails({ selected, prediction }) {
  const properties = selected?.feature?.properties || {};
  const candidates = useMemo(() => cropCandidates(prediction), [prediction]);
  const candidateTotal = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
  const temporalSamples = useMemo(() => getTemporalSamples(prediction), [prediction]);
  const areaHa = Number(properties.area_ha);
  const perimeter = Number(properties.perimeter_m);
  const topCrop = prediction?.best_crop || "";
  const bestScore = prediction?.best_score ?? prediction?.score;
  const yieldPrediction = prediction?.yield_prediction;
  const estimatedYield = yieldPrediction?.estimated_yield_tonnes == null
    ? NaN
    : Number(yieldPrediction.estimated_yield_tonnes);
  const yieldDeficit = yieldPrediction?.yield_deficit_pct == null
    ? NaN
    : Number(yieldPrediction.yield_deficit_pct);

  let stop = 0;
  const pieGradient = candidates.length
    ? `conic-gradient(${candidates
        .map((candidate) => {
          const from = stop;
          stop += (candidate.score / candidateTotal) * 100;
          return `${cropClassificationColor(candidate.crop).fill} ${from.toFixed(1)}% ${stop.toFixed(1)}%`;
        })
        .join(", ")})`
    : "conic-gradient(#2c3740 0% 100%)";

  const chartPoints = useMemo(() => {
    if (temporalSamples.length < 2) return "";
    const min = Math.min(...temporalSamples.map((sample) => sample.value));
    const range = Math.max(...temporalSamples.map((sample) => sample.value)) - min || 1;
    return temporalSamples
      .map((sample, index) => {
        const x = (index / (temporalSamples.length - 1)) * 100;
        const y = 34 - ((sample.value - min) / range) * 28;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [temporalSamples]);

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300/70">
            Farm intelligence
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-white">
            {selected ? `Field #${properties.field_id ?? "—"}` : "Selected farm details"}
          </h3>
        </div>
        {selected && (
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[10px] text-gray-400">
            <MapPin className="h-3 w-3 text-lime-300" />
            {[selected.village?.name || properties.village, selected.village?.district || properties.district]
              .filter(Boolean)
              .join(" · ") || "Village details unavailable"}
          </div>
        )}
      </div>

      {!selected ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <Sprout className="h-6 w-6 text-lime-300/50" />
          <p className="text-xs font-semibold text-gray-300">Choose a farm to explore its profile</p>
          <p className="max-w-md text-[11px] leading-relaxed text-gray-500">
            Click a field on the map or select a row in the detected fields table to see its boundary,
            area, and crop insights here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(250px,0.75fr)]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              icon={Ruler}
              label="Area"
              value={Number.isFinite(areaHa) ? `${areaHa.toFixed(2)} ha` : "—"}
            />
            <Metric
              icon={Ruler}
              label="Area · acres"
              value={Number.isFinite(areaHa) ? `${(areaHa * ACRES_PER_HA).toFixed(2)} ac` : "—"}
            />
            <Metric
              icon={Activity}
              label="Perimeter"
              value={Number.isFinite(perimeter) ? `${Math.round(perimeter).toLocaleString("en-IN")} m` : "—"}
            />
            <Metric
              icon={Sprout}
              label={topCrop ? "Leading crop" : "Crop status"}
              value={topCrop || "Not classified"}
              accent={Boolean(topCrop)}
            />
            {prediction?.season_label || prediction?.season ? (
              <div className="col-span-2 rounded-xl border border-white/[0.06] bg-[#0d1319] p-3 sm:col-span-4">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Classified season
                </p>
                <p className="mt-1 text-sm font-semibold text-yellow-100">
                  {prediction.season_label || prediction.season}
                </p>
              </div>
            ) : null}

            {yieldPrediction && (
              <>
                <Metric
                  icon={Sprout}
                  label="Predicted yield"
                  value={Number.isFinite(estimatedYield) ? `${estimatedYield.toFixed(1)} tonnes` : "—"}
                  accent
                />
                <Metric
                  icon={Activity}
                  label="Yield deficit"
                  value={Number.isFinite(yieldDeficit) ? `${yieldDeficit.toFixed(1)}%` : "—"}
                />
                {yieldPrediction.damage_category && (
                  <div className="col-span-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3 sm:col-span-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Yield impact
                    </p>
                    <p className="mt-1 text-sm font-semibold text-amber-100">
                      {yieldPrediction.damage_category}
                      {yieldPrediction.crop ? ` · ${yieldPrediction.crop}` : ""}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="col-span-2 rounded-xl border border-white/[0.06] bg-[#0d1319] p-3 sm:col-span-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Boundary information
                </p>
                <span className="text-[10px] text-gray-400">
                  {properties.district || selected.village?.district || "District unavailable"}
                  {properties.taluka || selected.village?.taluka
                    ? ` · ${properties.taluka || selected.village?.taluka}`
                    : ""}
                </span>
              </div>
              <p className="mt-2 break-all font-mono text-[11px] text-gray-300">
                Field ID {properties.field_id ?? "—"}
                {properties.detectionId ? ` · Detection ${properties.detectionId}` : ""}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-[#0d1319] p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Crop composition
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    {topCrop || "Classification pending"}
                  </p>
                </div>
                {topCrop && (
                  <span className="rounded-full border border-lime-300/15 bg-lime-300/[0.08] px-2 py-1 text-[10px] text-lime-200">
                    Confidence {formatScore(bestScore)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div
                  aria-label="Crop candidate likelihood chart"
                  className="grid h-[86px] w-[86px] flex-none place-items-center rounded-full"
                  style={{ background: pieGradient }}
                >
                  <div className="grid h-[48px] w-[48px] place-items-center rounded-full bg-[#0d1319] text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                      {candidates.length ? "Mix" : "No data"}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {candidates.length ? candidates.map((candidate) => {
                    const share = (candidate.score / candidateTotal) * 100;
                    const color = cropClassificationColor(candidate.crop);
                    return (
                      <div key={candidate.crop}>
                        <div className="mb-0.5 flex justify-between gap-2 text-[10px]">
                          <span className="truncate text-gray-300">{candidate.crop}</span>
                          <span className="shrink-0 tabular-nums text-gray-400">{share.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${share}%`, backgroundColor: color.fill }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-[10px] leading-relaxed text-gray-500">
                      Run crop classification to view the leading crop and candidate likelihoods.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {chartPoints && (
              <div className="rounded-xl border border-white/[0.06] bg-[#0d1319] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    <Activity className="h-3.5 w-3.5 text-lime-300/70" />
                    Vegetation trend · NDVI
                  </div>
                  <span className="text-[9px] text-gray-600">{temporalSamples.length} observations</span>
                </div>
                <svg
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="NDVI trend across satellite observations"
                  className="h-16 w-full overflow-visible"
                >
                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#a3b66b"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
