import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FieldDataProvider } from "./context/FieldDataContext";
import { AuthProvider } from "./context/AuthContext";
import { AgriPlatformProvider } from "./context/AgriPlatformContext";
import RequireAuth from "./components/auth/RequireAuth";
import RootRedirect from "./components/auth/RootRedirect";
import AdminAppLayout from "./layouts/AdminAppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardOverviewPage from "./pages/DashboardOverviewPage";
import SurveyPage from "./pages/SurveyPage";
import AdminPage from "./pages/AdminPage";
import AIInsightsPage from "./pages/AIInsightsPage";
import GovernancePage from "./pages/GovernancePage";
import {
  VerificationsModulePage,
  SchemesModulePage,
  InsuranceModulePage,
  GrievancesModulePage,
  ReportsModulePage,
  AlertsModulePage,
  ActionsModulePage,
  UsersModulePage,
  SettingsModulePage,
} from "./pages/ModulePlaceholderPage";

export default function App() {
  return (
    <FieldDataProvider>
      <BrowserRouter>
        <AuthProvider>
          <AgriPlatformProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AdminAppLayout />}>
                  <Route path="/dashboard" element={<DashboardOverviewPage />} />
                  <Route path="/governance" element={<GovernancePage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/survey" element={<SurveyPage />} />
                  <Route path="/verifications" element={<VerificationsModulePage />} />
                  <Route path="/schemes" element={<SchemesModulePage />} />
                  <Route path="/insurance" element={<InsuranceModulePage />} />
                  <Route path="/grievances" element={<GrievancesModulePage />} />
                  <Route path="/reports" element={<ReportsModulePage />} />
                  <Route path="/alerts" element={<AlertsModulePage />} />
                  <Route path="/actions" element={<ActionsModulePage />} />
                  <Route path="/users" element={<UsersModulePage />} />
                  <Route path="/settings" element={<SettingsModulePage />} />
                  <Route path="/ai" element={<AIInsightsPage />} />
                </Route>
              </Route>
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </AgriPlatformProvider>
        </AuthProvider>
      </BrowserRouter>
    </FieldDataProvider>
  );
}
