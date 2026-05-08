import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Collapsible product narrative for judges: problem, signals, personas, outcomes.
 */
export default function HackathonStory() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-white/10 bg-[#0a120d]/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5 transition"
        aria-expanded={open}
      >
        <span>Why this monitoring platform</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-cg-accent" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-cg-accent" />
        )}
      </button>
      {open ? (
        <div className="border-t border-white/10 px-4 pb-4 pt-2 space-y-3 text-[11px] sm:text-xs text-gray-400 leading-relaxed">
          <p>
            <span className="font-semibold text-cg-accent">Problem — </span>
            Field teams and government desks need one place to see crop condition, stress, and
            farmer context without switching between maps, spreadsheets, and schemes portals.
          </p>
          <p>
            <span className="font-semibold text-cg-accent">What we monitor — </span>
            Satellite-backed layers (classification, NDVI, drought/stress), plot geometry and area,
            and demo linkage to schemes and alerts for rapid desk review.
          </p>
          <p>
            <span className="font-semibold text-cg-accent">Who it is for — </span>
            Survey operations (satellite intelligence workspace) and administrators (KPIs, farmer
            mapping, schemes, alerts). AI Insights summarizes cluster-level signals for the selected
            district.
          </p>
          <p>
            <span className="font-semibold text-cg-accent">Outcome — </span>
            Faster prioritization: which clusters and plots to scout, which risks to escalate, and
            which scheme actions to queue — with transparent assumptions (see README).
          </p>
        </div>
      ) : null}
    </section>
  );
}
