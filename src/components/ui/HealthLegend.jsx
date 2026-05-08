import React from "react";

const DEFAULT_ITEMS = [
  { label: "Healthy", dotClass: "bg-green-500" },
  { label: "Moderate", dotClass: "bg-yellow-400" },
  { label: "Risk", dotClass: "bg-red-500" },
];

/** Compact crop-health legend used under maps */
export default function HealthLegend({
  items = DEFAULT_ITEMS,
  className = "",
}) {
  return (
    <div
      className={`flex flex-wrap gap-3 text-[10px] text-gray-400 ${className}`}
      role="list"
      aria-label="Health legend"
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1" role="listitem">
          <span className={`h-2 w-2 rounded-full shrink-0 ${item.dotClass}`} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
