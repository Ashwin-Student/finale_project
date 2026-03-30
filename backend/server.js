// server.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// ---- In-memory “databases” ----
// These are just arrays to hold data temporarily
const users = [];
const batches = [];
const recommendations = [];
const newTable = []; // add your extra table here

// ---- Routes ----

// Base route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ---- Users ----
app.get("/users", (req, res) => {
  res.json(users);
});

app.post("/users", (req, res) => {
  const newUser = { id: users.length + 1, ...req.body };
  users.push(newUser);
  res.json(newUser);
});

// ---- Batches ----
app.get("/batches", (req, res) => {
  res.json(batches);
});

app.post("/batches", (req, res) => {
  const newBatch = { id: batches.length + 1, ...req.body };
  batches.push(newBatch);
  res.json(newBatch);
});

// ---- Recommendations ----
app.get("/recommendations", (req, res) => {
  res.json(recommendations);
});

app.post("/recommendations", (req, res) => {
  const newRecommendation = { id: recommendations.length + 1, ...req.body };
  recommendations.push(newRecommendation);
  res.json(newRecommendation);
});

// ---- Extra Table Example ----
app.get("/newtable", (req, res) => {
  res.json(newTable);
});

app.post("/newtable", (req, res) => {
  const newItem = { id: newTable.length + 1, ...req.body };
  newTable.push(newItem);
  res.json(newItem);
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});