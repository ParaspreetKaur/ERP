const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// Create dummy student
router.get('/create', async (req, res) => {
  const student = await Student.create({
    name: "Test Student",
    email: "test@gmail.com",
    attendance: 85,
    marks: [
      { subject: "Math", score: 80 },
      { subject: "Physics", score: 75 }
    ],
    assignmentsPending: 2
  });

  res.json(student);
});

// Get student by ID
router.get('/:id', async (req, res) => {
  const student = await Student.findById(req.params.id);
  res.json(student);
});

module.exports = router;