const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const auth = require("../middleware/studentauth");


// ======================
// 🔐 LOGIN
// ======================
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
        id: student._id,
        studentId: student.studentId
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ IMPORTANT FIX HERE
    res.json({
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


// ======================
// 👤 PROFILE (SECURE)
// ======================
router.get("/profile", auth, async (req, res) => {

  try {

    const student = await Student.findById(req.user.id)
      .select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// ======================
// 📊 ATTENDANCE
// ======================
router.get("/attendance", auth, async (req, res) => {

  try {

    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      attendance: student.attendance || []
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// ======================
// ➕ MARK ATTENDANCE
// ======================
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


// ======================
// 📌 GET STUDENT BY ID (PUBLIC)
// ======================
router.get("/student/:studentId", async (req, res) => {

  try {

    const student = await Student.findOne({
      studentId: req.params.studentId
    });

    if (!student) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(student);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;