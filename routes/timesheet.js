const express = require('express');
const router = express.Router();
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const { authMiddleware }= require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/isAdmin');

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


module.exports = router;
