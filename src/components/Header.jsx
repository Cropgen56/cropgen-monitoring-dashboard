import React from "react";
import { Bell, Settings } from "lucide-react";
import userImg from "../assets/profile/user-image.jpg";
import logo from "../assets/common/logo.svg";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function Header() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});

  const navItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Farmers", path: "/" },
    { name: "Blog", path: "/" },
    { name: "Crop Info", path: "/" },
    { name: "Organization", path: "/" },
  ];

  const avatarSrc = user?.avatar ? user.avatar : userImg;

  return (
    <header className="bg-cg-bg/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-1150">
      <div className="w-full px-3 sm:px-4 md:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => {
              navigate("/");
            }}
          >
            <img src={logo} alt="CropGEN Logo" className="h-10 w-auto" />
            <span className="text-xl font-bold">CropGen</span>
          </div>

          {/* Navigation - Hidden on mobile/tablet, visible on desktop */}
          <nav className="hidden lg:flex flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 sm:gap-2 bg-[#354A3D] rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 w-fit mx-auto">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 rounded-full text-[10px] sm:text-xs md:text-sm cursor-pointer transition-colors whitespace-nowrap
      ${
        item.name === "Dashboard"
          ? "bg-[#0C2214] text-white"
          : "text-gray-300 hover:text-white hover:bg-[#0C2214]/70"
      }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0 ml-auto lg:ml-0">
            {/* Notification Bell */}
            <button className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-cg-panel flex items-center justify-center text-gray-300 hover:text-white transition-colors">
              <Bell
                size={14}
                className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]"
              />
            </button>

            {/* Settings */}
            <button className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-cg-panel flex items-center justify-center text-gray-300 hover:text-white transition-colors">
              <Settings
                size={14}
                className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]"
              />
            </button>

            {/* Profile Picture */}
            {/* <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-[url('https://picsum.photos/seed/p/40/40')] bg-cover border sm:border-2 border-cg-accent/30" /> */}
            <button
              onClick={() => navigate("/profile")}
              className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full overflow-hidden border sm:border-2 border-cg-accent/30 cursor-pointer"
              title="Profile"
            >
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
11;
