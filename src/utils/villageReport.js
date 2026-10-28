/**
 * Exports for the village crop analysis: CSV and GeoJSON of every farm, and a printable
 * report page (opened in a new tab; the browser's print dialog saves it as PDF).
 */
import { ALERT_RULES, CHANGE_BANDS, HEALTH_BANDS, SEVERITY, farmLabel } from "./villageAnalysis";

const num = (v, d = 3) => (Number.isFinite(v) ? Number(v).toFixed(d) : "");

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s) => String(s || "village").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function farmRow(f) {
  return {
    farm_id: f.fieldId ?? "",
    village: f.village ?? "",
    taluka: f.taluka ?? "",
    district: f.district ?? "",
    area_ha: num(f.areaHa, 3),
    ndvi_mean: num(f.ndvi),
    health_class: f.health?.label ?? "",
    health_score: f.score ?? "",
    ndvi_compare_date: num(f.ndviPrev),
    ndvi_change_pct: num(f.changePct, 1),
    change_class: f.change?.label ?? "",
    ndmi_mean: num(f.ndmi),
    alert_severity: f.severity ?? "",
    alerts: f.alerts.map((a) => `${a.type} (${a.detail})`).join("; "),
  };
}

export function downloadFarmsCsv(analysis, meta) {
  const rows = analysis.farms.map(farmRow);
  const headers = Object.keys(rows[0] || farmRow({ alerts: [] }));
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  // Byte-order mark so Excel opens the CSV as UTF-8 (Marathi village names).
  download(`\uFEFF${csv}`, `crop-health-${slug(meta.village)}-${meta.date}.csv`, "text/csv;charset=utf-8");
}

export function downloadFarmsGeoJson(analysis, meta) {
  const fc = {
    type: "FeatureCollection",
    features: analysis.farms.map((f) => ({ type: "Feature", geometry: f.feature.geometry, properties: farmRow(f) })),
  };
  download(JSON.stringify(fc), `crop-health-${slug(meta.village)}-${meta.date}.geojson`, "application/geo+json");
}

const html = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Simple equirectangular SVG of the farm polygons, coloured by health band. */
function farmsSvg(farms, colorFor, width = 680, height = 380) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const rings = (g) => (g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []);
  for (const f of farms) for (const poly of rings(f.feature.geometry)) for (const [x, y] of poly[0] || []) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return "";
  const kx = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const w = (maxX - minX) * kx || 1e-6, h = maxY - minY || 1e-6;
  const scale = Math.min((width - 20) / w, (height - 20) / h);
  const ox = (width - w * scale) / 2, oy = (height - h * scale) / 2;
  const pt = ([x, y]) => `${(ox + (x - minX) * kx * scale).toFixed(1)},${(oy + (maxY - y) * scale).toFixed(1)}`;
  const paths = farms.map((f) => {
    const d = rings(f.feature.geometry).map((poly) => poly.map((ring) => `M${ring.map(pt).join("L")}Z`).join("")).join("");
    return `<path d="${d}" fill="${colorFor(f)}" fill-opacity=".85" stroke="#1f2937" stroke-width=".6"/>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-height:${height}px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">${paths.join("")}</svg>`;
}

export function openPrintableReport(analysis, meta) {
  const s = analysis.summary;
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const location = [meta.village, meta.taluka, meta.district].filter(Boolean).join(", ");
  const kpi = (label, value, sub = "") =>
    `<div class="kpi"><div class="kl">${html(label)}</div><div class="kv">${html(value)}</div><div class="ks">${html(sub)}</div></div>`;
  const legend = (bands) =>
    bands.map((b) => `<span class="lg"><i style="background:${b.color}"></i>${html(b.label)}</span>`).join("");
  const alertRows = analysis.alerted.slice(0, 60).map((f) => `<tr>
      <td>${html(farmLabel(f, analysis))}</td><td>${num(f.areaHa, 2)}</td>
      <td><b style="color:${SEVERITY[f.severity].color}">${SEVERITY[f.severity].label}</b></td>
      <td>${f.alerts.map((a) => `${html(a.type)} <span class="mut">(${html(a.detail)})</span>`).join("<br>")}</td>
      <td>${num(f.ndvi, 2)}</td><td>${Number.isFinite(f.changePct) ? `${f.changePct.toFixed(0)}%` : "—"}</td></tr>`).join("");
  const farmRows = analysis.farms.map((f) => `<tr>
      <td>${html(farmLabel(f, analysis))}</td><td>${num(f.areaHa, 2)}</td><td>${num(f.ndvi, 2)}</td>
      <td>${f.health ? `<i class="dot" style="background:${f.health.color}"></i>${html(f.health.label)}` : "—"}</td>
      <td>${num(f.ndviPrev, 2) || "—"}</td><td>${Number.isFinite(f.changePct) ? `${f.changePct.toFixed(0)}%` : "—"}</td>
      <td>${num(f.ndmi, 2) || "—"}</td><td>${f.severity ? SEVERITY[f.severity].label : ""}</td></tr>`).join("");

  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Village Crop Health Report — ${html(location)}</title>
<style>
  *{box-sizing:border-box} body{font:12px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:0;padding:28px 34px;background:#fff}
  h1{font-size:20px;margin:0} h2{font-size:14px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #166534;color:#14532d}
  .hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #166534;padding-bottom:10px}
  .sub{color:#475569;margin-top:3px} .meta{text-align:right;color:#475569;font-size:11px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
  .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:9px 11px;background:#f8fafc}
  .kl{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#64748b} .kv{font-size:18px;font-weight:700;margin-top:2px} .ks{font-size:10px;color:#64748b}
  table{width:100%;border-collapse:collapse;font-size:11px} th{background:#f1f5f9;text-align:left;font-weight:600;color:#334155}
  th,td{padding:5px 7px;border-bottom:1px solid #e2e8f0;vertical-align:top} .mut{color:#64748b}
  .lg{display:inline-flex;align-items:center;gap:5px;margin-right:12px;font-size:11px} .lg i,.dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:16px} .note{font-size:10.5px;color:#475569}
  .bar{display:flex;height:12px;border-radius:6px;overflow:hidden;margin:6px 0 8px} .bar span{display:block}
  .foot{margin-top:24px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b}
  .tw{overflow-x:auto}
  @media (max-width:640px){body{padding:16px 14px} .hdr{flex-direction:column;align-items:flex-start;gap:8px} .meta{text-align:left}
    .kpis{grid-template-columns:repeat(2,1fr)} .two{grid-template-columns:1fr} .kv{font-size:16px} table{font-size:10.5px}}
  @media print{body{padding:0} .noprint{display:none} h2{break-after:avoid} tr{break-inside:avoid} @page{size:A4;margin:14mm}}
  .noprint{display:flex;justify-content:flex-end;margin:-8px 0 14px} .noprint button{font:600 12px system-ui;padding:8px 14px;border-radius:8px;border:0;background:#166534;color:#fff;cursor:pointer}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="hdr"><div><h1>Village Crop Health Report</h1><div class="sub">${html(location)}</div></div>
<div class="meta">Satellite image: <b>${fmtDate(meta.date)}</b>${meta.compareDate ? `<br>Compared with: <b>${fmtDate(meta.compareDate)}</b>` : ""}<br>Generated: ${html(generated)}</div></div>

<div class="kpis">
${kpi("Farms analysed", `${s.measuredFarms} / ${s.totalFarms}`, `${num(s.areaHa, 1)} ha mapped`)}
${kpi("Village health score", s.score ?? "—", s.health ? `${s.health.label} · mean NDVI ${num(s.meanNdvi, 2)}` : "")}
${kpi("Farms with alerts", s.highAlerts + s.mediumAlerts, `${s.highAlerts} high · ${s.mediumAlerts} medium · ${num(s.areaAtRiskHa, 1)} ha`)}
${kpi("Average NDVI change", Number.isFinite(s.meanChangePct) ? `${s.meanChangePct > 0 ? "+" : ""}${s.meanChangePct.toFixed(1)}%` : "—", meta.compareDate ? `since ${fmtDate(meta.compareDate)}` : "no comparison")}
</div>

<h2>Crop health map</h2>
${farmsSvg(analysis.farms, (f) => f.health?.color || "#e2e8f0")}
<div style="margin-top:6px">${legend(HEALTH_BANDS)}<span class="lg"><i style="background:#e2e8f0"></i>No clear data</span></div>

<div class="two">
<div><h2>Crop health distribution</h2>
<div class="bar">${analysis.distribution.map((b) => `<span style="width:${b.pct}%;background:${b.color}"></span>`).join("")}</div>
<table><tr><th>Class (mean NDVI)</th><th>Farms</th><th>Area (ha)</th><th>Share</th></tr>
${analysis.distribution.map((b) => `<tr><td><i class="dot" style="background:${b.color}"></i>${html(b.label)} <span class="mut">${b.min === -Infinity ? "&lt; " + b.max : b.max === Infinity ? "≥ " + b.min : b.min + "–" + b.max}</span></td><td>${b.farms}</td><td>${num(b.areaHa, 2)}</td><td>${b.pct.toFixed(1)}%</td></tr>`).join("")}
</table></div>
<div><h2>Change since ${meta.compareDate ? fmtDate(meta.compareDate) : "compare date"}</h2>
${meta.compareDate ? `<table><tr><th>Change in NDVI</th><th>Farms</th><th>Area (ha)</th></tr>
${analysis.changeDistribution.map((b) => `<tr><td><i class="dot" style="background:${b.color}"></i>${html(b.label)} <span class="mut">${b.min === -Infinity ? "≤ " + b.max : b.max === Infinity ? "≥ +" + b.min : b.min + "% to " + b.max}%</span></td><td>${b.farms}</td><td>${num(b.areaHa, 2)}</td></tr>`).join("")}
</table>` : `<p class="note">No comparison date was selected.</p>`}</div>
</div>

<h2>Farms needing attention (${analysis.alerted.length})</h2>
${analysis.alerted.length ? `<div class="tw"><table><tr><th>Farm</th><th>Area (ha)</th><th>Severity</th><th>Alerts</th><th>NDVI</th><th>Change</th></tr>${alertRows}</table></div>
${analysis.alerted.length > 60 ? `<p class="note">Showing the 60 most severe of ${analysis.alerted.length}. The CSV export lists all farms.</p>` : ""}` : `<p class="note">No farms met an alert condition.</p>`}

<h2>All farms</h2>
<div class="tw"><table><tr><th>Farm</th><th>Area (ha)</th><th>NDVI</th><th>Health</th><th>NDVI (compare)</th><th>Change</th><th>NDMI</th><th>Alert</th></tr>${farmRows}</table></div>

<h2>Method</h2>
<p class="note">Values are the mean of cloud-free Sentinel-2 L2A pixels (10 m) inside each AI-detected farm boundary.
NDVI measures crop vigour; NDMI measures canopy moisture. Health classes use mean NDVI: ${HEALTH_BANDS.map((b) => `${b.label} ${b.min === -Infinity ? "&lt; " + b.max : b.max === Infinity ? "≥ " + b.min : b.min + "–" + b.max}`).join(", ")}.
Alerts: sharp decline = NDVI fell ≥ ${-ALERT_RULES.sharpDeclinePct}% (high), decline = ${-ALERT_RULES.declinePct}–${-ALERT_RULES.sharpDeclinePct}% (medium), both only for farms with NDVI ≥ ${ALERT_RULES.vegetatedBefore} on the compare date;
low vigour = NDVI ${ALERT_RULES.lowVigourMin}–${ALERT_RULES.lowVigourMax} and at least ${ALERT_RULES.lowVigourBelowMedian} below the village median NDVI (${num(s.medianNdvi, 2)}); moisture stress = NDMI &lt; ${ALERT_RULES.dryNdmi} on a farm with NDVI ≥ ${ALERT_RULES.vegetatedBefore} (high below ${ALERT_RULES.veryDryNdmi}).
Change classes: ${CHANGE_BANDS.map((b) => b.label).join(", ")} (relative change in mean NDVI).</p>
<div class="foot">Generated by CropGen AI from satellite observations. Indicators are model-assisted and intended for programme monitoring and field verification — not a statutory crop-loss certification.</div>
<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),400));</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) throw new Error("The browser blocked the report window. Allow pop-ups for this site and try again.");
  win.document.open();
  win.document.write(doc);
  win.document.close();
}
