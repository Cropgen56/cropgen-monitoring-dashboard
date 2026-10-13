import React, { createContext, useContext } from "react";
import useFieldDelineation from "../hooks/useFieldDelineation";

const FieldDelineationContext = createContext(null);

/** One delineation session + saved results shared by every map in the app. */
export function FieldDelineationProvider({ children }) {
  const value = useFieldDelineation();
  return (
    <FieldDelineationContext.Provider value={value}>{children}</FieldDelineationContext.Provider>
  );
}

export function useFieldDelineationContext() {
  const ctx = useContext(FieldDelineationContext);
  if (!ctx) {
    throw new Error("useFieldDelineationContext must be used within FieldDelineationProvider");
  }
  return ctx;
}
