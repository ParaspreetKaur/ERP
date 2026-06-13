const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  email: String,
  course: String,
  cgpa: Number,
 
  enrolledSubjects: [{
    subjectName: String,
    subjectCode: String,
    teacherId: String,
    teacherName: String
  }],

  // Marks structure for MTT and ETT
  marks: [{
    subject: String,
    subjectCode: String,
    examType: {
      type: String,
      enum: ["MTT", "ETT"]
    },
    marksObtained: Number,
    maxMarks: Number,
    percentage: Number,
    teacherId: String,
    teacherName: String,
    dateRecorded: { type: Date, default: Date.now }
  }],

  attendance: [{
    subject: String,
    date: Date,
    status: { type: String, enum: ["Present", "Absent"] }
  }]
});

module.exports = mongoose.model("Student", StudentSchema);