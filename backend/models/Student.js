const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  name: String,
  email: String,
  course: String,

  cgpa: Number,   // better as Number (not String)

  attendance: [
    {
      subject: String, // <--- Add this!
      date: Date,
      status: {
        type: String,
        enum: ["Present", "Absent"]
      }
    }
  ],

  assignments: [
    {
      title: String,
      subject: String,
      dueDate: Date,
      status: {
        type: String,
        enum: ["Pending", "Submitted"]
      }
    }
  ],

  marks: [
    {
      subject: String,
      marks: Number
    }
  ]

});

module.exports = mongoose.model("Student", StudentSchema);