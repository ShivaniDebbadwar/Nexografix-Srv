// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authMiddleware } = require("../middleware/authMiddleware");

// Admin fetch notifications
router.get("/", authMiddleware, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "admin") {
      filter.recipientRole = "admin";
    } else {
      filter.recipientId = req.user.userId; // if you ever create employee-specific notifs
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
