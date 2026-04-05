import React, { createContext, useContext } from "react";
import { useAgriPlatformState } from "../hooks/useAgriPlatformState";

const AgriPlatformContext = createContext(null);

export function AgriPlatformProvider({ children }) {
  const value = useAgriPlatformState();
  return (
    <AgriPlatformContext.Provider value={value}>{children}</AgriPlatformContext.Provider>
  );
}

export function useAgriPlatform() {
  const ctx = useContext(AgriPlatformContext);
  if (!ctx) {
    throw new Error("useAgriPlatform must be used within AgriPlatformProvider");
  }
  return ctx;
}
