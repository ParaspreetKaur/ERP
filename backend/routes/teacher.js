const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// TEST ROUTE

router.get("/test", (req, res) => {
  res.json({ message: "Teacher routes working" });
});


// GET TEACHER PROFILE 

router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id).select("-password");
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    res.json({
      _id: teacher._id,
      teacherId: teacher.teacherId,
      name: teacher.name,
      email: teacher.email,
      branch: teacher.branch,
      subjects: teacher.subjects || []
    });
    
  } catch (err) {
    console.error("Profile error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// ADD TEACHER

router.post("/add", async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN TEACHER

router.post("/login", async (req, res) => {
  try {
    const { teacherId, password } = req.body;
    const teacher = await Teacher.findOne({ teacherId });

    if (!teacher) {
      return res.status(400).json({ message: "Teacher not found" });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: teacher._id, teacherId: teacher.teacherId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      teacher: {
        _id: teacher._id,
        teacherId: teacher.teacherId,
        name: teacher.name,
        branch: teacher.branch,
        subjects: teacher.subjects || []
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET STUDENTS FOR TEACHER (Based on branch and subjects)
router.get("/students/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
// If teacher branch is BOTH, show students from both CSE and IT
let students;
if (teacher.branch === "BOTH") {
  students = await Student.find({ course: { $in: ["CSE", "IT"] } });
} else {
  students = await Student.find({ course: teacher.branch });
}
    res.json({ teacher, students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ASSIGNMENTS CREATION 
router.post("/assignment", async (req, res) => {
  try {
    const { teacherId, title, subject, description, dueDate, maxMarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher ID" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    const marksLimit = maxMarks || 10;
    if (marksLimit < 1 || marksLimit > 10) {
      return res.status(400).json({ message: "Maximum marks must be between 1 and 10" });
    }

    const assignment = new Assignment({
      title,
      subject,
      description,
      dueDate: new Date(dueDate),
      teacherId: teacher._id,
      branch: teacher.branch,
      course: teacher.course || "All",
      maxMarks: marksLimit,
      status: "active"
    });

    await assignment.save();

    res.json({
      message: "Assignment created successfully",
      assignmentId: assignment._id
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// GET SUBMISSIONS

router.get("/submissions/:teacherId", async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacherId: req.params.teacherId });
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate("studentId", "studentId name")
      .populate("assignmentId", "title subject maxMarks");

    const result = submissions.map(s => ({
      submissionId: s._id,
      studentId: s.studentId?.studentId,
      studentName: s.studentId?.name,
      assignmentId: s.assignmentId?._id,
      title: s.assignmentId?.title,
      subject: s.assignmentId?.subject,
      maxMarks: s.assignmentId?.maxMarks || 10,
      submittedAt: s.submittedAt,
      fileUrl: s.fileUrl,
      marks: s.marks,
      status: s.status
    }));

    res.json({ submissions: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GRADE SUBMISSION

router.put("/grade/:submissionId", async (req, res) => {
  try {
    const { marks, feedback, teacherId } = req.body;
    
    const grade = Number(marks);
    if (isNaN(grade) || grade < 1 || grade > 10) {
      return res.status(400).json({ message: "Grade must be between 1 and 10" });
    }

    const submission = await Submission.findById(req.params.submissionId).populate("assignmentId");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (submission.assignmentId.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    submission.marks = grade;
    submission.feedback = feedback || "";
    submission.status = "Graded";
    submission.gradedAt = new Date();

    await submission.save();

    res.json({ message: `Graded successfully: ${grade}/10`, marks: grade });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET STUDENTS FOR MARKS ENTRY 

router.get("/marks/students/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Get teacher's subjects
    const teacherSubjects = teacher.subjects || [];

    // Find students in teacher's branch
    // If teacher branch is BOTH, show students from both CSE and IT
let students;
if (teacher.branch === "BOTH") {
  students = await Student.find({ course: { $in: ["CSE", "IT"] } });
} else {
  students = await Student.find({ course: teacher.branch });
}

    // Filter to only show students enrolled in teacher's subjects
    const studentsWithSubjects = students.map(student => {
      const relevantSubjects = student.enrolledSubjects.filter(
        sub => teacherSubjects.includes(sub.subjectName)
      );
      
      return {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        subjects: relevantSubjects,
        marks: student.marks || []
      };
    }).filter(s => s.subjects.length > 0);

    res.json({
      teacher: {
        name: teacher.name,
        subjects: teacherSubjects,
        branch: teacher.branch
      },
      students: studentsWithSubjects
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ENTER MARKS FOR STUDENT

router.post("/marks/enter", async (req, res) => {
  try {
    const { studentId, subject, examType, marksObtained, maxMarks, teacherId } = req.body;

    // Validate marks (0 to maxMarks)
    if (marksObtained < 0 || marksObtained > maxMarks) {
      return res.status(400).json({ message: `Marks must be between 0 and ${maxMarks}` });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Calculate percentage
    const percentage = (marksObtained / maxMarks) * 100;

    // Check if marks entry already exists for this subject and exam type
    const existingMarkIndex = student.marks.findIndex(
      m => m.subject === subject && m.examType === examType
    );

    const markEntry = {
      subject: subject,
      examType: examType,
      marksObtained: marksObtained,
      maxMarks: maxMarks,
      percentage: percentage,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      dateRecorded: new Date()
    };

    if (existingMarkIndex !== -1) {
      // Update existing marks
      student.marks[existingMarkIndex] = markEntry;
    } else {
      // Add new marks
      student.marks.push(markEntry);
    }

    await student.save();

    res.json({
      success: true,
      message: `Marks entered successfully for ${student.name} - ${subject} (${examType})`,
      marks: markEntry
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET STUDENT MARKS SUMMARY (For teacher view)

router.get("/marks/summary/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const teacherSubjects = teacher.subjects || [];
    
    // Get all students in teacher's branch
// If teacher branch is BOTH, show students from both CSE and IT
let students;
if (teacher.branch === "BOTH") {
  students = await Student.find({ course: { $in: ["CSE", "IT"] } });
} else {
  students = await Student.find({ course: teacher.branch });
}

    // Build marks summary
    const marksSummary = students.map(student => {
      // Get marks only for subjects this teacher teaches
      const studentMarks = student.marks.filter(m => 
        teacherSubjects.includes(m.subject)
      );

      // Group marks by subject
      const subjectMarks = {};
      teacherSubjects.forEach(subject => {
        subjectMarks[subject] = {
          MTT: null,
          ETT: null,
          Assignment: null,
          Quiz: null,
          Practical: null
        };
      });

      studentMarks.forEach(mark => {
        if (subjectMarks[mark.subject]) {
          subjectMarks[mark.subject][mark.examType] = {
            marks: mark.marksObtained,
            max: mark.maxMarks,
            percentage: mark.percentage
          };
        }
      });

      return {
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        subjects: subjectMarks
      };
    });

    res.json({
      teacher: {
        name: teacher.name,
        subjects: teacherSubjects,
        branch: teacher.branch
      },
      students: marksSummary
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET STUDENTS FOR MARKS ENTRY 

router.get("/marks/students/:teacherId", async (req, res) => {
  try {
    console.log("=== MARKS ENDPOINT CALLED ===");
    console.log("Teacher ID:", req.params.teacherId);
    
    // First, find the teacher
    const teacher = await Teacher.findById(req.params.teacherId);
    
    if (!teacher) {
      console.log("Teacher not found!");
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    console.log("Teacher found:", teacher.name);
    console.log("Teacher subjects:", teacher.subjects);
    console.log("Teacher branch:", teacher.branch);
    
    // Get teacher's subjects
    const teacherSubjects = teacher.subjects || [];
    
    if (teacherSubjects.length === 0) {
      console.log("Teacher has no subjects assigned!");
      return res.json({
        success: true,
        teacher: { name: teacher.name, subjects: teacherSubjects },
        students: []
      });
    }
    
    // Find students in teacher's branch
 // If teacher branch is BOTH, show students from both CSE and IT
let students;
if (teacher.branch === "BOTH") {
  students = await Student.find({ course: { $in: ["CSE", "IT"] } });
} else {
  students = await Student.find({ course: teacher.branch });
}
    
    console.log(`Found ${students.length} students in branch ${teacher.branch}`);
    
    if (students.length === 0) {
      console.log("No students found in this branch!");
      return res.json({
        success: true,
        teacher: { name: teacher.name, subjects: teacherSubjects },
        students: []
      });
    }
    
    // Process each student
    const studentsWithSubjects = [];
    
    for (const student of students) {
      console.log(`Processing student: ${student.name} (${student.studentId})`);
      console.log(`Student enrolled subjects:`, student.enrolledSubjects);
      
      // Get subjects that match teacher's subjects
      let relevantSubjects = [];
      
      if (student.enrolledSubjects && student.enrolledSubjects.length > 0) {
        relevantSubjects = student.enrolledSubjects.filter(
          sub => teacherSubjects.includes(sub.subjectName)
        );
      } else {
        // If no enrolledSubjects, create from teacher's subjects
        console.log("Student has no enrolledSubjects, creating from teacher subjects");
        relevantSubjects = teacherSubjects.map(sub => ({
          subjectName: sub,
          subjectCode: sub.substring(0, 4).toUpperCase()
        }));
      }
      
      console.log(`Relevant subjects for this student:`, relevantSubjects);
      
      if (relevantSubjects.length > 0) {
        studentsWithSubjects.push({
          _id: student._id,
          studentId: student.studentId,
          name: student.name,
          course: student.course,
          subjects: relevantSubjects,
          marks: student.marks || []
        });
      }
    }
    
    console.log(`Returning ${studentsWithSubjects.length} students with subjects`);
    
    res.json({
      success: true,
      teacher: {
        name: teacher.name,
        subjects: teacherSubjects,
        branch: teacher.branch
      },
      students: studentsWithSubjects
    });

  } catch (err) {
    console.error("Error in marks/students endpoint:", err);
    res.status(500).json({ 
      success: false,
      message: err.message,
      stack: err.stack 
    });
  }
});

// ENTER OR UPDATE MARKS FOR STUDENT

router.post("/marks/enter", async (req, res) => {
  try {
    const { studentId, subject, examType, marksObtained, maxMarks, teacherId } = req.body;

    // Validate marks range
    if (marksObtained < 0 || marksObtained > maxMarks) {
      return res.status(400).json({ 
        message: `Marks must be between 0 and ${maxMarks}` 
      });
    }

    // Get teacher info
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Get student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Calculate percentage
    const percentage = (marksObtained / maxMarks) * 100;

    // Check if marks entry already exists for this subject and exam type
    const existingMarkIndex = student.marks.findIndex(
      m => m.subject === subject && m.examType === examType
    );

    const markEntry = {
      subject: subject,
      subjectCode: subject.substring(0, 4).toUpperCase(),
      examType: examType,
      marksObtained: marksObtained,
      maxMarks: maxMarks,
      percentage: percentage,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      dateRecorded: new Date()
    };

    if (existingMarkIndex !== -1) {
      // Update existing marks
      student.marks[existingMarkIndex] = markEntry;
    } else {
      // Add new marks
      student.marks.push(markEntry);
    }

    await student.save();

    res.json({
      success: true,
      message: `${examType} marks for ${subject} saved successfully!`,
      marks: markEntry
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET MARKS SUMMARY FOR TEACHER VIEW

router.get("/marks/summary/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const teacherSubjects = teacher.subjects || [];
    
    // Get all students in teacher's branch
// If teacher branch is BOTH, show students from both CSE and IT
let students;
if (teacher.branch === "BOTH") {
  students = await Student.find({ course: { $in: ["CSE", "IT"] } });
} else {
  students = await Student.find({ course: teacher.branch });
}

    // Build marks summary
    const marksSummary = students.map(student => {
      // Get marks only for subjects this teacher teaches
      const studentMarks = student.marks.filter(m => 
        teacherSubjects.includes(m.subject)
      );

      // Group marks by subject
      const subjectMarks = {};
      teacherSubjects.forEach(subject => {
        subjectMarks[subject] = {
          MTT: null,
          ETT: null
        };
      });

      studentMarks.forEach(mark => {
        if (subjectMarks[mark.subject]) {
          subjectMarks[mark.subject][mark.examType] = {
            marks: mark.marksObtained,
            max: mark.maxMarks,
            percentage: mark.percentage.toFixed(2)
          };
        }
      });

      return {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        marks: subjectMarks
      };
    });

    res.json({
      success: true,
      teacher: {
        name: teacher.name,
        subjects: teacherSubjects,
        branch: teacher.branch
      },
      students: marksSummary
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DEBUG: Test endpoint to check students
router.get("/debug/students/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    
    // Get all students
    const students = await Student.find({});
    
    res.json({
      teacher: {
        id: teacher._id,
        name: teacher.name,
        branch: teacher.branch,
        subjects: teacher.subjects
      },
      allStudents: students.map(s => ({
        id: s._id,
        name: s.name,
        course: s.course,
        enrolledSubjects: s.enrolledSubjects
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET STUDENTS FOR ATTENDANCE

router.get("/attendance/students/:teacherId", async (req, res) => {
  try {
    console.log("=== ATTENDANCE ENDPOINT CALLED ===");
    
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const teacherSubjects = teacher.subjects || [];
    console.log("Teacher subjects:", teacherSubjects);
    
    // Get students in teacher's branch
  // If teacher branch is BOTH, show students from both CSE and IT
let students;
if (teacher.branch === "BOTH") {
  students = await Student.find({ course: { $in: ["CSE", "IT"] } });
} else {
  students = await Student.find({ course: teacher.branch });
}
    console.log(`Found ${students.length} students in branch ${teacher.branch}`);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const studentsWithInfo = [];
    
    for (const student of students) {
      // Get subjects that this teacher teaches and student is enrolled in
      const studentSubjects = student.enrolledSubjects || [];
      const relevantSubjects = studentSubjects.filter(s => teacherSubjects.includes(s.subjectName));
      
      if (relevantSubjects.length === 0) continue;
      
      // Check attendance status for today for each subject
      const attendanceStatus = {};
      for (const sub of relevantSubjects) {
        const existingAtt = student.attendance.find(att => {
          const attDate = new Date(att.date);
          attDate.setHours(0, 0, 0, 0);
          return att.subject === sub.subjectName && attDate.getTime() === today.getTime();
        });
        attendanceStatus[sub.subjectName] = existingAtt ? existingAtt.status : null;
      }
      
      studentsWithInfo.push({
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        subjects: relevantSubjects,
        attendanceStatus: attendanceStatus
      });
    }
    
    res.json({
      success: true,
      teacher: {
        name: teacher.name,
        subjects: teacherSubjects
      },
      students: studentsWithInfo,
      todayDate: today.toISOString().split('T')[0]
    });
    
  } catch (err) {
    console.error("Error in attendance endpoint:", err);
    res.status(500).json({ message: err.message });
  }
});

// MARK ATTENDANCE

router.put("/attendance/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, status } = req.body;
    
    console.log(`Marking attendance for student ${studentId}, subject: ${subject}, status: ${status}`);
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    // Check if already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alreadyMarked = student.attendance.some(att => {
      const attDate = new Date(att.date);
      attDate.setHours(0, 0, 0, 0);
      return att.subject === subject && attDate.getTime() === today.getTime();
    });
    
    if (alreadyMarked) {
      return res.status(400).json({ 
        message: "Attendance already marked for today for this subject" 
      });
    }
    
    // Add attendance record
    student.attendance.push({
      subject: subject,
      status: status,
      date: new Date()
    });
    
    await student.save();
    
    res.json({ 
      success: true,
      message: `Attendance marked as ${status} for ${subject}` 
    });
    
  } catch (err) {
    console.error("Error marking attendance:", err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE TEACHER PROFILE

router.put("/profile/update", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, email } = req.body;
    
    const teacher = await Teacher.findByIdAndUpdate(
      decoded.id,
      { 
        name: name,
        email: email 
      },
      { new: true }
    ).select("-password");
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      teacher: teacher 
    });
    
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: err.message });
  }
});

// CHANGE PASSWORD

router.put("/change-password", async (req, res) => {
  try {
    const { teacherId, currentPassword, newPassword } = req.body;
    
    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    teacher.password = hashedPassword;
    await teacher.save();
    
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET TEACHER ASSIGNMENTS (for profile stats)

router.get("/assignments", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    const assignments = await Assignment.find({ teacherId: teacher._id });
    res.json({ assignments });
  } catch (err) {
    console.error("Assignments error:", err);
    res.status(500).json({ message: err.message });
  }
});


// CREATE ANNOUNCEMENT

router.post("/announcements/create", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    const { title, content, branch, isImportant } = req.body;
    
    const Announcement = require("../models/Announcement");
    
    const announcement = new Announcement({
      title,
      content,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      branch: branch || "ALL",
      targetAudience: branch === "CSE" ? "CSE Only" : branch === "IT" ? "IT Only" : branch === "BOTH" ? "Both Branches" : "All Students",
      isImportant: isImportant || false
    });
    
    await announcement.save();
    
    res.json({
      success: true,
      message: "Announcement posted successfully!",
      announcement
    });
    
  } catch (err) {
    console.error("Announcement error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET ANNOUNCEMENTS FOR TEACHER

router.get("/announcements/teacher", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    const Announcement = require("../models/Announcement");
    const announcements = await Announcement.find({ teacherId: teacher.teacherId })
      .sort({ createdAt: -1 });
    
    res.json({ announcements });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// DELETE ANNOUNCEMENT

router.delete("/announcements/:announcementId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    const Announcement = require("../models/Announcement");
    const announcement = await Announcement.findById(req.params.announcementId);
    
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    
    if (announcement.teacherId !== teacher.teacherId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    await announcement.deleteOne();
    
    res.json({ success: true, message: "Announcement deleted" });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Add same upload routes for teacher
router.post("/upload-image", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    
    // Delete old image
    if (teacher.profileImage && fs.existsSync(teacher.profileImage)) {
      fs.unlinkSync(teacher.profileImage);
    }
    
    teacher.profileImage = req.file.path;
    await teacher.save();
    
    res.json({ success: true, imageUrl: `http://localhost:5001/${req.file.path}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;