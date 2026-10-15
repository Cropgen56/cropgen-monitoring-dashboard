import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DashboardSidebar from "../components/admin-shell/DashboardSidebar";
import DashboardTopBar from "../components/admin-shell/DashboardTopBar";

/**
 * Admin shell: sidebar + top bar + scrollable main. From `lg` up the sidebar is fixed beside
 * the content; below it, it is a slide-out menu opened from the top bar.
 */
export default function AdminAppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu after navigating.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-shell-bg flex min-h-screen text-[13px] text-gray-200 font-sans antialiased selection:bg-cg-accent/25 selection:text-white">
      <DashboardSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar onOpenMenu={() => setNavOpen(true)} />
        <main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-white/[0.06] bg-[#070a0e]/95 px-3 py-2.5 sm:px-4 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-[10px] text-gray-500 leading-snug">
          <span className="max-w-[56rem]">
            Risk and yield indicators are model-assisted and intended for programme monitoring — not a statutory
            certification. Official decisions remain with department workflow.
          </span>
          <span className="shrink-0 tabular-nums text-gray-600">
            Session · {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </footer>
      </div>
    </div>
  );
}
