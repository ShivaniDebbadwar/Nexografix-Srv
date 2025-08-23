const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User"); // ✅ Import User model
const sendEmail = require("../utils/sendEmail"); // ✅ Import sendEmail utility

// ✅ Route to create a task and send email
router.post("/create", async (req, res) => {
  try {
    const {
      title,
      description,
      employeeName,
      assignedTo,
      fileRows,   // ✅ get fileRows from body
      assignedDate,
      assignedTime,
      submissionDate,
      submissionTime,
    } = req.body;

    const task = new Task({
      title,
      description,
      employeeName,
      assignedTo,
      fileRows,   // ✅ save fileRows array directly
      assignedDate,
      assignedTime,
      submissionDate,
      submissionTime,
    });

    await task.save();

    // ✅ Get employee email and send email
    const employee = await User.findById(assignedTo);
    if (employee && employee.email) {
      await sendEmail(
        employee.email,
        "New Task Assigned",
        `Hi ${employee.username},\n\nYou have been assigned a new task titled: "${title}".\n\nPlease check your dashboard for more details.\n\n– NexoGrafix`
      );
    }

    res.status(201).json({ message: "Task created and email sent", task });
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});


// ✅ Route to submit a task
router.put("/submit/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status: "completed" },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task submitted successfully", task: updatedTask });
  } catch (err) {
    console.error("Error submitting task:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
