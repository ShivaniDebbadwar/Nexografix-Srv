const express = require('express');
const router = express.Router();
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const { authMiddleware }= require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/isAdmin');
const TimesheetReopen = require("../models/TimesheetReopen");

// 📝 Create Draft Timesheet (Employee)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { date, tasks } = req.body;
    const employee = await User.findById(req.user.id);

    if (!employee.manager) {
      return res.status(400).json({ error: 'Manager not assigned to this employee' });
    }

    const timesheet = new Timesheet({
      user: req.user.id,
      manager: employee.manager, // storing as string
      date,
      tasks,
      status: 'draft'
    });

    await timesheet.save();
    res.status(201).json({ message: 'Timesheet created in draft mode', timesheet });
  } catch (error) {
    res.status(500).json({ error: 'Error creating timesheet' + error.message });
  }
});

// 📤 Submit Timesheet (Employee)
router.post('/submit/:id', authMiddleware, async (req, res) => {
  try {
    const timesheet = await Timesheet.findOne({ _id: req.params.id, user: req.user.id });

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    if (timesheet.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft timesheets can be submitted' });
    }

    timesheet.status = 'submitted';
    timesheet.submittedAt = new Date();
    await timesheet.save();

    res.json({ message: 'Timesheet submitted successfully', timesheet });
  } catch (error) {
    res.status(500).json({ error: 'Error submitting timesheet' });
  }
});

// 📄 Get My Timesheets (Employee)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const timesheets = await Timesheet.find({ user: req.user.id }).sort({ date: -1 });
    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching timesheets' });
  }
});

// 📋 Get All Timesheets (Admin)
router.get('/all', authMiddleware, isAdmin, async (req, res) => {
  try {
    console.log("Fetching all timesheets for admin:", req.user);
    const timesheets = await Timesheet.find().sort({ date: -1 });
    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching all timesheets' });
  }
});

// ✅ Approve Timesheet (Admin)
router.put('/approve/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    timesheet.status = 'approved';
    timesheet.approvedAt = new Date();
    await timesheet.save();

    res.json({ message: 'Timesheet approved successfully', timesheet });
  } catch (error) {
    res.status(500).json({ error: 'Error approving timesheet' });
  }
});

// ❌ Reject Timesheet (Admin)
router.put('/reject/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    timesheet.status = 'rejected';
    await timesheet.save();

    res.json({ message: 'Timesheet rejected successfully', timesheet });
  } catch (error) {
    res.status(500).json({ error: 'Error rejecting timesheet' });
  }
});
// routes/timesheetRoutes.js
router.get('/week', authMiddleware, async (req, res) => {
  try {
    const { start } = req.query; // YYYY-MM-DD
    if (!start) return res.status(400).json({ error: 'start param required (YYYY-MM-DD)' });

    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(e.getDate() + 6); e.setHours(23,59,59,999);

    const docs = await Timesheet.find({
      user: req.user.id,
      date: { $gte: s, $lte: e }
    }).sort({ date: 1 });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching weekly timesheets' });
  }
});

router.get('/manager/:managerName/approvals', async (req, res) => {
  try {
    console.log("Manager Name:", req); // Debug log
   const managerName = req.params.managerName;
    if (!managerName) {
      return res.status(400).json({ message: "Manager name is required" });
    } 
    const pendingTimesheets = await Timesheet.find({
      manager: managerName,
      status: "submitted"
    })
    .populate("user", "username email");

    res.json({
      count: pendingTimesheets.length,
      timesheets: pendingTimesheets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching approvals" });
  }
});

router.get('/manager/:managerName/reopened', async (req, res) => {
  try {
    console.log("Manager Name:", req); // Debug log
   const managerName = req.params.managerName;
    if (!managerName) {
      return res.status(400).json({ message: "Manager name is required" });
    } 
    const pendingTimesheets = await TimesheetReopen.find({
      manager: managerName,
      status: "pending"
    })
    .populate("employeeId", "username email");

    res.json({
      count: pendingTimesheets.length,
      timesheets: pendingTimesheets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching approvals" });
  }
});

// Bulk Approve
router.put("/bulk-approve", async (req, res) => {
  const { ids } = req.body; // array of timesheet IDs
  if (!ids || !ids.length) return res.status(400).json({ message: "No IDs provided" });

  try {
    await Timesheet.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "approved" } }
    );
    res.status(200).json({ message: "Timesheets approved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve timesheets" });
  }
});

// Bulk Reject
router.put("/bulk-reject", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ message: "No IDs provided" });

  try {
    await Timesheet.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "rejected" } }
    );
    res.status(200).json({ message: "Timesheets rejected successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject timesheets" });
  }
});

// ✅ Approve Reopen Timesheet (Admin)
router.put('/reopenApprove/:id', async (req, res) => {
  try {
    console.log("Reopen Approve ID:", req); // Debug log
    const timesheet = await TimesheetReopen.findById(req.params.id);
    console.log("Reopen Timesheet:", timesheet);

    if (!timesheet) {
      return res.status(404).json({ error: 'Reopen Timesheet not found' });
    }

    timesheet.status = 'approved';
    await timesheet.save();

//     const subject = "Your Reopen Timesheet Request Approved";
//     const message = `
// Hello ${timesheet.employeeId.username},

// Your Reopen Timesheet request has been approved.

// Regards,
// Info Team
//     `;
//     await sendEmail(timesheet.employeeId.email, subject, message);

    res.json({ message: "Reopen Timesheet request approved and employee notified." });
  } catch (error) {
    res.status(500).json({ error: 'Error Reopen approving timesheet' });
  }
});

// ❌ Reject Reopen Timesheet (Admin)
router.put('/reopenReject/:id', async (req, res) => {
  try {
    const timesheet = await TimesheetReopen.findById(req.params.id).populate("employeeId");

    if (!timesheet) {
      return res.status(404).json({ error: 'Reopen Timesheet not found' });
    }

    timesheet.status = 'rejected';
    await timesheet.save(); const subject = "Your Reopen Timesheet Request Rejected";
//     const message = `
// Hello ${timesheet.employeeId.username},

// Your Reopen Timesheet request has been Rejected.

// Regards,
// Info Team
//     `;
//     await sendEmail(timesheet.employeeId.email, subject, message);

    res.json({ message: "Reopen Timesheet request Rejected and employee notified." });
  } catch (error) {
    res.status(500).json({ error: 'Error Reopen rejecting timesheet' });
  }
});

module.exports = router;
