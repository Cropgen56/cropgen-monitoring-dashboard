import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../api.js";

let BASE_URL = "https://server.cropgenapp.com/v1";

export const refreshAccessToken = createAsyncThunk(
  "auth/refreshAccessToken",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.data.accessToken) {
        throw new Error("No access token in response");
      }

      console.log("Token refreshed successfully:", response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Token refresh failed"
      );
    }
  }
);

// Async thunk: login
export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/signin`,
        credentials,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Login failed. Please try again." }
      );
    }
  }
);

// Send OTP
export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async ({ email, token }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/admin-otp`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to send OTP" }
      );
    }
  }
);

// Verify OTP
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/verify`,
        { email, otp },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "OTP verification failed" }
      );
    }
  }
);

// Fetch user profile
export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("No access token found");
      }

      const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Get ALL users
export const getAllUsers = createAsyncThunk(
  "auth/getAllUsers",
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/users?all=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch user details." }
      );
    }
  }
);

// Update user
export const updateUser = createAsyncThunk(
  "auth/updateUser",
  async ({ token, id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `${BASE_URL}/api/auth/update-user/${id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update user." }
      );
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  "auth/uploadAvatar",
  async ({ file, onProgress }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) throw new Error("No access token");

      // Get presigned URL
      const presignRes = await axios.post(
        `${BASE_URL}/api/auth/avatar-presign`,
        { fileType: file.type },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const { uploadUrl, key } = presignRes.data.data;

      // Upload to S3 with progress
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        },
      });

      return { key };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Avatar upload failed"
      );
    }
  }
);

const initialState = {
  user: null,
  token: null,
  role: null,
  // farmers: null,
  allFarmers: null,
  otpSent: false,
  otpVerified: false,
  isError: false,
  errorMessage: "",
  loading: {
    user: false,
    updateUser: false,
    otp: false,
    verifyOtp: false,
    refresh: false,
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.role = null;
      state.otpSent = false;
      state.otpVerified = false;
      state.isError = false;
      state.errorMessage = "";
    },
    clearAuthError(state) {
      state.isError = false;
      state.errorMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Refresh access token
      .addCase(refreshAccessToken.pending, (state) => {
        state.loading.refresh = true;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.loading.refresh = false;
        const { accessToken, user } = action.payload;
        if (accessToken) {
          state.token = accessToken;
          api.defaults.headers.Authorization = `Bearer ${accessToken}`;
        }
        if (user) {
          state.user = user;
          state.role = user.role;
        }
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.loading.refresh = false;
      })

      // Login
      .addCase(loginUser.pending, (state) => {
        state.isError = false;
        state.errorMessage = "";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { token, role } = action.payload;

        if (role === "farmer") {
          state.isError = true;
          state.errorMessage =
            "Login denied: Farmers are not allowed to login here.";
          state.token = null;
          state.role = null;
          alert("Login denied: Farmers are not allowed to login here.");
          return;
        }

        state.token = token;
        state.role = role;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isError = true;
        state.errorMessage = action.payload?.message || "Login failed";
      })

      // Send OTP
      .addCase(sendOtp.pending, (state) => {
        state.loading.otp = true;
        state.isError = false;
        state.errorMessage = "";
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.loading.otp = false;
        state.otpSent = true;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading.otp = false;
        state.isError = true;
        state.errorMessage = action.payload?.message || "Failed to send OTP";
      })

      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.loading.verifyOtp = true;
        state.isError = false;
        state.errorMessage = "";
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading.verifyOtp = false;
        state.otpVerified = true;
        const { accessToken, role } = action.payload;

        if (accessToken) {
          state.token = accessToken;
          state.role = role;
          api.defaults.headers.Authorization = `Bearer ${accessToken}`;
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading.verifyOtp = false;
        state.isError = true;
        state.otpVerified = false;
        state.errorMessage =
          action.payload?.message || "OTP verification failed";
      })

      // Get all users
      .addCase(getAllUsers.pending, (state) => {
        state.loading.farmers = true;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading.farmers = false;
        state.allFarmers = action.payload.users;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading.farmers = false;
        state.isError = true;
        state.errorMessage =
          action.payload?.message || "Failed to fetch users.";
      })

      // Fetch admin user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading.user = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading.user = false;
        state.user = action.payload.user;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading.user = false;
        state.isError = true;
        state.errorMessage =
          action.payload?.message || "Failed to fetch user profile";
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.loading.updateUser = true;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading.updateUser = false;
        if (state.farmers) {
          state.farmers = state.farmers.map((farmer) =>
            farmer._id === action.payload.user._id
              ? action.payload?.user
              : farmer
          );
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading.updateUser = false;
        state.errorMessage =
          action.payload?.message || "Failed to update user.";
      })
      // Upload avatar
      .addCase(uploadAvatar.pending, (state) => {
        state.loading.user = true;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.loading.user = false;

        if (state.user) {
          state.user.avatar = action.payload.key;
        }
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.loading.user = false;
        state.isError = true;
        state.errorMessage = action.payload;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;

export default authSlice.reducer;
