import React from "react";
import { NavLink } from "react-router-dom";
import { Bell, LayoutDashboard, Satellite, Settings, Sparkles } from "lucide-react";
import img from "../assets/logo.png";
import { PLATFORM_TAGLINE } from "../data/agriStateData";

const navPill =
  "flex flex-1 min-w-[88px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] sm:text-xs font-semibold transition";

export default function Header() {
  return (
    <header className="bg-cg-bg/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-1150">
      <div className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center shrink-0 gap-3 min-w-0">
              <img
                src={img}
                alt="Logo"
                className="h-6 sm:h-8 md:h-10 lg:h-12 w-auto"
              />
              <p className="hidden md:block max-w-xl text-[10px] sm:text-xs text-gray-400 leading-snug border-l border-white/10 pl-3">
                {PLATFORM_TAGLINE}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0 lg:hidden">
              <button
                type="button"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cg-panel flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <Bell size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cg-panel flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <Settings size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          <nav
            className="flex flex-1 min-w-0 justify-center lg:justify-center"
            aria-label="Main workspace"
          >
            <div className="flex w-full max-w-lg gap-1 sm:gap-1.5 bg-[#354A3D] rounded-full p-1 sm:p-1.5 shadow-inner">
              <NavLink
                to="/survey"
                className={({ isActive }) =>
                  `${navPill} ${
                    isActive ? "bg-[#0C2214] text-white shadow-sm" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <Satellite className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" />
                Survey
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${navPill} ${
                    isActive ? "bg-[#0C2214] text-white shadow-sm" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" />
                Admin
              </NavLink>
              <NavLink
                to="/ai"
                className={({ isActive }) =>
                  `${navPill} ${
                    isActive ? "bg-[#0C2214] text-white shadow-sm" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" />
                AI
              </NavLink>
            </div>
          </nav>

          <div className="hidden lg:flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
            <button
              type="button"
              className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-cg-panel flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <Bell size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
            </button>
            <button
              type="button"
              className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-cg-panel flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <Settings size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
            </button>
            <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-[url('https://picsum.photos/seed/p/40/40')] bg-cover border sm:border-2 border-cg-accent/30" />
          </div>
        </div>
      </div>
    </header>
  );
}
