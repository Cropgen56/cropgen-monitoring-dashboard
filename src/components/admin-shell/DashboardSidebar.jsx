import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Users,
  Satellite,
  ShieldCheck,
  HandCoins,
  Contact2,
  Umbrella,
  MessageSquareWarning,
  FileBarChart,
  Bell,
  Zap,
  UserCog,
  Settings,
  Leaf,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAgriPlatform } from "../../context/AgriPlatformContext";
import { LOCATION_API_ORIGIN } from "../../config/endpoints";

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors";

const navIcon = "h-[18px] w-[18px] shrink-0 opacity-90";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/governance", label: "Impact Intelligence", icon: Map },
  { to: "/admin", label: "Farmer Mapping", icon: Users },
  { to: "/farmers", label: "Farmer registry", icon: Contact2 },
  { to: "/survey", label: "Crop Monitoring", icon: Satellite },
  { to: "/verifications", label: "Verifications", icon: ShieldCheck },
  { to: "/schemes", label: "Schemes & Benefits", icon: HandCoins },
  { to: "/insurance", label: "Insurance (PMFBY)", icon: Umbrella },
  { to: "/grievances", label: "Grievance Management", icon: MessageSquareWarning },
  { to: "/reports", label: "Reports & Analytics", icon: FileBarChart },
  { to: "/alerts", label: "Alerts & Notifications", icon: Bell },
  { to: "/actions", label: "Action Center", icon: Zap },
  { to: "/ai", label: "AI Cluster Insights", icon: Sparkles },
  { to: "/users", label: "User Management", icon: UserCog },
  { to: "/settings", label: "System Settings", icon: Settings },
];

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-cg-accent/60";

export default function DashboardSidebar() {
  const s = useAgriPlatform();
  const [quickFiltersOpen, setQuickFiltersOpen] = useState(true);

  return (
    <aside className="custom-scrollbar flex h-screen w-[272px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cg-accent/15 text-cg-accent">
            <Leaf className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-slate-900">CropGen</p>
            <p className="text-[10px] leading-tight text-slate-500">
              Crop monitoring &amp; administration intelligence
            </p>
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Primary">
        {NAV.map((item) => {
          const NavIcon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${navItem} ${
                  isActive
                    ? "bg-cg-accent/15 text-cg-accent shadow-[inset_3px_0_0_0] shadow-cg-accent"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`
              }
            >
              <NavIcon className={navIcon} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 space-y-2.5 bg-slate-50">
        <button
          type="button"
          onClick={() => setQuickFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between px-1 text-left"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">Quick filters</p>
          {quickFiltersOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>
        {quickFiltersOpen && (
          <div className="custom-scrollbar max-h-[48vh] space-y-2.5 overflow-y-auto pr-1">
        <p className="px-1 text-[9px] leading-snug text-slate-500">
          Locations:{" "}
          <a
            href={LOCATION_API_ORIGIN}
            target="_blank"
            rel="noreferrer"
            className="text-cg-accent/90 underline-offset-2 hover:underline"
          >
            Location API
          </a>
        </p>
        {s.locationApiError && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
            {s.locationApiError}
          </p>
        )}
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-500">Country</span>
            <select
              className={selectCls}
              disabled={s.locationApiLoading && s.locationCountries.length === 0}
              value={s.filterCountryCode}
              onChange={(e) => s.setFilterCountryCode(e.target.value)}
            >
              {s.locationCountries.length === 0 ? (
                <option value={s.filterCountryCode}>{s.filterCountryCode || "Loading…"}</option>
              ) : (
                s.locationCountries.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name} ({c.iso2})
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-500">State / UT</span>
            <select
              className={selectCls}
              disabled={s.locationApiLoading && s.locationStates.length === 0}
              value={s.filterStateCode}
              onChange={(e) => s.setFilterStateCode(e.target.value)}
            >
              {s.locationStates.length === 0 ? (
                <option value={s.filterStateCode}>
                  {s.locationApiLoading ? "Loading states…" : "No states for this country"}
                </option>
              ) : (
                <>
                  <option value="">Select state…</option>
                  {s.locationStates.map((st) => (
                    <option key={st.state_code} value={st.state_code}>
                      {st.name} ({st.state_code})
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          {!s.isMaharashtraContext && s.filterStateCode && (
            <p className="rounded-md border border-slate-200 bg-white px-2 py-2 text-[10px] leading-relaxed text-slate-500">
              Farm polygons, taluka, and village lists in this demo are scoped to{" "}
              <strong className="text-slate-700">Maharashtra (MH)</strong>. Select Maharashtra to enable the
              full map.
            </p>
          )}
          {s.isMaharashtraContext && (
            <>
              <label className="block">
                <span className="mb-1 block text-[10px] text-slate-500">District</span>
                <select
                  className={selectCls}
                  value={s.district}
                  onChange={(e) => s.setDistrict(e.target.value)}
                >
                  <option value="">All districts — state view</option>
                  {s.MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-slate-500">Taluka</span>
                <select
                  className={selectCls}
                  value={s.taluka}
                  onChange={(e) => s.setTaluka(e.target.value)}
                >
                  <option value="">All</option>
                  {s.talukaOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-slate-500">Village</span>
                <select
                  className={selectCls}
                  value={s.village}
                  onChange={(e) => s.setVillage(e.target.value)}
                >
                  <option value="">All</option>
                  {s.villageOptions.slice(0, 400).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-500">Season</span>
            <select className={selectCls} value={s.season} onChange={(e) => s.setSeason(e.target.value)}>
              <option value="Kharif">Kharif {s.year}</option>
              <option value="Rabi">Rabi {s.year}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-slate-500">Crop</span>
            <select className={selectCls} value={s.crop} onChange={(e) => s.setCrop(e.target.value)}>
              <option value="">All crops</option>
              <option value="Soybean">Soybean</option>
              <option value="Banana">Banana</option>
              <option value="Cotton">Cotton</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-cg-accent py-2.5 text-[12px] font-bold text-[#0c2214] shadow-md shadow-cg-accent/20 hover:brightness-110 active:scale-[0.99]"
        >
          Apply filters
        </button>
          </div>
        )}
      </div>
    </aside>
  );
}
