const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const auth = require("../middleware/studentauth");

const Announcement = require("../models/Announcement");

const multer = require("multer");
const path = require("path");
const fs = require("fs");


//FILE UPLOAD CONFIG

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/assignments";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "submission-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, TXT, JPG, PNG allowed"));
    }
  }
});


//LOGIN

router.post("/login", async (req, res) => {
  const { studentId, password } = req.body;

  try {
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(400).json({ message: "Student not found" });
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: student._id.toString(),
        studentId: student.studentId
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Login successful for:", student.name);
    console.log("Token created with ID:", student._id.toString());

    res.json({
      success: true,
      token,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        cgpa: student.cgpa
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

//PROFILE

router.get("/profile", auth, async (req, res) => {
  try {
    console.log("Profile request - user:", req.user);
    
    const student = await Student.findById(req.user.id).select("-password");
    
    if (!student) {
      console.log("Student not found for ID:", req.user.id);
      return res.status(404).json({ message: "Student not found" });
    }

    console.log("Profile found for:", student.name);
    res.json(student);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET MARKS FOR STUDENT

router.get("/marks", auth, async (req, res) => {
  try {
    console.log("=== MARKS ENDPOINT CALLED ===");
    console.log("Marks request - user:", req.user);
    
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      console.log("Student not found");
      return res.status(404).json({ message: "Student not found" });
    }
    
    console.log("Marks found for:", student.name);
    console.log("Marks data:", student.marks);
    
    res.json({ 
      success: true,
      marks: student.marks || [] 
    });
    
  } catch (err) {
    console.error("Error in marks endpoint:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET ASSIGNMENTS FOR STUDENT

router.get("/assignments", auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentSubjects = student.enrolledSubjects || [];
    const subjectNames = studentSubjects.map(s => s.subjectName);

    const assignments = await Assignment.find({
      $or: [
        { branch: student.course },
        { branch: "BOTH" },
        { subject: { $in: subjectNames } }
      ],
      status: "active"
    }).sort({ createdAt: -1 });

    const submissions = await Submission.find({
      studentId: student._id
    });

    const submittedIds = submissions.map(s => s.assignmentId.toString());

    const formattedAssignments = assignments.map(a => {
      const submission = submissions.find(s => s.assignmentId.toString() === a._id.toString());
      return {
        _id: a._id,
        title: a.title,
        subject: a.subject,
        description: a.description,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks || 10,
        status: submission ? "Submitted" : "Pending",
        submissionId: submission?._id,
        marks: submission?.marks,
        feedback: submission?.feedback,
        submittedAt: submission?.submittedAt
      };
    });

    res.json({ assignments: formattedAssignments });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

//SUBMIT ASSIGNMENT

router.post("/submit-assignment", auth, upload.single("file"), async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Assignment not found" });
    }

    const existingSubmission = await Submission.findOne({
      assignmentId: assignmentId,
      studentId: student._id
    });

    if (existingSubmission) {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "You have already submitted this assignment" });
    }

    if (new Date(assignment.dueDate) < new Date()) {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Submission deadline has passed" });
    }

    const submission = new Submission({
      assignmentId: assignmentId,
      studentId: student._id,
      studentName: student.name,
      fileUrl: req.file.path,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      submittedAt: new Date(),
      status: "Submitted"
    });

    await submission.save();

    res.json({
      success: true,
      message: "Assignment submitted successfully",
      submissionId: submission._id
    });

  } catch (err) {
    console.error(err);
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
});

//GET GRADES

router.get("/grades", auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const submissions = await Submission.find({
      studentId: student._id,
      status: "Graded"
    }).populate("assignmentId", "title subject maxMarks");

    const grades = submissions.map(s => ({
      assignmentId: s.assignmentId._id,
      assignmentTitle: s.assignmentId.title,
      subject: s.assignmentId.subject,
      marks: s.marks,
      maxMarks: s.assignmentId.maxMarks || 10,
      feedback: s.feedback,
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt
    }));

    res.json({ grades });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ATTENDANCE

router.get("/attendance", auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ attendance: student.attendance || [] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET ANNOUNCEMENTS FOR STUDENT

router.get("/announcements", auth, async (req, res) => {
  console.log("=== STUDENT ANNOUNCEMENTS ENDPOINT HIT ===");
  try {
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    const Announcement = require("../models/Announcement");
    
    const announcements = await Announcement.find({
      $or: [
        { branch: "ALL" },
        { branch: student.course },
        { branch: "BOTH" }
      ]
    }).sort({ createdAt: -1 }).limit(20);
    
    console.log(`Found ${announcements.length} announcements`);
    res.json({ announcements });
    
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE STUDENT PROFILE

router.put("/profile/update", auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true }
    ).select("-password");
    
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//CHANGE PASSWORD

router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const student = await Student.findById(req.user.id);
    
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();
    
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




// LEGACY ROUTES 

router.get("/all", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/mark-attendance", async (req, res) => {
  try {
    const { studentId, subject, status } = req.body;
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    student.attendance.push({
      subject,
      status,
      date: new Date()
    });
    await student.save();
    res.json({ message: "Attendance saved" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/student/:studentId", async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(student);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


//THE LAST ROUTE

router.get("/:studentId", async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ student });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;