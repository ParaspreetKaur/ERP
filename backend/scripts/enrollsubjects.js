const mongoose = require("mongoose");
require("dotenv").config();

const studentSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  course: String,
  enrolledSubjects: Array
});

const Student = mongoose.model("Student", studentSchema);

// MATCH YOUR ACTUAL TEACHER SUBJECTS
const branchSubjects = {
  CSE: ["DSA", "OS", "DBMS", "STQM", "CN"],
  IT: ["Web", "SE", "Cloud", "Mobile", "CN"]
};

const subjectTeacherMapping = {
  "DSA": { teacherId: "T001", teacherName: "T1" },
  "OS": { teacherId: "T001", teacherName: "T1" },
  "DBMS": { teacherId: "T002", teacherName: "T2" },
  "STQM": { teacherId: "T002", teacherName: "T2" },
  "CN": { teacherId: "T005", teacherName: "T5" },
  "Web": { teacherId: "T003", teacherName: "T3" },
  "SE": { teacherId: "T003", teacherName: "T3" },
  "Cloud": { teacherId: "T004", teacherName: "T4" },
  "Mobile": { teacherId: "T004", teacherName: "T4" }
};

async function enrollStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const students = await Student.find({});
    
    for (let student of students) {
      const subjects = branchSubjects[student.course] || [];
      
      const enrolledWithTeachers = subjects.map(subjectName => {
        const teacherInfo = subjectTeacherMapping[subjectName];
        return {
          subjectName: subjectName,
          subjectCode: subjectName.substring(0, 4).toUpperCase(),
          teacherId: teacherInfo?.teacherId || "T005",
          teacherName: teacherInfo?.teacherName || "T5"
        };
      });
      
      student.enrolledSubjects = enrolledWithTeachers;
      await student.save();
      console.log(` ${student.name} - Enrolled in ${subjects.length} subjects`);
    }
    
    console.log("Enrollment complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

enrollStudents();