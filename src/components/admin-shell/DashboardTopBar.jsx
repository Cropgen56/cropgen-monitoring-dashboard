import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAgriPlatform } from "../../context/AgriPlatformContext";
import { stateSummary } from "../../data/agriStateData";

const ROUTE_META = {
  "/dashboard": {
    title: "ADMIN DASHBOARD",
    subtitle: "AI Powered Agriculture Governance Intelligence",
  },
  "/governance": {
    title: "IMPACT INTELLIGENCE",
    subtitle: "Spatial risk, stress layers, and priority zones",
  },
  "/admin": {
    title: "FARMER MAPPING",
    subtitle: "Parcels, profiles, and desk verification",
  },
  "/survey": {
    title: "CROP MONITORING",
    subtitle: "Satellite classification, NDVI, and yield signals",
  },
  "/verifications": {
    title: "VERIFICATIONS",
    subtitle: "Smart verification and compliance checks",
  },
  "/schemes": {
    title: "SCHEMES & BENEFITS",
    subtitle: "Program enrollment and approvals",
  },
  "/insurance": {
    title: "INSURANCE (PMFBY)",
    subtitle: "Policies, claims, and coverage analytics",
  },
  "/grievances": {
    title: "GRIEVANCE MANAGEMENT",
    subtitle: "Tickets, SLAs, and resolution tracking",
  },
  "/reports": {
    title: "REPORTS & ANALYTICS",
    subtitle: "Exports and scheduled intelligence packs",
  },
  "/alerts": {
    title: "ALERTS & NOTIFICATIONS",
    subtitle: "AI and system notification feed",
  },
  "/actions": {
    title: "ACTION CENTER",
    subtitle: "Desk actions and batch workflows",
  },
  "/users": {
    title: "USER MANAGEMENT",
    subtitle: "Roles, access, and audit (demo)",
  },
  "/settings": {
    title: "SYSTEM SETTINGS",
    subtitle: "Preferences and integration stubs",
  },
  "/ai": {
    title: "AI CLUSTER INSIGHTS",
    subtitle: "Cluster analytics for the selected district",
  },
};

export default function DashboardTopBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const ap = useAgriPlatform();

  const { regionLabel, regionTitle } = useMemo(() => {
    const countryName = ap.locationCountries.find((c) => c.iso2 === ap.filterCountryCode)?.name;
    const stateName = ap.locationStates.find((st) => st.state_code === ap.filterStateCode)?.name;
    const title = [countryName, stateName].filter(Boolean).join(" · ") || "Workspace context";
    const label = stateName || countryName || "Select region";
    return { regionLabel: label, regionTitle: title };
  }, [
    ap.filterCountryCode,
    ap.filterStateCode,
    ap.locationCountries,
    ap.locationStates,
  ]);

  const meta = ROUTE_META[pathname] || {
    title: "CROPGEN",
    subtitle: "Agriculture administration",
  };

  const alertCount = stateSummary.riskAlertsOpen;

  return (
    <header className="sticky top-0 z-50 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0d1117]/95 px-5 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{meta.title}</h1>
        <p className="truncate text-[12px] text-gray-500">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          title={regionTitle}
          className="hidden sm:flex max-w-[min(240px,36vw)] items-center gap-2 rounded-lg border border-white/[0.08] bg-[#111820] px-3 py-2 text-left text-[12px] text-gray-200 hover:border-white/[0.12] hover:bg-[#141c26]"
        >
          <MapPin className="h-4 w-4 shrink-0 text-cg-accent/90" aria-hidden />
          <span className="min-w-0 truncate font-medium">{regionLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        </button>

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111820] text-gray-400 hover:text-white"
          aria-label={`Notifications, ${alertCount} open`}
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white tabular-nums">
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        </button>

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
