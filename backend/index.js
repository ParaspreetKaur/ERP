console.log("INDEX.JS RUNNING");

const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
require("./models/Announcement");
const path = require('path');

const app = express();

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Also serve frontend when someone visits root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("DB Error:", err));

// ROUTES 
const studentRoutes = require("./routes/student");
const teacherRoutes = require("./routes/teacher");

// MOUNT ROUTES
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// START SERVER
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});