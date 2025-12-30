import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Get ALL fields (farms)
export const getAllFields = createAsyncThunk(
  "farm/getAllFields",
  async (token, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/field/get-all-field`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return res.data.farms || [];
    } catch (err) {
      console.error("Error fetching all fields:", err);
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch fields" }
      );
    }
  }
);

// Get farms by farmerId
export const getFarmsByFarmerId = createAsyncThunk(
  "farm/getFarmsByFarmerId",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/field/get-field/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return res.data.farmFields || [];
    } catch (err) {
      console.error("Error fetching farms:", err);
      console.error("Error Response:", err.response);
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch farms" }
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
      })
      .addCase(getFarmsByFarmerId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFarmsByFarmerId.fulfilled, (state, action) => {
        // console.log("Farms fetched successfully:", action.payload);
        state.loading = false;
        state.farms = action.payload;
      })
      .addCase(getFarmsByFarmerId.rejected, (state, action) => {
        console.error("Failed to fetch farms:", action.payload);
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch farms";
      });  },
});

export const { clearFarms, updateFarm } = farmSlice.actions;
export default farmSlice.reducer;
