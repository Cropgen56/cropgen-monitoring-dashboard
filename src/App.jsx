// import { Routes, Route } from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import Login from "./pages/Login";
// import { refreshAccessToken } from "./redux/slice/authSlice";
// import { useEffect } from "react";
// import { useDispatch } from "react-redux";
// import Profile from "./pages/Profile";
// import Header from "./components/Header";

// export default function App() {
//   const dispatch = useDispatch();

//   useEffect(() => {
//     dispatch(refreshAccessToken());
//   }, [dispatch]);

//   return (
//     <div className="min-h-screen bg-cg-bg font-sans text-sm text-white overflow-x-hidden">
//       <Header />

//       <Routes>
//         <Route path="/" element={<Dashboard />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/profile" element={<Profile />} />
//       </Routes>
//     </div>
//   );
// }


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

/* ---------------- Protected Route ---------------- */
const ProtectedRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.token);
  const location = useLocation();

  return token ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
};

/* ---------------- Login Route ---------------- */
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

  /* ---------- App load: refresh token ---------- */
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

  /* ---------- Token exists but user not loaded ---------- */
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, token, user]);

  if (loading) return null; // or loader

  return (
    <div className="min-h-screen bg-cg-bg font-sans text-sm text-white overflow-x-hidden">
      {/* Header only when logged in */}
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

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
