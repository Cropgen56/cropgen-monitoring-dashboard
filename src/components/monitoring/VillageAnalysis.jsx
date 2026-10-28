import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Download,
  FileText,
  Info,
  Loader2,
  Map as MapIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ALERT_RULES, CHANGE_BANDS, COLOR_MODES, HEALTH_BANDS, SEVERITY, farmLabel } from "../../utils/villageAnalysis";
import { downloadFarmsCsv, downloadFarmsGeoJson, openPrintableReport } from "../../utils/villageReport";

const fmt = (v, d = 2) => (Number.isFinite(v) ? Number(v).toFixed(d) : "—");

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Kpi({ label, value, sub, tone = "text-white", icon }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c1218] p-3.5">
      <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        {icon && React.createElement(icon, { className: "h-3.5 w-3.5 text-gray-500" })}
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, icon, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-white/[0.06] bg-[#0c1218] ${className}`}>
      <header className="flex items-center gap-2 border-b border-white/[0.05] px-3.5 py-2.5">
        {React.createElement(icon, { className: "h-4 w-4 text-cg-accent" })}
        <div className="min-w-0">
          <h4 className="text-[12px] font-bold text-white">{title}</h4>
          {subtitle && <p className="truncate text-[10px] text-gray-500">{subtitle}</p>}
        </div>
      </header>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function BandTable({ rows, showPct }) {
  const total = rows.reduce((s, r) => s + r.areaHa, 0) || 1;
  return (
    <>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
        {rows.map((r) => (
          <span key={r.id} style={{ width: `${(r.areaHa / total) * 100}%`, background: r.color }} />
        ))}
      </div>
      <table className="mt-3 w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-wide text-gray-500">
            <th className="pb-1.5 text-left font-semibold">Class</th>
            <th className="pb-1.5 text-right font-semibold">Farms</th>
            <th className="pb-1.5 text-right font-semibold">Area</th>
            {showPct && <th className="pb-1.5 text-right font-semibold">Share</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/[0.04]">
              <td className="py-1.5">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: r.color }} />
                <span className="text-gray-200">{r.label}</span>
              </td>
              <td className="py-1.5 text-right tabular-nums text-gray-300">{r.farms}</td>
              <td className="py-1.5 text-right tabular-nums text-gray-400">{fmt(r.areaHa, 1)} ha</td>
              {showPct && <td className="py-1.5 text-right tabular-nums text-gray-400">{r.pct.toFixed(0)}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/**
 * Government-facing village view: health summary, alerts, change between two dates,
 * map colouring and report exports. Pure presentation over `analysis` (see utils/villageAnalysis).
 */
export default function VillageAnalysis({ analysis, meta, loading, error, colorMode, onColorMode, onSelectFarm, selectedKey }) {
  const [showMethod, setShowMethod] = useState(false);
  const [exportError, setExportError] = useState("");

  if (!analysis && !loading && !error) return null;

  const s = analysis?.summary;
  const compare = Boolean(meta?.compareDate);

  const runExport = (fn) => {
    setExportError("");
    try {
      fn(analysis, meta);
    } catch (e) {
      setExportError(e.message || "Export failed.");
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg" aria-live="polite">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cg-accent">Village analysis</p>
          <h3 className="mt-0.5 text-[15px] font-bold text-white">
            {[meta?.village, meta?.taluka, meta?.district].filter(Boolean).join(" · ") || "Selected village"}
          </h3>
          <p className="text-[10px] text-gray-500">
            NDVI {formatDate(meta?.date)}
            {compare && <> compared with {formatDate(meta.compareDate)}</>} · Sentinel-2, 10 m
          </p>
        </div>
        {analysis && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-[#0c1218] p-0.5" role="radiogroup" aria-label="Map colouring">
              <MapIcon className="mx-1.5 h-3.5 w-3.5 self-center text-gray-500" aria-hidden />
              {COLOR_MODES.filter((m) => m.id !== "change" || compare).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={colorMode === m.id}
                  onClick={() => onColorMode(m.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    colorMode === m.id ? "bg-cg-accent/20 text-cg-accent" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => runExport(openPrintableReport)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cg-accent px-3 py-1.5 text-[11px] font-bold text-[#0c2214] hover:brightness-110"
            >
              <FileText className="h-3.5 w-3.5" /> Report (PDF)
            </button>
            <button
              type="button"
              onClick={() => runExport(downloadFarmsCsv)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => runExport(downloadFarmsGeoJson)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" /> GeoJSON
            </button>
          </div>
        )}
      </header>

      <div className="space-y-4 p-4">
        {loading && (
          <p className="flex items-center gap-2 text-[12px] text-emerald-200/80" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> {loading}
          </p>
        )}
        {(error || exportError) && (
          <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">
            {error || exportError}
          </p>
        )}

        {analysis && (
          <>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Kpi
                icon={Activity}
                label="Village health score"
                value={s.score ?? "—"}
                sub={s.health ? `${s.health.label} · mean NDVI ${fmt(s.meanNdvi)}` : "No clear data"}
                tone={!s.health ? "text-gray-300" : s.score >= 55 ? "text-lime-300" : s.score >= 35 ? "text-amber-200" : "text-red-300"}
              />
              <Kpi icon={BarChart3} label="Farms analysed" value={`${s.measuredFarms}/${s.totalFarms}`} sub={`${fmt(s.areaHa, 1)} ha with clear data`} />
              <Kpi
                icon={AlertTriangle}
                label="Farms needing attention"
                value={s.highAlerts + s.mediumAlerts}
                sub={`${s.highAlerts} high · ${s.mediumAlerts} medium · ${fmt(s.areaAtRiskHa, 1)} ha`}
                tone={s.highAlerts ? "text-red-300" : s.mediumAlerts ? "text-amber-200" : "text-lime-300"}
              />
              <Kpi
                icon={s.meanChangePct < 0 ? TrendingDown : TrendingUp}
                label="Average NDVI change"
                value={Number.isFinite(s.meanChangePct) ? `${s.meanChangePct > 0 ? "+" : ""}${s.meanChangePct.toFixed(1)}%` : "—"}
                sub={compare ? `since ${formatDate(meta.compareDate)}` : "No compare date"}
                tone={!Number.isFinite(s.meanChangePct) ? "text-gray-300" : s.meanChangePct <= -10 ? "text-red-300" : s.meanChangePct >= 10 ? "text-lime-300" : "text-white"}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card icon={BarChart3} title="Crop health distribution" subtitle="Farms by mean NDVI">
                <BandTable rows={analysis.distribution} showPct />
              </Card>

              <Card
                icon={TrendingDown}
                title="Before / after"
                subtitle={compare ? `${formatDate(meta.compareDate)} → ${formatDate(meta.date)}` : "Choose a compare date"}
              >
                {compare ? (
                  analysis.summary.comparedFarms ? (
                    <BandTable rows={analysis.changeDistribution.map((b) => ({ ...b, pct: 0 }))} />
                  ) : (
                    <p className="text-[11px] text-gray-400">No farm had clear data on both dates.</p>
                  )
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Pick a “Compare with” date in the Field index panel to see each farm’s NDVI change.
                  </p>
                )}
              </Card>

              <Card icon={AlertTriangle} title={`Farms needing attention (${analysis.alerted.length})`} subtitle="Most severe first · click to view">
                {analysis.alerted.length === 0 ? (
                  <p className="text-[11px] text-lime-200/80">No farm meets an alert condition for these dates.</p>
                ) : (
                  <ul className="custom-scrollbar -mx-1 max-h-72 space-y-1 overflow-y-auto px-1">
                    {analysis.alerted.map((f) => (
                      <li key={f.key}>
                        <button
                          type="button"
                          onClick={() => onSelectFarm(f)}
                          className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                            f.key === selectedKey ? "border-cg-accent/50 bg-cg-accent/10" : "border-white/[0.05] bg-white/[0.02] hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY[f.severity].color }} />
                            <span className="min-w-0 flex-1 truncate font-semibold text-gray-100">{farmLabel(f, analysis)}</span>
                            <span className="tabular-nums text-gray-500">{fmt(f.areaHa, 2)} ha</span>
                          </div>
                          <p className="mt-0.5 pl-4 text-[10px] text-gray-400">
                            {f.alerts.map((a) => `${a.type} · ${a.detail}`).join(" — ")}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowMethod((v) => !v)}
                aria-expanded={showMethod}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white"
              >
                <Info className="h-3.5 w-3.5" /> How these numbers are calculated
                <ChevronDown className={`h-3.5 w-3.5 transition ${showMethod ? "rotate-180" : ""}`} />
              </button>
              {showMethod && (
                <div className="mt-2 grid gap-3 rounded-lg border border-white/[0.06] bg-[#0c1218] p-3.5 text-[11px] leading-relaxed text-gray-400 md:grid-cols-3">
                  <p>
                    <span className="font-semibold text-gray-200">Values.</span> Mean of cloud-free Sentinel-2 pixels (10 m) inside
                    each AI-detected farm boundary. NDVI = crop vigour, NDMI = canopy moisture. Health score maps mean NDVI 0.1→0
                    and 0.8→100.
                  </p>
                  <p>
                    <span className="font-semibold text-gray-200">Health classes</span> (mean NDVI):{" "}
                    {HEALTH_BANDS.map((b) => `${b.label} ${b.min === -Infinity ? `< ${b.max}` : b.max === Infinity ? `≥ ${b.min}` : `${b.min}–${b.max}`}`).join(" · ")}.
                    Change classes: {CHANGE_BANDS.map((b) => b.label).join(" · ")} (relative NDVI change; ±10% is stable).
                  </p>
                  <p>
                    <span className="font-semibold text-gray-200">Alerts.</span> Sharp decline: NDVI down ≥{-ALERT_RULES.sharpDeclinePct}% (high);
                    decline: {-ALERT_RULES.declinePct}–{-ALERT_RULES.sharpDeclinePct}% — only for farms with NDVI ≥ {ALERT_RULES.vegetatedBefore} on the
                    compare date. Low vigour: NDVI {ALERT_RULES.lowVigourMin}–{ALERT_RULES.lowVigourMax} and at least {ALERT_RULES.lowVigourBelowMedian} below
                    the village median{Number.isFinite(s.medianNdvi) ? ` (${s.medianNdvi.toFixed(2)})` : ""}. Moisture stress: NDMI &lt; {ALERT_RULES.dryNdmi} on a
                    cropped farm (high below {ALERT_RULES.veryDryNdmi}). Bare or harvested farms are not flagged.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
