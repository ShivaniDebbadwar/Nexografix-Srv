const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { authMiddleware } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail"); // ✅ Make sure this exists

// 👨‍💼 Route: Admin - Get all tasks
router.get("/all-tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "username email");
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching all tasks:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🧑‍💼 EMPLOYEE → Get their tasks
router.get("/my-tasks", authMiddleware, async (req, res) => {
try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .sort({ assignedDate: -1 });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🚀 EMPLOYEE → Start task
router.post("/:taskId/start", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, assignedTo: req.user.id });
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.status !== "inprogress")
      return res.status(400).json({ message: "Task is not in inprogress state" });
    const employee = await User.findById(req.user.id).select("username email manager");
    
    task.status = "started";
    task.startedDate = new Date();
    await task.save();

    // Notify all admins
    const adminUsers = await User.find({ role: "admin" });
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        recipientRole: admin.role, // required field
        message: `Employee ${employee?.username} has started task: ${task.title}`,
      });
      await sendEmail(
        admin.email,
        "Task Started",
        `Employee ${employee?.username} has started the task "${task.title}".`
      );
    }

    res.status(200).json({ message: "Task started", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ EMPLOYEE → Complete task
router.post("/:taskId/complete", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, assignedTo: req.user.id });
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.status !== "started")
      return res.status(400).json({ message: "Task is not in started state" });

    task.status = "completed";
    task.submissionDate = new Date();
    await task.save();
   const employee = await User.findById(req.user.id).select("username email manager");
    // Notify all admins
    const adminUsers = await User.find({ role: "admin" });
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        recipientRole: admin.role, // required field
        message: `Employee ${employee?.username} has completed task: ${task.title}`,
      });

      await sendEmail(
        admin.email,
        "Task Completed",
        `Employee ${employee?.username} has completed the task "${task.title}".`
      );
    }

    res.status(200).json({ message: "Task completed", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
