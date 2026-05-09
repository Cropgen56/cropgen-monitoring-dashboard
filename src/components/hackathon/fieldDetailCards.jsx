import React from "react";
import { Leaf } from "lucide-react";
import { BANANA_CROP_IMAGE_URL, SOYBEAN_CROP_IMAGE_URL } from "../../data/cropAssets";

function isSoybeanCropName(ct) {
  const c = String(ct || "").toLowerCase();
  return c === "soybean" || c === "soyabean";
}

function isBananaCropName(ct) {
  return String(ct || "").toLowerCase() === "banana";
}

export function CropHealthCard({ p }) {
  if (!p) return null;
  const pct = Math.min(
    100,
    Math.max(0, Math.round(Number(p.cropHealthPercent) || 0)),
  );
  const area = Number(p.area_ha);
  const areaStr = Number.isFinite(area) ? area.toFixed(2) : "—";

  return (
    <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md shadow-black/30">
      <h3 className="text-sm font-bold text-white">Crop Health</h3>
      <div className="mt-3 grid grid-cols-[96px_1fr] gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {isSoybeanCropName(p.cropType) ? (
            <img
              src={SOYBEAN_CROP_IMAGE_URL}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : isBananaCropName(p.cropType) ? (
            <img
              src={BANANA_CROP_IMAGE_URL}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-900/35 to-lime-950/50">
              <Leaf className="h-9 w-9 text-cg-accent/85" />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1 text-[11px] leading-snug">
          <p className="flex justify-between gap-2 text-white/95">
            <span className="text-gray-500">Major Crop</span>
            <span className="font-semibold text-white text-right">{p.cropType || "—"}</span>
          </p>
          <p className="flex justify-between gap-2 text-white/95">
            <span className="text-gray-500">Total Area</span>
            <span className="font-semibold text-white text-right">{areaStr} ha</span>
          </p>
          <p className="pt-1 text-[11px] text-gray-400">Overall Crop Health</p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-[26px] font-bold leading-none tracking-tight text-white">
              {pct}%
            </span>
            <span className="max-w-[140px] text-[10px] text-gray-500">
              Based on vegetation / NDVI index
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.35)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SoilAnalysisCard({ p }) {
  const s = p?.soilHealth;
  if (!s) return null;
  return (
    <div className="rounded-2xl border border-[#1a3a22] bg-[#0a180f] p-4 shadow-md shadow-black/30">
      <h3 className="text-sm font-bold text-white">Soil analysis</h3>
      <dl className="mt-3 space-y-2 text-xs text-gray-300">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">Soil status</dt>
          <dd className="font-medium text-white text-right">{s.healthStatus}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">Health score</dt>
          <dd className="text-white text-right">{s.healthPercentage}%</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">AI / standard yield</dt>
          <dd className="text-right">
            {s.aiYield} / {s.standardYield}
          </dd>
        </div>
      </dl>
    </div>
  );
}
