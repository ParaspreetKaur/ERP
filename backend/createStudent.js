const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Student = require("./models/Student");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const subjects = ["Math", "Computer", "DBMS", "Physics"];

function generateAttendance() {
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

async function createStudents() {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const students = [
      { studentId: "ST101", name: "Siya", course: "CS", cgpa: 8.2 },
      { studentId: "ST102", name: "Aarav", course: "IT", cgpa: 7.5 },
      { studentId: "ST103", name: "Isha", course: "ECE", cgpa: 8.8 },
      { studentId: "ST104", name: "Rohan", course: "ME", cgpa: 6.9 },
      { studentId: "ST105", name: "Ananya", course: "CS", cgpa: 9.0 },
      { studentId: "ST106", name: "Kabir", course: "IT", cgpa: 7.2 },
      { studentId: "ST107", name: "Meera", course: "CE", cgpa: 8.1 },
      { studentId: "ST108", name: "Arjun", course: "CS", cgpa: 7.9 },
      { studentId: "ST109", name: "Kavya", course: "IT", cgpa: 8.4 },
      { studentId: "ST110", name: "Vivaan", course: "ECE", cgpa: 7.0 }
    ];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];

      await Student.findOneAndUpdate(
        { studentId: s.studentId },
        {
          $set: {
            password: hashedPassword,
            name: s.name,
            email: `${s.name.toLowerCase()}@gmail.com`,
            course: s.course,
            cgpa: s.cgpa,

            // ✅ UNIQUE PER STUDENT
            attendance: generateAttendance(),

            assignments: [
              {
                title: "Mini Project",
                subject: "Computer",
                dueDate: new Date("2026-05-20"),
                status: Math.random() > 0.5 ? "Pending" : "Submitted"
              }
            ],

            marks: [
              {
                subject: "Math",
                marks: 65 + Math.floor(Math.random() * 20)
              }
            ]
          }
        },
        { upsert: true, new: true }
      );
    }

    console.log("✅ 10 students created with realistic attendance");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

createStudents();