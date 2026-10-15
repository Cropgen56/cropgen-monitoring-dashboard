import React from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import RegionSelector from "./RegionSelector";

const ROUTE_META = {
  "/dashboard": {
    title: "DASHBOARD",
    subtitle: "Overview of farm boundaries detected across Maharashtra",
  },
  "/boundary-delineation": {
    title: "BOUNDARY DELINEATION",
    subtitle: "Detect farm boundaries for a village with the AI field detection model",
  },
  "/survey": {
    title: "CROP CLASSIFICATION",
    subtitle: "Detect field boundaries and review detected fields",
  },
  "/crop-monitoring": {
    title: "CROP MONITORING",
    subtitle: "Check satellite availability and calculate crop indices for detected farms",
  },
  "/farm-report": {
    title: "FARM REPORT",
    subtitle: "Crop health, satellite trends, nutrients, soil and terrain for a detected farm",
  },
  "/farmers": {
    title: "FARMER REGISTRY",
    subtitle: "Farmers registered by your team",
  },
};

export default function DashboardTopBar({ onOpenMenu }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const meta = ROUTE_META[pathname] || {
    title: "CROPGEN AI",
    subtitle: "Agriculture administration",
  };


  return (
    <header className="sticky top-0 z-[1100] flex min-h-[60px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[0.06] bg-[#0d1117]/95 px-3 py-2 backdrop-blur-md sm:px-5 lg:gap-x-4">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        aria-controls="app-sidebar"
        className="-ml-1 rounded-lg p-2 text-gray-300 hover:bg-white/5 hover:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <img src="/logo.png" alt="CropGen AI" className="h-7 w-7 shrink-0 object-contain lg:hidden" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{meta.title}</h1>
        <p className="truncate text-[12px] text-gray-500">{meta.subtitle}</p>
      </div>

      <div className="order-last w-full lg:order-none lg:w-auto">
        <RegionSelector />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#111820] py-1.5 pl-1.5 pr-2 md:flex">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cg-accent/40 to-emerald-900/80 ring-2 ring-cg-accent/25" />
          <div className="hidden sm:block text-left leading-tight max-w-[140px] md:max-w-[200px]">
            <p className="text-[12px] font-semibold text-white truncate">Admin Officer</p>
            <p className="text-[10px] text-gray-500 truncate" title={user?.email}>
              {user?.email || "Government Admin"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
