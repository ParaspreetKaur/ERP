const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Student = require("./models/Student");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));


// SUBJECTS

const CSE_SUBJECTS = ["DSA", "OS", "DBMS", "CN", "STQM"];
const IT_SUBJECTS = ["Web", "SE", "Cloud", "Mobile", "CN"];


// COURSE - BRANCH MAP

function mapCourseToBranch(course) {
  return course;
}

// ATTENDANCE GENERATOR

function generateAttendance(branch) {

  const subjects =
    branch === "CSE" ? CSE_SUBJECTS : IT_SUBJECTS;

  const baseDate = new Date("2026-05-01");
  const attendance = [];

  for (let i = 0; i < 5; i++) {

    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const status = Math.random() > 0.3 ? "Present" : "Absent";

    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);

    attendance.push({
      subject,
      status,
      date
    });
  }

  return attendance;
}

// CREATE STUDENTS

async function createStudents() {

  try {

    const hashedPassword = await bcrypt.hash("123456", 10);

    const students = [
  { studentId: "ST101", name: "Siya", course: "CSE", cgpa: 0 },
  { studentId: "ST102", name: "Aarav", course: "IT", cgpa: 0 },
  { studentId: "ST103", name: "Isha", course: "CSE", cgpa: 0 },
  { studentId: "ST104", name: "Rohan", course: "IT", cgpa: 0 },
  { studentId: "ST105", name: "Ananya", course: "CSE", cgpa: 0 },
  { studentId: "ST106", name: "Kabir", course: "IT", cgpa: 0 },
  { studentId: "ST107", name: "Meera", course: "CSE", cgpa: 0 },
  { studentId: "ST108", name: "Arjun", course: "CSE", cgpa: 0 },
  { studentId: "ST109", name: "Kavya", course: "IT", cgpa: 0 },
  { studentId: "ST110", name: "Vivaan", course: "CSE", cgpa: 0 }
];
   

    for (let i = 0; i < students.length; i++) {

      const s = students[i];

      const branch = mapCourseToBranch(s.course);

      await Student.findOneAndUpdate(
        { studentId: s.studentId },
        {
          $set: {
            password: hashedPassword,
            name: s.name,
            email: `${s.name.toLowerCase()}@gmail.com`,
            course: s.course,
            branch: branch,
            cgpa: s.cgpa,

            attendance: [],

            marks: []
          }
        },
        { upsert: true, new: true }
      );
    }

    console.log("10 students created successfully");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

createStudents();