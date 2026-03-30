// src/api.ts → Backend API handler
import axios, { AxiosInstance } from "axios";

// ----------------- AXIOS API -----------------
const API_BASE = "http://127.0.0.1:5000"; // Your Flask backend
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// ----------------- AUTH -----------------

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await api.post("/login", { email, password });
    return response.data; // Expected: { user: { user_id, name, email, role } }
  } catch (error: any) {
    console.error("Login error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
  role: string;
}) => {
  try {
    const response = await api.post("/register", userData);
    return response.data; // Expected: { user: { user_id, name, email, role } }
  } catch (error: any) {
    console.error("Register error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// ----------------- USERS -----------------

export const addUserData = async (data: any) => {
  try {
    const response = await api.post("/users", data);
    return response.data;
  } catch (error: any) {
    console.error("Add user data error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getUserData = async () => {
  try {
    const response = await api.get("/users");
    return response.data;
  } catch (error: any) {
    console.error("Get user data error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// ----------------- SEED BATCH -----------------

export const addBatch = async (batch: any) => {
  try {
    const response = await api.post("/batches", batch);
    return response.data;
  } catch (error: any) {
    console.error("Add batch error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const getBatchById = async (batchId: string) => {
  try {
    const response = await api.get(`/batches/${batchId}`);
    return response.data;
  } catch (error: any) {
    console.error("Get batch error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// ----------------- STATS -----------------
export const getStats = async () => {
  try {
    const response = await api.get("/stats");
    return response.data;
  } catch (error: any) {
    console.error("Get stats error:", error.response?.data || error.message);
    return { active_batches: 0 };
  }
};

// ----------------- BLOCKCHAIN ROLE BOOTSTRAP -----------------
export const addManufacturerBC = async (address: string) => {
  const response = await api.post("/bc/add_manufacturer", { address });
  return response.data;
};

export const addDistributorBC = async (address: string) => {
  const response = await api.post("/bc/add_distributor", { address });
  return response.data;
};

export const addRetailerBC = async (address: string) => {
  const response = await api.post("/bc/add_retailer", { address });
  return response.data;
};

export const syncDistributorReceiveBC = async (payload: {
  batch_id: string;
  warehouse: string;
  tx_hash?: string;
}) => {
  const response = await api.post("/bc/distributor_receive", {
    ...payload,
    already_on_blockchain: true,
  });
  return response.data;
};

export const syncDistributorDispatchBC = async (payload: {
  batch_id: string;
  mode: string | number;
  vehicle: string;
  tx_hash?: string;
}) => {
  const response = await api.post("/bc/distributor_dispatch", {
    ...payload,
    already_on_blockchain: true,
  });
  return response.data;
};

export const syncRetailerReceiveBC = async (payload: {
  batch_id: string;
  price: string | number;
  tx_hash?: string;
}) => {
  const response = await api.post("/bc/retailer_receive", {
    ...payload,
    already_on_blockchain: true,
  });
  return response.data;
};

export const getBatchSQL = async (batchId: string) => {
  const response = await api.get(`/bc/get_batch_sql/${encodeURIComponent(batchId)}`);
  return response.data;
};

export const listBatchesSQL = async () => {
  const response = await api.get("/bc/list_batches");
  return response.data;
};

// ----------------- EXPORT -----------------
export default api;
