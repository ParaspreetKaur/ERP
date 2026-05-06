const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  email: String,
  attendance: Number,
  marks: [
    {
      subject: String,
      score: Number
    }
  ],
  assignmentsPending: Number
});

module.exports = mongoose.model('Student', studentSchema);