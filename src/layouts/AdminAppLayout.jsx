import React from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "../components/admin-shell/DashboardSidebar";
import DashboardTopBar from "../components/admin-shell/DashboardTopBar";

/**
 * Admin shell: fixed sidebar + top bar + scrollable main (matches design mock).
 */
export default function AdminAppLayout() {
  return (
    <div className="dashboard-shell-bg flex min-h-screen text-[13px] text-slate-800 font-sans antialiased selection:bg-cg-accent/25 selection:text-white">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 leading-snug">
          <span className="max-w-[56rem]">
            Risk and yield indicators are model-assisted and intended for programme monitoring — not a statutory
            certification. Official decisions remain with department workflow.
          </span>
          <span className="shrink-0 tabular-nums text-slate-500">
            Session · {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </footer>
      </div>
    </div>
  );
}
