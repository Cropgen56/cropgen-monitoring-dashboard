import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slice/authSlice";
import farmReducer from "./slice/farmSlice";
import cropReducer from "./slice/cropSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    farm: farmReducer,
    crop: cropReducer
  },
});
