import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAgriPlatform } from "../../context/AgriPlatformContext";

const ROUTE_META = {
  "/dashboard": {
    title: "DASHBOARD",
    subtitle: "Field boundaries detected from satellite imagery across Maharashtra",
  },
  "/survey": {
    title: "CROP CLASSIFICATION",
    subtitle: "Detect field boundaries and review detected fields",
  },
  "/crop-monitoring": {
    title: "CROP MONITORING",
    subtitle: "Check satellite availability and calculate crop indices for detected farms",
  },
  "/admin": {
    title: "FARMER MAPPING",
    subtitle: "Detected fields alongside registered farmers",
  },
  "/farmers": {
    title: "FARMER REGISTRY",
    subtitle: "Farmers registered by your team",
  },
};

export default function DashboardTopBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const ap = useAgriPlatform();

  const regionLabel = ap.district ? `${ap.district}, Maharashtra` : "Maharashtra";

  const meta = ROUTE_META[pathname] || {
    title: "CROPGEN",
    subtitle: "Agriculture administration",
  };


  return (
    <header className="sticky top-0 z-50 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0d1117]/95 px-5 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{meta.title}</h1>
        <p className="truncate text-[12px] text-gray-500">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div
          title={regionLabel}
          className="hidden sm:flex max-w-[min(240px,36vw)] items-center gap-2 rounded-lg border border-white/[0.08] bg-[#111820] px-3 py-2 text-left text-[12px] text-gray-200"
        >
          <MapPin className="h-4 w-4 shrink-0 text-cg-accent/90" aria-hidden />
          <span className="min-w-0 truncate font-medium">{regionLabel}</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#111820] py-1.5 pl-1.5 pr-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cg-accent/40 to-emerald-900/80 ring-2 ring-cg-accent/25" />
          <div className="hidden sm:block text-left leading-tight max-w-[140px] md:max-w-[200px]">
            <p className="text-[12px] font-semibold text-white truncate">Admin Officer</p>
            <p className="text-[10px] text-gray-500 truncate" title={user?.email}>
              {user?.email || "Government Admin"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            nav("/login", { replace: true });
          }}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111820] px-3 text-[11px] font-semibold text-gray-400 hover:border-red-500/30 hover:bg-red-950/30 hover:text-red-200"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
