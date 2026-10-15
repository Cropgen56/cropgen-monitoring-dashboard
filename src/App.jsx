import React from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AgriPlatformProvider } from "./context/AgriPlatformContext";
import { FieldDelineationProvider } from "./context/FieldDelineationContext";
import RequireAuth from "./components/auth/RequireAuth";
import RootRedirect from "./components/auth/RootRedirect";
import AdminAppLayout from "./layouts/AdminAppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardOverviewPage from "./pages/DashboardOverviewPage";
import SurveyPage from "./pages/SurveyPage";
import CropMonitoringPage from "./pages/CropMonitoringPage";
import FarmReportPage from "./pages/FarmReportPage";
import BoundaryDelineationPage from "./pages/BoundaryDelineationPage";
import FarmersRegistryPage from "./pages/FarmersRegistryPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AgriPlatformProvider>
          <FieldDelineationProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AdminAppLayout />}>
                  <Route path="/dashboard" element={<DashboardOverviewPage />} />
                  <Route path="/boundary-delineation" element={<BoundaryDelineationPage />} />
                  <Route path="/survey" element={<SurveyPage />} />
                  <Route path="/crop-monitoring" element={<CropMonitoringPage />} />
                  <Route path="/farm-report" element={<FarmReportPage />} />
                  {/* Old "Farmer Mapping" URL */}
                  <Route path="/admin" element={<Navigate to="/farm-report" replace />} />
                  <Route path="/farmers" element={<FarmersRegistryPage />} />
                </Route>
              </Route>
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </FieldDelineationProvider>
        </AgriPlatformProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
