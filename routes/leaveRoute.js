const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { authMiddleware } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/isAdmin");


// ✅ TEMP TEST ROUTE to verify it's mounted
// router.get("/test", (req, res) => {
//   res.send("✅ Leave test route works");
// });

router.post("/request", authMiddleware, async (req, res) => {
  try {
    const { reason, fromDate, toDate, leaveType, attachmentUrl } = req.body;

    const employee = await User.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const leave = new Leave({
  employeeId: req.user.id,
  reason, fromDate, toDate,
  leaveType, attachmentUrl,
  status: "pending", // Default status
});

    await leave.save();

    const admins = await User.find({ role: "admin" });

    for (const admin of admins) {
      const subject = `New Leave Request from ${employee.username}`;
      const message = `
Hello ${admin.username},

${employee.username} has submitted a leave request:

Reason: ${reason}
From: ${fromDate}
To: ${toDate}

Please log in to review and take action.

Regards,
Leave System
      `;
      await sendEmail(admin.email, subject, message);
    }

    res.status(201).json({ message: "Leave request submitted and admins notified." });
  } catch (err) {
    console.error("Error submitting leave request:", err);
    res.status(500).json({ message: err });
  }
});

// ✅ Approve leave
router.post("/approve/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate("employeeId");
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = "approved";
    await leave.save();

    const subject = "Your Leave Request Approved";
    const message = `
Hello ${leave.employeeId.username},

Your leave request from ${leave.fromDate} to ${leave.toDate} has been approved.

Regards,
Leave System
    `;
    await sendEmail(leave.employeeId.email, subject, message);

    res.json({ message: "Leave request approved and employee notified." });
  } catch (err) {
    console.error("Error approving leave:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Reject leave
router.post("/reject/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate("employeeId");
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = "rejected";
    await leave.save();

    const subject = "Your Leave Request Rejected";
    const message = `
Hello ${leave.employeeId.username},

Your leave request from ${leave.fromDate} to ${leave.toDate} has been rejected.

Regards,
Leave System
    `;
    await sendEmail(leave.employeeId.email, subject, message);

    res.json({ message: "Leave request rejected and employee notified." });
  } catch (err) {
    console.error("Error rejecting leave:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Leave history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      // Admin sees all leave requests with total days
      const leaves = await Leave.find().populate("employeeId", "username email");

      const leaveSummary = {};
      leaves.forEach(l => {
        const days = Math.ceil((new Date(l.toDate) - new Date(l.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
        if (!leaveSummary[l.employeeId.username]) {
          leaveSummary[l.employeeId.username] = { totalDays: 0, leaves: [] };
        }
        leaveSummary[l.employeeId.username].totalDays += days;
        leaveSummary[l.employeeId.username].leaves.push(l);
      });

      return res.json({ summary: leaveSummary });
    } else {
      // Employee sees only their own
      const leaves = await Leave.find({ employeeId: req.user.id });
      return res.json({ leaves });
    }
  } catch (err) {
    console.error("Error fetching leave history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
