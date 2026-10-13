import React, { useState } from "react";
import { User } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "land", label: "Land & Crop" },
  { id: "finance", label: "Finance & Schemes" },
];

function row(label, value) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-right text-gray-200 font-medium min-w-0 break-words">{value}</span>
    </div>
  );
}

/** Read-only view of a farmer record entered in the registry. */
export default function FarmerProfileTabs({ profile }) {
  const [tab, setTab] = useState("overview");
  const p = profile || {};

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl border border-white/[0.08] bg-[#111820] shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cg-accent/30 to-emerald-900/50 text-cg-accent">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-white leading-tight">{p.farmerName || "—"}</h2>
            <p className="mt-0.5 font-mono text-[10px] text-gray-500">{p.farmerId || "—"}</p>
            <p className="text-[11px] text-gray-500">
              {p.mobile ? "•••• •••• " + String(p.mobile).slice(-2) : "No mobile on file"}
            </p>
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
            {row("District", p.district || "—")}
            {row("Village / Taluka", `${p.village || "—"}, ${p.taluka || "—"}`)}
            {row("Current crop", p.cropType || "—")}
            {row("Preferred language", p.preferredLanguage || "—")}
          </>
        )}

        {tab === "land" && (
          <>
            {row("Survey No.", p.surveyNo || "—")}
            {row("Gat / subdivision", p.gatNo || "—")}
            {row("Area", p.area_ha ? `${p.area_ha} ha` : "—")}
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
            {row(
              "Insurance",
              p.insurance?.scheme
                ? `${p.insurance.scheme}${p.insurance.season ? ` · ${p.insurance.season}` : ""}${p.insurance.claimed ? " · claim filed" : ""}`
                : "—",
            )}
            {row(
              "Schemes",
              Array.isArray(p.schemesMahadbt) && p.schemesMahadbt.length
                ? p.schemesMahadbt.map((s) => s.name).join(", ")
                : "—",
            )}
          </>
        )}
      </div>
    </div>
  );
}
