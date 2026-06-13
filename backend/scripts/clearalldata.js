const mongoose = require("mongoose");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Import models
const Student = require("../models/Student");
const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const Announcement = require("../models/Announcement");

async function clearAllData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // 1. Clear attendance from students
    const attendanceResult = await Student.updateMany(
      {},
      { $set: { attendance: [] } }
    );
    console.log(`Cleared attendance from ${attendanceResult.modifiedCount} students`);

    // 2. Clear marks from students
    const marksResult = await Student.updateMany(
      {},
      { $set: { marks: [] } }
    );
    console.log(`Cleared marks from ${marksResult.modifiedCount} students`);

    // 3. Clear submissions
    const submissionsResult = await Submission.deleteMany({});
    console.log(`Deleted ${submissionsResult.deletedCount} submissions`);

    // 4. Clear assignments
    const assignmentsResult = await Assignment.deleteMany({});
    console.log(`Deleted ${assignmentsResult.deletedCount} assignments`);

    // 5. Clear announcements
    const announcementsResult = await Announcement.deleteMany({});
    console.log(`Deleted ${announcementsResult.deletedCount} announcements`);

    // 6. Clear uploaded files
    const uploadsDir = path.join(__dirname, "../uploads/assignments");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
      console.log(`Deleted ${files.length} uploaded files`);
    }

    console.log("\n ALL DATA CLEARED SUCCESSFULLY!");
    console.log("\nWhat remains:");
    console.log("  - Students (with enrollment subjects)");
    console.log("  - Teachers");
    console.log("  - All other structure intact");
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

clearAllData();