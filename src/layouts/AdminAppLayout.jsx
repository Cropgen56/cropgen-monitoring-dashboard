import React from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "../components/admin-shell/DashboardSidebar";
import DashboardTopBar from "../components/admin-shell/DashboardTopBar";

/**
 * Admin shell: fixed sidebar + top bar + scrollable main (matches design mock).
 */
export default function AdminAppLayout() {
  return (
    <div className="flex min-h-screen bg-[#0a0e12] text-[13px] text-gray-200 font-sans antialiased">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0e12]">
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-white/[0.06] bg-[#080b0f] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
          <span>
            All impact scores and predictions are generated using AI models on demo data — not a government
            certification.
          </span>
          <span className="flex items-center gap-2 text-gray-600">
            Last updated: {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </footer>
      </div>
    </div>
  );
}
