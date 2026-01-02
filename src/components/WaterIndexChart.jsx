import React, { useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Info } from "lucide-react";

const defaultData = [
  { date: "Day 1", 2025: 0.22, 2024: 0.2 },
  { date: "Day 2", 2025: 0.23, 2024: 0.2 },
  { date: "Day 3", 2025: 0.23, 2024: 0.21 },
  { date: "Day 4", 2025: 0.24, 2024: 0.21 },
  { date: "Day 5", 2025: 0.24, 2024: 0.22 },
  { date: "Day 6", 2025: 0.25, 2024: 0.22 },
  { date: "Day 7", 2025: 0.25, 2024: 0.23 },
  { date: "Day 8", 2025: 0.26, 2024: 0.23 },
  { date: "Day 9", 2025: 0.26, 2024: 0.24 },
  { date: "Day 10", 2025: 0.27, 2024: 0.24 },
  { date: "Day 11", 2025: 0.27, 2024: 0.25 },
  { date: "Day 12", 2025: 0.26, 2024: 0.25 },
  { date: "Day 13", 2025: 0.25, 2024: 0.24 },
  { date: "Day 14", 2025: 0.25, 2024: 0.24 },
  { date: "Day 15", 2025: 0.24, 2024: 0.23 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-cg-panel border border-[#3b82f6] px-3 py-2 rounded-lg shadow-xl">
        <p className="text-cg-muted text-xs font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 text-xs mb-1"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-cg-muted">{entry.name}:</span>
            </div>
            <span className="font-bold text-white">
              {entry.value.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <div className="flex justify-start gap-6 mb-2 px-4">
    <div className="flex items-center gap-2">
      <div className="w-6 h-0.5 bg-[#3b82f6] rounded" />
      <span className="text-cg-muted text-xs font-semibold">2025</span>
    </div>
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-0.5 rounded opacity-70"
        style={{
          background: "#93c5fd",
          backgroundImage:
            "repeating-linear-gradient(to right, #93c5fd 0, #93c5fd 3px, transparent 3px, transparent 6px)",
        }}
      />
      <span className="text-cg-muted text-xs font-semibold">2024</span>
    </div>
  </div>
);

export default function WaterIndexChart() {
  // 🔥 Now using only static data
  const data = defaultData;

  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const summaryData = useMemo(() => {
    const values2025 = data.map((d) => d["2025"]);
    const values2024 = data.map((d) => d["2024"]);

    const min2025 = Math.min(...values2025);
    const max2025 = Math.max(...values2025);
    const mean2025 = values2025.reduce((a, b) => a + b, 0) / values2025.length;

    const change = values2025.at(-1) - values2024.at(-1);

    return { min2025, max2025, mean2025, change };
  }, [data]);

  const chartConfig = useMemo(() => {
    return {
      width: Math.max(data.length * 60, 900),
      interval: 0,
    };
  }, [data.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const down = (e) => {
      isDragging.current = true;
      startX.current = e.pageX - el.offsetLeft;
      scrollLeft.current = el.scrollLeft;
      el.style.cursor = "grabbing";
    };
    const leave = () => (isDragging.current = false);
    const up = () => (isDragging.current = false);
    const move = (e) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft.current - (x - startX.current);
    };

    el.addEventListener("mousedown", down);
    el.addEventListener("mouseleave", leave);
    el.addEventListener("mouseup", up);
    el.addEventListener("mousemove", move);

    return () => {
      el.removeEventListener("mousedown", down);
      el.removeEventListener("mouseleave", leave);
      el.removeEventListener("mouseup", up);
      el.removeEventListener("mousemove", move);
    };
  }, []);

  return (
    <div className="w-full bg-cg-panel rounded-xl shadow-cg-soft overflow-hidden border border-cg-bg/50">
      <div className="px-4 pt-3 pb-2 border-b border-cg-bg">
        <h2 className="text-lg font-bold text-white">Water Stress Analysis</h2>
        <p className="text-xs text-cg-muted">
          Irrigation needs monitoring (15-day period)
        </p>
      </div>

      <div className="px-4 py-3 flex flex-col lg:flex-row gap-4">
        {/* Summary Card */}
        <div className="w-full lg:w-1/4 flex flex-col items-center justify-center">
          <div className="bg-cg-bg rounded-xl p-4 flex flex-col items-center shadow-md border border-[#3b82f6]/20 h-full w-full justify-around">
            <h2 className="text-2xl font-bold text-[#3b82f6]">Water Index</h2>

            <button
              className={`${
                summaryData.change >= 0
                  ? "bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/40"
                  : "bg-cg-accent/20 text-cg-accent border-cg-accent/40"
              } px-4 py-2 text-sm font-bold rounded-lg mt-2 border transition-all hover:scale-105`}
            >
              {summaryData.change >= 0 ? "+" : ""}
              {summaryData.change.toFixed(3)}
            </button>

            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-cg-muted">Mean:</span>
                <span className="text-white font-semibold">
                  {summaryData.mean2025.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cg-muted">Min:</span>
                <span className="text-white font-semibold">
                  {summaryData.min2025.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cg-muted">Max:</span>
                <span className="text-white font-semibold">
                  {summaryData.max2025.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="border border-cg-muted/30 bg-cg-panel p-3 rounded-lg text-cg-muted text-xs w-full mt-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex-1">
                  Water stress index helps monitor crop water requirements and
                  irrigation needs.
                </span>
                <span className="bg-cg-bg rounded-full p-1 border border-[#3b82f6]/30">
                  <Info size={14} strokeWidth={2} color="#3b82f6" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="lg:w-3/4 flex-grow">
          <div className="bg-cg-bg rounded-xl border border-cg-muted/20 p-3">
            <div className="mb-2">
              <h3 className="text-base font-bold text-white">Water Index</h3>
              <p className="text-xs text-cg-muted">
                Daily progression (15 days) • Scroll to view all →
              </p>
            </div>

            <div
              ref={scrollRef}
              className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing pr-2 custom-scrollbar"
              style={{ scrollbarWidth: "thin" }}
            >
              <div style={{ minWidth: chartConfig.width }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={data}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="#486152"
                      strokeDasharray="3 3"
                      opacity={0.2}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9fb79f", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "#486152" }}
                      interval={chartConfig.interval}
                      dy={8}
                      angle={0}
                      textAnchor="middle"
                      height={50}
                    />
                    <YAxis
                      domain={[0, 0.5]}
                      ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]}
                      tick={{ fill: "#9fb79f", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "#486152" }}
                      dx={-5}
                    />

                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />

                    {/* 2025 Line - Solid, Blue */}
                    <Line
                      type="monotone"
                      dataKey="2025"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#3b82f6",
                        strokeWidth: 2,
                        stroke: "#0c2214",
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#3b82f6",
                        stroke: "#0c2214",
                        strokeWidth: 2,
                      }}
                      name="2025"
                      connectNulls={false}
                    />

                    {/* 2024 Line - Dashed, Light Blue */}
                    <Line
                      type="monotone"
                      dataKey="2024"
                      stroke="#93c5fd"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{
                        r: 3,
                        fill: "#93c5fd",
                        strokeWidth: 2,
                        stroke: "#0c2214",
                      }}
                      activeDot={{
                        r: 5,
                        fill: "#93c5fd",
                        stroke: "#0c2214",
                        strokeWidth: 2,
                      }}
                      name="2024"
                      opacity={0.8}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
