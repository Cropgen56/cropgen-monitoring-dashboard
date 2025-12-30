// src/api/index.js
import axios from "axios";
import { refreshAccessToken, logout } from "../redux/slice/authSlice";
import { decodeJWT } from "../utils/decodeJWT";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

let store;

export const setStore = (storeInstance) => {
  store = storeInstance;
};

let isRefreshing = false;
let requestQueue = [];

// Resolve/reject all queued requests once refresh completes
const processQueue = (error, token = null) => {
  requestQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  requestQueue = [];
};

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  async (config) => {
    if (!store) return config;

    let token = store.getState().auth.token;
    if (!token) return config; // user not logged in yet

    try {
      const decoded = decodeJWT(token);

      if (decoded?.exp) {
        const now = Date.now();
        const expiry = decoded.exp * 1000;

        // Refresh if token will expire in the next 2 minutes
        const shouldRefresh = expiry - now < 2 * 60 * 1000;

        if (shouldRefresh) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const result = await store
                .dispatch(refreshAccessToken())
                .unwrap();
              token = result.accessToken;

              api.defaults.headers.Authorization = `Bearer ${token}`;
              processQueue(null, token);
            } catch (err) {
              processQueue(err, null);
              store.dispatch(logout());
              return Promise.reject(err);
            } finally {
              isRefreshing = false;
            }
          } else {
            // Wait for ongoing refresh
            const newToken = await new Promise((resolve, reject) => {
              requestQueue.push({ resolve, reject });
            });
            token = newToken;
          }
        }
      }

      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (e) {
      console.error("Request interceptor error:", e);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry && store) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const result = await store.dispatch(refreshAccessToken()).unwrap();
          const token = result.accessToken;

          api.defaults.headers.Authorization = `Bearer ${token}`;
          processQueue(null, token);

          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        } catch (err) {
          processQueue(err, null);
          store.dispatch(logout());
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      // If a refresh is already in progress, queue this request
      return new Promise((resolve, reject) => {
        requestQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
