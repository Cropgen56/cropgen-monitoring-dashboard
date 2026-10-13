import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Satellite, Contact2, Leaf } from "lucide-react";

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors";

const navIcon = "h-[18px] w-[18px] shrink-0 opacity-90";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/survey", label: "Crop Monitoring", icon: Satellite },
  { to: "/admin", label: "Farmer Mapping", icon: Users },
  { to: "/farmers", label: "Farmer registry", icon: Contact2 },
];

export default function DashboardSidebar() {
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
    </aside>
  );
}
