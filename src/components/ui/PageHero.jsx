import React from "react";

const accents = {
  sky: "border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-[#0a180f]/90 to-cg-panel/90",
  emerald:
    "border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-[#0a180f]/90 to-cg-panel/90",
  violet:
    "border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-[#0a180f]/90 to-cg-panel/90",
};

/**
 * Page-level hero strip: eyebrow, title, optional description (tagline or body copy).
 */
export default function PageHero({
  eyebrow,
  title,
  description,
  accent = "sky",
  children,
  className = "",
}) {
  const bg = accents[accent] || accents.sky;
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4 ${bg} ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-[15px] sm:text-base font-semibold text-white leading-snug">
            {title}
          </h2>
        </div>
        {description ? (
          <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed sm:max-w-sm lg:text-right">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
