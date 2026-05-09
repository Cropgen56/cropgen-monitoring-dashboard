import React from "react";
import {
  User,
  MapPin,
  Sprout,
  IndianRupee,
  Brain,
  History,
  Droplets,
  Bug,
} from "lucide-react";
import { formatINR } from "../../utils/formatINR";

function row(label, value, valueClass = "text-white text-right text-xs") {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={`min-w-0 break-words ${valueClass}`}>{value}</dd>
    </div>
  );
}

/**
 * Farmer 360° intelligence — governance scope (demo data from plot props).
 */
export default function Farmer360Panel({ p, district }) {
  if (!p) return null;

  const loan = p.cropLoan;
  const ins = p.insurance;
  const hist = p.cropHistory || {};

  return (
    <div className="rounded-2xl border border-cg-accent/25 bg-gradient-to-b from-[#0a180f] to-[#060d08] p-4 shadow-lg space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Brain className="h-5 w-5 text-cg-accent shrink-0" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cg-accent">
            Farmer 360° intelligence
          </p>
          <p className="text-[11px] text-gray-500">Unified profile for verification &amp; intervention</p>
        </div>
      </div>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 mb-2">
          <User className="h-3.5 w-3.5 text-sky-400" />
          Farmer
        </h4>
        <dl className="space-y-1.5 rounded-xl border border-white/5 bg-black/25 p-3">
          {row("Farmer ID", p.farmerId || p._id, "font-mono text-[10px] text-right")}
          {row("Name", p.farmerName)}
          {row("Mobile", p.mobile, "font-mono text-[10px] text-gray-400 text-right blur-[2.5px]")}
          {row("Aadhaar", p.aadhaarMasked || "XXXX XXXX —", "font-mono text-[10px] text-right")}
          {row("Village / Taluka", `${p.village || "—"}, ${p.taluka || "—"}`)}
          {row("District", p.district || district)}
        </dl>
      </section>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 mb-2">
          <MapPin className="h-3.5 w-3.5 text-amber-400" />
          Land
        </h4>
        <dl className="space-y-1.5 rounded-xl border border-white/5 bg-black/25 p-3">
          {row("Survey / Gat", `${p.surveyNo || "—"} · ${p.gatNo || "—"}`)}
          {row("Area", `${p.area_ha} ha`)}
          {row("Irrigation", p.irrigationType)}
          <p className="text-[10px] text-gray-600 pt-1">GIS polygon linked to this parcel (demo).</p>
        </dl>
      </section>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 mb-2">
          <Sprout className="h-3.5 w-3.5 text-lime-400" />
          Crop
        </h4>
        <dl className="space-y-1.5 rounded-xl border border-white/5 bg-black/25 p-3">
          {row("Current crop", p.cropType)}
          {row("Declared vs AI", `${p.declaredCrop || p.cropType} / ${p.aiDetectedCrop || "—"}`)}
          {row("Sowing date", p.sowingDate || "—")}
          {row("Crop stage", p.cropStage || "Vegetative–reproductive (demo)")}
          {row("Season", p.soilHealth?.cropAge != null ? `Kharif · ~${p.soilHealth.cropAge} DAS` : "Kharif")}
        </dl>
        {Object.keys(hist).length > 0 && (
          <p className="mt-2 text-[10px] text-gray-500">
            History:{" "}
            {Object.entries(hist)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([y, c]) => `${y}: ${c}`)
              .join(" · ")}
          </p>
        )}
      </section>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 mb-2">
          <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
          Financial
        </h4>
        <dl className="space-y-1.5 rounded-xl border border-white/5 bg-black/25 p-3">
          {row(
            "Crop loan",
            loan?.availed ? formatINR(loan.amountINR) : "Not availed / N/A",
            "text-right text-emerald-200",
          )}
          {row(
            "PMFBY",
            ins ? `${ins.scheme || "PMFBY"} · ${ins.claimed ? "Claim filed" : "No claim"}` : "—",
          )}
          {row(
            "Schemes (MahaDBT)",
            Array.isArray(p.schemesMahadbt) && p.schemesMahadbt.length
              ? p.schemesMahadbt.map((s) => s.name).join(", ")
              : "None on record (demo)",
          )}
        </dl>
      </section>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 mb-2">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
          AI intelligence
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
            <p className="text-[9px] text-gray-500">Impact score</p>
            <p className="text-lg font-bold text-amber-200">{p.governanceImpactScore ?? "—"}</p>
            <p className="text-[9px] text-gray-400">{p.governanceImpactLabel}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
            <p className="text-[9px] text-gray-500">Crop health %</p>
            <p className="text-lg font-bold text-lime-300">{p.cropHealthPercent ?? "—"}</p>
            <p className="text-[9px] text-gray-400">{p.cropHealth}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
            <p className="text-[9px] text-gray-500 flex items-center justify-center gap-0.5">
              <Bug className="h-3 w-3" /> Disease risk
            </p>
            <p className="text-lg font-bold text-orange-300">{p.governanceDiseaseRisk ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
            <p className="text-[9px] text-gray-500 flex items-center justify-center gap-0.5">
              <Droplets className="h-3 w-3" /> Water stress
            </p>
            <p className="text-lg font-bold text-sky-300">{p.droughtClass || "—"}</p>
          </div>
        </div>
        <dl className="mt-2 space-y-1 rounded-xl border border-white/5 bg-black/20 p-3">
          {row("Yield risk (AI)", `${p.governanceYieldRisk ?? "—"}/100`)}
          {row("Rainfall deviation", `${p.governanceRainfallDeviationPct ?? "—"}% (vs normal)`)}
          {row("Predicted yield", `${p.predictedYieldTonPerAcre ?? p.aiYield ?? "—"} t/ac`)}
        </dl>
      </section>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 mb-2">
          <History className="h-3.5 w-3.5 text-gray-400" />
          Timeline (demo)
        </h4>
        <ul className="space-y-2 text-[10px] text-gray-400 border-l border-white/10 pl-3">
          <li>
            <span className="text-gray-500">Prior crop</span> — {hist[2025] || "—"} (2025)
          </li>
          <li>
            <span className="text-gray-500">Insurance</span> —{" "}
            {ins?.claimed ? "Claim event on file" : "No prior claim in snapshot"}
          </li>
          <li>
            <span className="text-gray-500">Loan</span> —{" "}
            {loan?.availed ? "KCC / crop loan active" : "No active loan flag"}
          </li>
        </ul>
      </section>
    </div>
  );
}
