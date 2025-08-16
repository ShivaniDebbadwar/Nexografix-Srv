const express = require("express");
const router = express.Router();
const TimesheetReopen = require("../models/TimesheetReopen");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// 🧑‍💼 Employee: Request to reopen timesheet
router.post("/reopen-request", async (req, res) => {
  try {
    const { employeeUsername, reason, date } = req.body;

    const employee = await User.findOne({ username: employeeUsername });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const request = new TimesheetReopen({
      employeeId: employee._id,
      reason,
      date
    });

    await request.save();

    const admins = await User.find({ role: "admin" });

    for (const admin of admins) {
      const subject = `Timesheet Reopen Request from ${employee.username}`;
      const message = `
        Hello ${admin.username},

        ${employee.username} has requested to reopen their timesheet for ${date}.

        Reason: ${reason}

        Please log in to approve or reject.

        Regards,
        Timesheet System
      `;

      await sendEmail(admin.email, subject, message);
    }

    res.status(201).json({ message: "Reopen request submitted and admins notified." });
  } catch (err) {
    console.error("Error in reopen request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📄 Admin: Get all reopen requests
router.get("/reopen-requests", async (req, res) => {
  try {
    const requests = await TimesheetReopen.find()
      .populate("employeeId", "username email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Error fetching all requests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📄 Employee: Get my reopen requests by username
router.get("/reopen-requests/my", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const employee = await User.findOne({ username });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const requests = await TimesheetReopen.find({ employeeId: employee._id })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Error fetching employee requests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 👨‍💼 Admin: Approve or reject reopen request
router.put("/reopen-review/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // "approved" or "rejected"

    const request = await TimesheetReopen.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    await request.save();

    const employee = await User.findById(request.employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const subject = `Your Timesheet Reopen Request has been ${status}`;
    const message = `
      Hello ${employee.username},

      Your timesheet reopen request for ${request.date} has been ${status}.

      You may now edit your timesheet if approved.

      Regards,
      Admin Team
    `;

    await sendEmail(employee.email, subject, message);

    res.json({ message: `Request ${status} and employee notified.` });
  } catch (err) {
    console.error("Error updating request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
