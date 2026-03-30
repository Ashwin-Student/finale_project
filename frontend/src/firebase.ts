// src/firebase.ts → Backend API handler
import axios, { AxiosInstance } from "axios";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";

// ----------------- FIREBASE CONFIG -----------------
const firebaseConfig = {
  apiKey: "AIzaSyDVxoJD_ZC-RPtOHU5MiQn1gFmD3JoJJJQ",
  authDomain: "gen-lang-client-0318133611.firebaseapp.com",
  projectId: "gen-lang-client-0318133611",
  storageBucket: "gen-lang-client-0318133611.firebasestorage.app",
  messagingSenderId: "399499969604",
  appId: "1:399499969604:web:fc61fa562fe540ed8f6811"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export Firestore functions for convenience
export { 
  doc, getDoc, setDoc, addDoc, collection, 
  serverTimestamp, query, where, getDocs, 
  updateDoc, arrayUnion, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, onAuthStateChanged 
};

// Listen to auth state changes
export const onUserStateChange = (callback: (user: User | null) => void) => {
  onAuthStateChanged(auth, callback);
};

// Login helper
export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (err) {
    console.error("Firebase login error:", err);
    return null;
  }
};

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
    return response.data; // Expected: { user: { id, name, email, role } }
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
    return response.data; // Expected: { user: { id, name, email, role } }
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

// ----------------- EXPORT -----------------
export default api;