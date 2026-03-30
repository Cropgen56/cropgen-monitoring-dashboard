import React from "react";
import { Bell, Settings } from "lucide-react";
import img from "../assets/logo.png";
import { PLATFORM_TAGLINE } from "../data/agriStateData";

export default function Header() {
  const navItems = [
    { name: "AI Admin + Survey", active: true },
    { name: "Maharashtra GIS", active: false },
    { name: "PMFBY / Mahadbt", active: false },
  ];

  return (
    <header className="bg-cg-bg/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-1150">
      <div className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center shrink-0 gap-3">
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

          <nav className="hidden lg:flex flex-1 overflow-x-auto scrollbar-hide min-w-0">
            <div className="flex gap-1 sm:gap-2 bg-[#354A3D] rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 w-fit mx-auto">
              {navItems.map((item) => (
                <span
                  key={item.name}
                  className={`px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 rounded-full text-[10px] sm:text-xs md:text-sm cursor-default whitespace-nowrap ${
                    item.active
                      ? "bg-[#0C2214] text-white"
                      : "text-gray-300"
                  }`}
                >
                  {item.name}
                </span>
              ))}
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