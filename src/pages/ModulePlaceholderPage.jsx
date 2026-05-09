import React from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import DocumentAIMock from "../components/governance/DocumentAIMock";
import { downloadCsv, buildFarmerExportRows, buildDistrictGovernanceRows } from "../utils/reportExport";
import { getAlertsFeed } from "../data/agriStateData";

/**
 * Lightweight module shells matching sidebar until full feature parity.
 */
export default function ModulePlaceholderPage({ title, subtitle, children }) {
  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] text-gray-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function VerificationsModulePage() {
  const s = useAgriPlatform();
  return (
    <ModulePlaceholderPage
      title="Smart verification"
      subtitle="Declared vs AI-detected crop, land linkage, and risk flags for loaded parcels."
    >
      <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4 text-[13px] text-gray-400">
        <p>
          Open <strong className="text-white">Farmer Mapping</strong> and select a plot to view verification
          scores in the side panel. Export verification columns from Reports or the Action Center.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-cg-accent/90 px-4 py-2 text-xs font-bold text-[#0c2214]"
          onClick={() =>
            downloadCsv(`verification-${s.district || "all"}.csv`, buildFarmerExportRows(s.filteredPlots))
          }
        >
          Download verification CSV
        </button>
      </div>
    </ModulePlaceholderPage>
  );
}

export function SchemesModulePage() {
  return (
    <ModulePlaceholderPage
      title="Schemes & benefits"
      subtitle="Enrollment, approvals, and subsidy workflows — use Farmer Mapping → Schemes for interactive demo."
    >
      <p className="text-gray-500 text-sm">
        Navigate to <strong className="text-gray-300">Farmer Mapping</strong> in the sidebar and switch to the
        Schemes tab in the admin workspace, or open the full <strong className="text-gray-300">Admin</strong> page.
      </p>
    </ModulePlaceholderPage>
  );
}

export function InsuranceModulePage() {
  return (
    <ModulePlaceholderPage
      title="Insurance (PMFBY)"
      subtitle="Policy coverage, claims, and anomaly flags."
    >
      <p className="text-gray-500 text-sm">
        PMFBY blocks are available on farmer profiles under Farmer Mapping and in the Alerts feed.
      </p>
    </ModulePlaceholderPage>
  );
}

export function GrievancesModulePage() {
  const rows = [
    { id: "GRV-1042", issue: "Insurance claim not received", farmer: "Ramesh Jadhav", status: "Open", age: "5d" },
    { id: "GRV-1041", issue: "Subsidy amount mismatch", farmer: "Sangita Rathod", status: "In progress", age: "2d" },
    { id: "GRV-1038", issue: "Incorrect crop code on 7/12 linkage", farmer: "Dilip Wankhede", status: "Resolved", age: "12d" },
  ];
  return (
    <ModulePlaceholderPage title="Grievance management" subtitle="Tickets and resolution tracking (demo).">
      <div className="flex gap-2 mb-4">
        {["All", "Open", "In progress", "Resolved"].map((t) => (
          <button
            key={t}
            type="button"
            className="rounded-lg border border-white/10 bg-[#111820] px-3 py-1.5 text-[11px] font-semibold text-gray-300"
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#111820] px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">{r.issue}</p>
              <p className="text-[11px] text-gray-500">
                {r.farmer} · {r.id}
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                r.status === "Open"
                  ? "bg-orange-500/20 text-orange-200"
                  : r.status === "Resolved"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-amber-500/20 text-amber-200"
              }`}
            >
              {r.status}
            </span>
            <span className="text-[10px] text-gray-600">{r.age}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-4 w-full rounded-xl border border-dashed border-white/20 py-3 text-[12px] font-semibold text-gray-400 hover:bg-white/5"
      >
        + New grievance
      </button>
    </ModulePlaceholderPage>
  );
}

export function ReportsModulePage() {
  const s = useAgriPlatform();
  return (
    <ModulePlaceholderPage
      title="Reports & analytics"
      subtitle="Configure exports — PDF/Excel would attach to the same datasets in production."
    >
      <div className="rounded-xl border border-white/[0.08] bg-[#111820] p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
            <option>District impact report</option>
            <option>Farmer verification report</option>
            <option>Crop stress report</option>
          </select>
          <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
            <option>{s.district || "All districts"}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-red-500/80 px-3 py-2 text-xs font-bold text-white"
            onClick={() => alert("PDF export would run server-side in production.")}
          >
            PDF
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-600/80 px-3 py-2 text-xs font-bold text-white"
            onClick={() => alert("Excel export would run server-side in production.")}
          >
            Excel
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-xs font-bold text-white"
            onClick={() =>
              downloadCsv(`report-${s.district || "all"}.csv`, buildFarmerExportRows(s.filteredPlots))
            }
          >
            CSV
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-xs font-bold text-white"
            onClick={() =>
              downloadCsv(`district-${s.district || "all"}.csv`, buildDistrictGovernanceRows(s.governanceRollup, s.district))
            }
          >
            District roll-up CSV
          </button>
        </div>
        <DocumentAIMock />
      </div>
    </ModulePlaceholderPage>
  );
}

export function AlertsModulePage() {
  const s = useAgriPlatform();
  const list = getAlertsFeed(s.district);
  return (
    <ModulePlaceholderPage title="Alerts & notifications" subtitle="AI and system alerts for the selected district.">
      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id} className="rounded-xl border border-white/[0.08] bg-[#111820] p-4 text-sm text-gray-300">
            <span className="text-[10px] font-bold uppercase text-gray-500">{a.type}</span>
            <p className="mt-1">{a.detail}</p>
            <p className="mt-2 text-[10px] text-gray-600">{a.source}</p>
          </li>
        ))}
      </ul>
    </ModulePlaceholderPage>
  );
}

export function ActionsModulePage() {
  return (
    <ModulePlaceholderPage title="Action center" subtitle="Desk workflows and batch operations.">
      <div className="grid sm:grid-cols-2 gap-3">
        {["Generate district report", "Trigger field verification", "Send advisory", "Approve scheme batch"].map(
          (x) => (
            <button
              key={x}
              type="button"
              className="rounded-xl border border-cg-accent/30 bg-cg-accent/10 py-4 text-sm font-semibold text-cg-accent hover:bg-cg-accent/20"
            >
              {x}
            </button>
          ),
        )}
      </div>
    </ModulePlaceholderPage>
  );
}

export function UsersModulePage() {
  return (
    <ModulePlaceholderPage
      title="User management"
      subtitle="Role-based access for state, district, and block officers (not wired in demo)."
    >
      <p className="text-gray-500 text-sm">Contact your administrator to provision accounts.</p>
    </ModulePlaceholderPage>
  );
}

export function SettingsModulePage() {
  return (
    <ModulePlaceholderPage title="System settings" subtitle="Integrations, API keys, and feature flags (demo).">
      <p className="text-gray-500 text-sm">No persistent settings in this prototype.</p>
    </ModulePlaceholderPage>
  );
}
