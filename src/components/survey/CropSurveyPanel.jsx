import React, { useState } from "react";
import { Droplets } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import AgriMap from "../hackathon/AgriMap";
import { CropHealthCard, SoilAnalysisCard } from "../hackathon/fieldDetailCards";
import { surveyMeta, innovationHighlights, governmentUseCases } from "../../data/agriStateData";

/**
 * Satellite / crop monitoring workspace: map layers, classification legend, yield tools.
 */
export default function CropSurveyPanel({
  district,
  filteredPlots,
  villageBoundary,
  mapLayer,
  mapRegionFallback,
  selectedPlotId,
  onPlotClick,
  showValidationPoints,
  yieldCompareData,
  historicalYield,
  selectedProperties: p,
}) {
  const [govMode, setGovMode] = useState("g1");

  return (
    <div className="lg:col-span-9 grid gap-4 lg:grid-cols-9">
      <section className="lg:col-span-6 space-y-2 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          District map (satellite)
        </p>
        <AgriMap
          plotData={filteredPlots}
          villageBoundary={villageBoundary}
          mapLayer={mapLayer}
          platformMode="survey"
          selectedPlotId={selectedPlotId}
          onPlotClick={onPlotClick}
          showValidationPoints={showValidationPoints}
          regionFallback={mapRegionFallback}
          showSurveyPopup
        />
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Healthy
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-400" /> Moderate
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Risk
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-cg-panel/80 p-3 text-[10px] text-gray-400">
          <span className="font-semibold text-cg-accent">Classification legend:</span> Banana · yellow,
          Soybean · green, Rice · blue, Cotton · purple, Sugarcane · orange.
        </div>
      </section>

      <aside className="custom-scrollbar lg:col-span-3 space-y-3 lg:max-h-[min(78vh,680px)] lg:overflow-y-auto min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 px-0.5">
          Yield, trends &amp; survey tools
        </p>

        {p && (
          <div className="space-y-3">
            <CropHealthCard p={p} />
            <SoilAnalysisCard p={p} />
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-cg-panel p-4 shadow-md">
          <h3 className="text-sm font-bold text-white">Yield prediction</h3>
          <p className="text-[11px] text-gray-500">
            Predicted yield (ton/acre) vs cluster benchmark — {district} focus
          </p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldCompareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0c2214",
                    border: "1px solid #333",
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="yield" name="Predicted" fill="#79c24a" />
                <Bar dataKey="benchmark" name="Benchmark" fill="#4b5563" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-cg-panel p-4 shadow-md">
          <h3 className="text-sm font-bold text-white">Historical vs current (district roll-up)</h3>
          <div className="mt-2 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalYield}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="y" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0c2214",
                    border: "1px solid #333",
                    fontSize: 11,
                  }}
                />
                <Line type="monotone" dataKey="current" name="Current" stroke="#79c24a" dot={false} />
                <Line type="monotone" dataKey="prior" name="Prior yr" stroke="#6b7280" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-cg-accent/25 bg-cg-accent/5 p-4 shadow-md">
          <p className="text-[11px] text-gray-300">
            AI Crop Classification Accuracy:{" "}
            <span className="font-bold text-cg-accent">{surveyMeta.classificationAccuracyPct}%</span>
          </p>
          <p className="mt-1 text-[10px] text-gray-500">
            Use the left column to switch crop type, NDVI, and drought layers on the map.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-cg-panel p-4 shadow-md">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Droplets className="h-4 w-4 text-sky-400" />
            Drought &amp; stress legend
          </h3>
          <ul className="mt-2 space-y-1 text-[11px] text-gray-300">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-green-600" /> Low stress (ET within norm)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-orange-500" /> Moderate
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-red-600" /> High (NDVI drop + ET deficit)
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-md">
          <h3 className="text-sm font-bold text-purple-100">Innovation stack</h3>
          <ul className="mt-2 space-y-2 text-[11px] text-gray-300">
            {innovationHighlights.map((x) => (
              <li key={x.key}>
                <span className="font-semibold text-white">{x.title}</span>
                <br />
                {x.detail}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-cg-panel p-4 shadow-md">
          <h3 className="text-sm font-bold text-white">Government use case</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {governmentUseCases.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGovMode(g.id)}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                  govMode === g.id
                    ? "bg-cg-accent text-[#0c2214]"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {govMode === "g1" &&
              "Crop area estimation: banana-classified polygons summed with survey validation weights."}
            {govMode === "g2" &&
              "Subsidy planning: tie Mahadbt disbursement to cluster fertilizer efficiency scores."}
            {govMode === "g3" &&
              "Disaster assessment: combine drought layer with insurance anomaly alerts for rapid desk review."}
          </p>
        </div>
      </aside>
    </div>
  );
}
