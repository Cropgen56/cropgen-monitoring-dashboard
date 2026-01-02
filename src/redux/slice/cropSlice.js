import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const base_url = "https://server.cropgenapp.com/v1/api";

export const fetchCrops = createAsyncThunk(
  "crop/fetchCrops",
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState()?.auth?.token;

      const res = await axios.get(
        `${base_url}/crop/get-crop-list`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to load crops"
      );
    }
  }
);

const cropSlice = createSlice({
  name: "crop",
  initialState: {
    crops: [],
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(fetchCrops.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCrops.fulfilled, (state, action) => {
        state.loading = false;
        state.crops = action.payload;
      })
      .addCase(fetchCrops.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default cropSlice.reducer;
