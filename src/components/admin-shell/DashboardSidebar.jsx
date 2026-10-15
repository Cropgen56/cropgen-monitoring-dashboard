import React, { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Satellite, Contact2, Activity, ScanLine, LogOut, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors";

const navIcon = "h-[18px] w-[18px] shrink-0 opacity-90";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/boundary-delineation", label: "Boundary Delineation", icon: ScanLine, end: true },
  { to: "/survey", label: "Crop Classification", icon: Satellite, end: true },
  { to: "/crop-monitoring", label: "Crop Monitoring", icon: Activity, end: true },
  { to: "/farm-report", label: "Farm Report", icon: FileText },
  { to: "/farmers", label: "Farmer registry", icon: Contact2 },
];

/**
 * Fixed beside the content from `lg` up; below that a slide-out menu (`open` / `onClose`)
 * with a backdrop, closed by the X button, a tap outside, Escape, or navigating.
 */
export default function DashboardSidebar({ open = false, onClose }) {
  const nav = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
    {open && (
      <div className="fixed inset-0 z-[1250] bg-black/60 backdrop-blur-[1px] lg:hidden" onClick={onClose} aria-hidden />
    )}
    <aside
      id="app-sidebar"
      className={`custom-scrollbar fixed inset-y-0 left-0 z-[1300] flex h-[100dvh] w-[272px] max-w-[85vw] shrink-0 flex-col border-r border-white/[0.06] bg-[#0d1117] transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:max-w-none lg:translate-x-0 ${
        open ? "translate-x-0 shadow-2xl shadow-black/60" : "-translate-x-full"
      }`}
      aria-label="Main menu"
    >
      <div className="border-b border-white/[0.06] px-4 py-5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-white">CropGen AI</p>
            <p className="text-[10px] leading-tight text-gray-500">
              Crop monitoring &amp; administration intelligence
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
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

      <div className="border-t border-white/[0.06] p-2">
        {user?.email && (
          <p className="truncate px-3 pb-1.5 pt-1 text-[10px] text-gray-500" title={user.email}>
            Signed in as {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            logout();
            nav("/login", { replace: true });
          }}
          className={`${navItem} w-full text-gray-400 hover:bg-red-950/40 hover:text-red-200`}
        >
          <LogOut className={navIcon} />
          Logout
        </button>
      </div>
    </aside>
    </>
  );
}
