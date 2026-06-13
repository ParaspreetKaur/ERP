const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  teacherId: {
    type: String,
    ref: "Teacher",
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    enum: ["CSE", "IT", "BOTH", "ALL"],
    default: "ALL"
  },
  targetAudience: {
    type: String,
    enum: ["All Students", "CSE Only", "IT Only", "Both Branches"],
    default: "All Students"
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Announcement", AnnouncementSchema);