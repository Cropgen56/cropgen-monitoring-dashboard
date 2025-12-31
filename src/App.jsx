import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Header from "./components/Header";

import {
  refreshAccessToken,
  fetchUserProfile,
} from "./redux/slice/authSlice";

const ProtectedRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.token);
  const location = useLocation();

  return token ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
};

const LoginRoute = () => {
  const token = useSelector((state) => state.auth.token);
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  return token ? <Navigate to={redirectTo} replace /> : <Login />;
};

export default function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await dispatch(refreshAccessToken()).unwrap();
        if (res?.accessToken) {
          await dispatch(fetchUserProfile());
        }
      } catch (err) {
        console.log("No active session");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [dispatch]);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, token, user]);

  if (loading) return null; 

  return (
    <div className="min-h-screen bg-cg-bg font-sans text-sm text-white overflow-x-hidden">
      {token && <Header />}

      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
