const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
  },

  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assignment"
  },

  fileUrl: String,
  submittedAt: { type: Date, default: Date.now },

  marks: Number,
  feedback: String,
  status: {
    type: String,
    default: "Submitted"
  }

});

module.exports = mongoose.model("Submission", SubmissionSchema);