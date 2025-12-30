import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slice/authSlice";
import farmReducer from "./slice/farmSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    farm: farmReducer,
  },
});
