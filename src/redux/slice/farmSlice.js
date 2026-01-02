import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

let BASE_URL = "https://server.cropgenapp.com/v1";

// Get ALL fields (farms)
export const getAllFields = createAsyncThunk(
  "farm/getAllFields",
  async (token, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/field/get-all-field`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return res.data.farms || [];
    } catch (err) {
      console.error("Error fetching all fields:", err);
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch fields" }
      );
    }
  }
);

const farmSlice = createSlice({
  name: "farm",
  initialState: {
    farms: [],
    loading: {
      list: false,
      update: false,
      delete: false,
    },

    error: null,
  },
  reducers: {
    clearFarms: (state) => {
      state.farms = [];
      state.error = null;
    },
    updateFarm: (state, action) => {
      state.farms = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllFields.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(getAllFields.fulfilled, (state, action) => {
        state.loading.list = false;
        state.farms = action.payload;
      })
      .addCase(getAllFields.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload?.message || "Failed to fetch fields";
      });
  },
});

export const { clearFarms, updateFarm } = farmSlice.actions;
export default farmSlice.reducer;
