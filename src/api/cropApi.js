import axios from "axios";
import { API_BASE_URL } from "../config/endpoints.js";

// Create axios instance with base config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get crop list
export const getCropList = async () => {
  try {
    const response = await api.get('/crop/get-crop-list');
    return response.data;
  } catch (error) {
    console.error('Error fetching crop list:', error);
    throw error;
  }
};

// Export the api instance if needed elsewhere
export default api;