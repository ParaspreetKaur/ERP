const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema({
  title: String,
  subject: String,
  description: String,
  dueDate: Date,

  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher"
  },

  branch: String,
  course: String,
  
  // ADD THIS FIELD
  maxMarks: {
    type: Number,
    default: 10,
    min: 1,
    max: 10
  },

  status: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Assignment", AssignmentSchema);