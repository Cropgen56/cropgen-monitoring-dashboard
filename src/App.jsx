import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Header from "./components/Header";
import SoilHealth from "./components/SoilHealth";
import TimeSeriesCharts from "./components/TimeSeriesCharts";
import SearchBar from "./components/SearchBar";
import { FieldDataProvider } from "./context/FieldDataContext";
import { AgriPlatformProvider } from "./context/AgriPlatformContext";
import SurveyPage from "./pages/SurveyPage";
import AdminPage from "./pages/AdminPage";
import AIInsightsPage from "./pages/AIInsightsPage";

function PlatformShell() {
  return (
    <AgriPlatformProvider>
      <Outlet />
    </AgriPlatformProvider>
  );
}

export default function App() {
  return (
    <FieldDataProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-cg-bg font-sans text-sm text-white overflow-x-hidden">
          <Header />

          <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-8 sm:pb-12 md:pb-16">
            <div className="mb-3 sm:mb-4 lg:max-w-3xl">
              <SearchBar onLocationSelect={() => {}} />
            </div>

            <Routes>
              <Route element={<PlatformShell />}>
                <Route path="/" element={<Navigate to="/survey" replace />} />
                <Route path="/survey" element={<SurveyPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/ai" element={<AIInsightsPage />} />
              </Route>
            </Routes>

            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 md:space-y-6">
              <SoilHealth />
              <TimeSeriesCharts />
            </div>
          </div>
        </div>
      </BrowserRouter>
    </FieldDataProvider>
  );
}
