// routes/weekendRoutes.js
const express = require("express");
const router = express.Router();
const WeekendWork = require("../models/WeekendWork");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/isAdmin");
const { resolveManagerName } = require("../utils/resolveManagerName");

// 📨 Employee: submit weekend working
// body: { date: "YYYY-MM-DD", reason: "..." }
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ message: "date and reason are required" });
    }

    const employee = await User.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const managerName = await resolveManagerName(employee);
    if (!managerName) {
      return res.status(400).json({ message: "Manager not assigned to this employee" });
    }

    // normalize to midnight to avoid timezone dup issues
    const d = new Date(date);
    if (isNaN(d)) return res.status(400).json({ message: "Invalid date" });
    d.setHours(0, 0, 0, 0);

    const doc = new WeekendWork({
      user: req.user.id,
      managerId: typeof employee.manager === "string" ? undefined : employee.manager,
      managerName,
      date: d,
      reason: reason.trim(),
      status: "submitted",
      submittedAt: new Date(),
    });

    await doc.save();
    return res.status(201).json({ message: "Weekend working submitted", weekend: doc });
  } catch (err) {
    // handle duplicate key nicely
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Weekend working already submitted for this date" });
    }
    console.error("Weekend submit error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// 👤 Employee: my weekend requests
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const list = await WeekendWork.find({ user: req.user.id }).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    console.error("Weekend my error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🗂️ Admin: all weekend requests (optional)
router.get("/all", authMiddleware, isAdmin, async (req, res) => {
  try {
    const list = await WeekendWork.find().sort({ date: -1 }).populate("user", "username email");
    res.json(list);
  } catch (err) {
    console.error("Weekend all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Admin: approve weekend request
router.put("/approve/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const ww = await WeekendWork.findById(req.params.id);
    if (!ww) return res.status(404).json({ message: "Weekend record not found" });

    ww.status = "approved";
    ww.approvedAt = new Date();
    await ww.save();

    res.json({ message: "Weekend working approved", weekend: ww });
  } catch (err) {
    console.error("Weekend approve error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ❌ Admin: reject weekend request
router.put("/reject/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const ww = await WeekendWork.findById(req.params.id);
    if (!ww) return res.status(404).json({ message: "Weekend record not found" });

    ww.status = "rejected";
    await ww.save();

    res.json({ message: "Weekend working rejected", weekend: ww });
  } catch (err) {
    console.error("Weekend reject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
