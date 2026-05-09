import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Users,
  Satellite,
  ShieldCheck,
  HandCoins,
  Umbrella,
  MessageSquareWarning,
  FileBarChart,
  Bell,
  Zap,
  UserCog,
  Settings,
  Leaf,
  Sparkles,
} from "lucide-react";
import { useAgriPlatform } from "../../context/AgriPlatformContext";

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors";

const navIcon = "h-[18px] w-[18px] shrink-0 opacity-90";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/governance", label: "Impact Intelligence", icon: Map },
  { to: "/admin", label: "Farmer Mapping", icon: Users },
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
  "w-full rounded-lg border border-white/[0.08] bg-[#0d1219] px-2.5 py-2 text-[12px] text-gray-200 outline-none focus:border-cg-accent/50";

export default function DashboardSidebar() {
  const s = useAgriPlatform();

  return (
    <aside className="custom-scrollbar flex h-screen w-[272px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0d1117]">
      <div className="border-b border-white/[0.06] px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cg-accent/15 text-cg-accent">
            <Leaf className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-white">CropGen</p>
            <p className="text-[10px] leading-tight text-gray-500">
              AI Smart Agriculture Administration System
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
                    : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                }`
              }
            >
              <NavIcon className={navIcon} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3 space-y-2.5 bg-[#0a0d12]">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Quick filters</p>
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">State</span>
            <select className={selectCls} disabled value="Maharashtra">
              <option>Maharashtra</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">District</span>
            <select
              className={selectCls}
              value={s.district}
              onChange={(e) => s.setDistrict(e.target.value)}
            >
              <option value="">All districts</option>
              {s.MAHARASHTRA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">Taluka</span>
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
            <span className="mb-1 block text-[10px] text-gray-500">Village</span>
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
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">Season</span>
            <select className={selectCls} value={s.season} onChange={(e) => s.setSeason(e.target.value)}>
              <option value="Kharif">Kharif {s.year}</option>
              <option value="Rabi">Rabi {s.year}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">Crop</span>
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
          className="w-full rounded-lg bg-cg-accent py-2.5 text-[12px] font-bold text-[#0c2214] shadow-lg shadow-black/30 hover:brightness-110 active:scale-[0.99]"
        >
          Apply filters
        </button>
      </div>
    </aside>
  );
}
