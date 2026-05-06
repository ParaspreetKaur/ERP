const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/erp')
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Routes
const studentRoutes = require('./routes/student');
app.use('/api/students', studentRoutes);

// Test route
app.get('/', (req, res) => {
  res.send("Backend Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});