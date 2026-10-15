import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";

const MAX_RENDERED = 400;
/** Below this width the pickers are narrow, so the list opens full-width under the picker. */
const WIDE_PANEL_BELOW_PX = 1024;

/**
 * Type-to-filter dropdown for long lists (a taluka can hold several hundred villages).
 * @param {{ value: string, label: string, hint?: string, search?: string }[]} options
 */
export default function SearchSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  emptyText = "No matches",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const [panelStyle, setPanelStyle] = useState(undefined);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      setPanelStyle(
        rect && window.innerWidth < WIDE_PANEL_BELOW_PX
          ? { position: "fixed", left: 12, right: 12, top: rect.bottom + 6, width: "auto" }
          : undefined,
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const selected = useMemo(() => options.find((o) => o.value === value) || null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => (o.search || `${o.label} ${o.hint || ""}`).toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    setActive(0);
    if (open) inputRef.current?.focus();
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  };

  const choose = (option) => {
    setOpen(false);
    setQuery("");
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.min(filtered.length, MAX_RENDERED) - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 ${className}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected ? `${label}: ${selected.label}` : label}
        className="flex h-10 w-full items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111820] px-2 text-left sm:gap-2 sm:px-3 hover:border-cg-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</span>
          <span className={`block truncate text-[12px] ${selected ? "font-medium text-gray-100" : "text-gray-500"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        )}
      </button>

      {open && (
        <div
          style={panelStyle}
          className="absolute right-0 top-[calc(100%+6px)] z-[2000] w-[max(100%,280px)] rounded-lg border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/60"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Search ${label.toLowerCase()}…`}
              role="combobox"
              aria-controls={listId}
              aria-expanded
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-white placeholder:text-gray-500 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-gray-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="custom-scrollbar max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-[12px] text-gray-500">{emptyText}</li>}
            {filtered.slice(0, MAX_RENDERED).map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                className={`flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-[12px] ${
                  i === active ? "bg-cg-accent/15 text-white" : "text-gray-300"
                } ${o.value === value ? "font-semibold text-cg-accent" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="shrink-0 text-[10px] text-gray-500">{o.hint}</span>}
              </li>
            ))}
            {filtered.length > MAX_RENDERED && (
              <li className="px-3 py-1.5 text-[10px] text-gray-500">
                Showing {MAX_RENDERED} of {filtered.length} — type to narrow down
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
