import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const checkHealth = async () => {
  const response = await api.get("/api/health");
  return response.data;
};

export const predictHotspot = async (features) => {
  const response = await api.post("/api/predict", features);
  return response.data;
};

export const calculatePriorityScore = async (payload) => {
  const response = await api.post("/api/calculate-priority", payload);
  return response.data;
};

export const optimizeRoute = async (payload) => {
  const response = await api.post("/api/optimize-route", payload);
  return response.data;
};

export const fetchBins = async () => {
  const response = await api.get("/api/bins");
  return response.data;
};

export const fetchBin = async (binId) => {
  const response = await api.get(`/api/bins/${binId}`);
  return response.data;
};

export const fetchTrucks = async () => {
  const response = await api.get("/api/trucks");
  return response.data;
};

export const fetchCollections = async () => {
  const response = await api.get("/api/collections");
  return response.data;
};

export const recordCollection = async (payload) => {
  const response = await api.post("/api/collections", payload);
  return response.data;
};

export const fetchBinHistory = async (binId) => {
  const response = await api.get(`/api/bin-history/${binId}`);
  return response.data;
};

export default api;
