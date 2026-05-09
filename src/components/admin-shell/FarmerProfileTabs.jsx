import React, { useState } from "react";
import { BadgeCheck, User } from "lucide-react";
import { BANANA_CROP_IMAGE_URL, SOYBEAN_CROP_IMAGE_URL } from "../../data/cropAssets";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "land", label: "Land & Crop" },
  { id: "finance", label: "Finance & Schemes" },
  { id: "ai", label: "AI Intelligence" },
];

function row(label, value) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-right text-gray-200 font-medium min-w-0 break-words">{value}</span>
    </div>
  );
}

export default function FarmerProfileTabs({ profile, district }) {
  const [tab, setTab] = useState("overview");
  const p = profile || {};
  const name = p.farmerName || "—";
  const fid = p.farmerId || p._id || "—";
  const crop = String(p.cropType || "").toLowerCase();
  const banner =
    crop === "banana" ? BANANA_CROP_IMAGE_URL : SOYBEAN_CROP_IMAGE_URL;

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-white/[0.08] bg-[#111820] shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cg-accent/30 to-emerald-900/50 text-cg-accent">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-bold text-white leading-tight">{name}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-gray-500">{fid}</p>
            <p className="text-[11px] text-gray-500">{p.mobile ? "•••• •••• " + String(p.mobile).slice(-2) : "Contact on file"}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1 rounded-lg bg-black/30 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-2 py-2 text-[10px] font-semibold transition sm:text-[11px] ${
                tab === t.id
                  ? "bg-cg-accent/20 text-cg-accent shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
        {tab === "overview" && (
          <>
            {row("District", p.district || district || "—")}
            {row("Village / Taluka", `${p.village || "—"}, ${p.taluka || "—"}`)}
            {row("Current crop", p.cropType || "—")}
            <div className="mt-2 overflow-hidden rounded-lg border border-white/[0.06]">
              <img src={banner} alt="" className="h-24 w-full object-cover object-center opacity-90" />
              <p className="bg-black/50 px-2 py-1 text-[10px] text-gray-400">Satellite preview (demo)</p>
            </div>
          </>
        )}

        {tab === "land" && (
          <>
            {row("Survey No.", p.surveyNo || "—")}
            {row("Gat / subdivision", p.gatNo || "—")}
            {row("Area", p.area_ha != null ? `${p.area_ha} ha` : "—")}
            {row("Irrigation", p.irrigationType || "—")}
            {row("Sowing date", p.sowingDate || "—")}
          </>
        )}

        {tab === "finance" && (
          <>
            {row(
              "Crop loan",
              p.cropLoan?.availed ? `Active · ₹${Number(p.cropLoan.amountINR).toLocaleString("en-IN")}` : "Not availed",
            )}
            {row("PMFBY", p.insurance?.claimed ? "Claim filed" : "No claim (snapshot)")}
            {row(
              "Schemes",
              Array.isArray(p.schemesMahadbt) && p.schemesMahadbt.length
                ? p.schemesMahadbt.map((s) => s.name).join(", ")
                : "—",
            )}
          </>
        )}

        {tab === "ai" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
              <p className="text-[10px] font-bold uppercase text-amber-200/90">AI intelligence summary</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-gray-500">Crop health</p>
                  <p className="text-lg font-bold text-lime-300">{p.cropHealthPercent ?? "—"}/100</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500">Disease risk</p>
                  <p className="text-lg font-bold text-orange-300">
                    {p.governanceDiseaseRisk != null
                      ? p.governanceDiseaseRisk >= 60
                        ? "High"
                        : "Medium"
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
            {row("Impact score", `${p.governanceImpactScore ?? "—"} (${p.governanceImpactLabel || "—"})`)}
            {row(
              "Yield prediction",
              p.predictedYieldTonPerAcre != null
                ? `${p.predictedYieldTonPerAcre} t/ac (~${(Number(p.predictedYieldTonPerAcre) * 10).toFixed(1)} q/ha est.)`
                : "—",
            )}
            {row("NDVI (canopy)", p.surveyNdviHealth ?? p.avgNDVI ?? "—")}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <button
          type="button"
          className="w-full rounded-lg border border-cg-accent/40 bg-cg-accent/10 py-2.5 text-[12px] font-bold text-cg-accent hover:bg-cg-accent/20"
        >
          View full farmer report
        </button>
      </div>
    </div>
  );
}
