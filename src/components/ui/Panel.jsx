import React from "react";

const variants = {
  default: "border-[#1a3a22] bg-[#0a120d]/95",
  muted: "border-white/10 bg-cg-panel/90",
  accent: "border-cg-accent/35 bg-[#0a180f]/95",
};

/**
 * Consistent bordered panel for filters, KPI strips, and detail cards.
 */
export default function Panel({
  title,
  titleClassName = "text-xs font-bold uppercase tracking-wider text-gray-500",
  className = "",
  variant = "default",
  bodyClassName = "mt-3 space-y-2",
  children,
  ...rest
}) {
  const box = variants[variant] || variants.default;
  return (
    <div className={`rounded-xl border ${box} p-4 shadow-md ${className}`} {...rest}>
      {title ? (
        <>
          <h3 className={titleClassName}>{title}</h3>
          <div className={bodyClassName}>{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
}
