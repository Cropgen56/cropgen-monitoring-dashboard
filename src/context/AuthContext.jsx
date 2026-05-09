import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import {
  readStoredSession,
  writeSession,
  clearSession,
  credentialsMatch,
  DEMO_ADMIN_EMAIL,
} from "../auth/demoAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored) setUser({ email: stored.email });
    setReady(true);
  }, []);

  const login = useCallback((email, password) => {
    if (!credentialsMatch(email, password)) return false;
    writeSession();
    setUser({ email: DEMO_ADMIN_EMAIL });
    return true;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [ready, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
