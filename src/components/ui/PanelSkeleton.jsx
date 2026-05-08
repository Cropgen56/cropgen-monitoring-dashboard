import React from "react";

function SkeletonLine({ width = "100%", className = "" }) {
  return (
    <div
      className={`h-2.5 rounded bg-white/10 animate-pulse ${className}`}
      style={{ width }}
    />
  );
}

export default function PanelSkeleton({ blocks = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: blocks }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-cg-panel p-4 shadow-md space-y-3"
        >
          <SkeletonLine width="42%" className="h-3" />
          <SkeletonLine width="86%" />
          <SkeletonLine width="78%" />
          <SkeletonLine width="64%" />
          <div className="mt-2 h-20 rounded bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
