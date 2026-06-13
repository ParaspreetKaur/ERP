const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Teacher = require("./models/Teacher");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const teachers = [
  { teacherId: "T001", name: "T1", branch: "CSE", subjects: ["DSA", "OS"] },
  { teacherId: "T002", name: "T2", branch: "CSE", subjects: ["DBMS", "STQM"] },
  { teacherId: "T003", name: "T3", branch: "IT", subjects: ["Web", "SE"] },
  { teacherId: "T004", name: "T4", branch: "IT", subjects: ["Cloud", "Mobile"] },
  { teacherId: "T005", name: "T5", branch: "BOTH", subjects: ["CN"] }
];

async function createTeachers() {
  try {

    const hashedPassword = await bcrypt.hash("123456", 10);

    for (let t of teachers) {

      await Teacher.findOneAndUpdate(
        { teacherId: t.teacherId },
        {
          $set: {
            teacherId: t.teacherId,
            name: t.name,
            branch: t.branch,
            subjects: t.subjects,

            // ADD PASSWORD 
            password: hashedPassword
          }
        },
        { upsert: true }
      );

    }

    console.log(" Teachers created with passwords");

  } catch (err) {
    console.log(err);
  } finally {
    mongoose.disconnect();
  }
}

createTeachers();