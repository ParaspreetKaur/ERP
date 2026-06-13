const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    unique: true,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  email: {
    type: String
  },

  password: {
    type: String,
    required: true
  },

  branch: {
    type: String,
    enum: ["CSE", "IT", "BOTH"],
    required: true
  },

  subjects: {
    type: [String],  
    required: true
  }
});



module.exports = mongoose.model("Teacher", teacherSchema);