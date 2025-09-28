const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const mongoose = require("mongoose");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

// Helper: midnight date
function getDayKey(d = new Date()) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

// ----------------------
// POST /start → login start
// ----------------------
router.post("/start", authMiddleware, async (req, res) => {
  try {
     console.error("Attendance start :");
    const userId = req.user.id;
    const today = getDayKey();
    let att = await Attendance.findOne({ userId, date: today });

    if (!att) {
      att = new Attendance({
        userId,
        date: today,
        loginTime: new Date(),
        status: "in_progress"
      });
      await att.save();
    } else {
      if (!att.loginTime) att.loginTime = new Date();
      att.status = "in_progress";
      await att.save();
    }

    res.json({ message: "Attendance started", attendance: att });
  } catch (err) {
    console.error("Attendance start error:", err);
    res.status(500).json({ message: err });
  }
});

// ----------------------
// POST /break-in
// ----------------------
router.post("/break-in", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getDayKey();
    const att = await Attendance.findOne({ userId, date: today });
    if (!att || !att.loginTime) return res.status(400).json({ message: "Please login first" });

    const openBreak = att.breaks.find(b => !b.end);
    if (openBreak) return res.status(400).json({ message: "Break already started" });

    att.breaks.push({ start: new Date() });
    att.status = "on_break";
    await att.save();

    res.json({ message: "Break started", attendance: att });
  } catch (err) {
    console.error("Break-in error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// POST /break-out
// ----------------------
router.post("/break-out", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getDayKey();
    const att = await Attendance.findOne({ userId, date: today });
    if (!att) return res.status(400).json({ message: "No attendance for today" });

    const openBreakIndex = att.breaks.findIndex(b => !b.end);
    if (openBreakIndex === -1) return res.status(400).json({ message: "No active break" });

    const now = new Date();
    const br = att.breaks[openBreakIndex];
    br.end = now;
    const dur = Math.max(0, Math.floor((br.end - br.start) / 60000));
    br.durationMinutes = dur;

    att.totalBreakMinutes = (att.totalBreakMinutes || 0) + dur;
    att.status = "in_progress";
    await att.save();

    res.json({ message: "Break ended", breakDurationMinutes: dur, attendance: att });
  } catch (err) {
    console.error("Break-out error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// POST /logout
// ----------------------
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getDayKey();
    const att = await Attendance.findOne({ userId, date: today });
    if (!att || !att.loginTime) return res.status(400).json({ message: "No login record found" });

    const openIndex = att.breaks.findIndex(b => !b.end);
    const now = new Date();
    if (openIndex !== -1) {
      const br = att.breaks[openIndex];
      br.end = now;
      const dur = Math.max(0, Math.floor((br.end - br.start) / 60000));
      br.durationMinutes = dur;
      att.totalBreakMinutes = (att.totalBreakMinutes || 0) + dur;
    }

    att.logoutTime = now;
    const totalMinutes = Math.floor((att.logoutTime - att.loginTime) / 60000);
    const workMinutes = Math.max(0, totalMinutes - (att.totalBreakMinutes || 0));
    att.totalWorkMinutes = workMinutes;
    att.status = "completed";

    await att.save();
    res.json({ message: "Logged out, attendance saved", attendance: att });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// GET /today
// ----------------------
router.get("/today", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getDayKey();
    const att = await Attendance.findOne({ userId, date: today });
    res.json({ attendance: att || null });
  } catch (err) {
    console.error("Get today error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// GET /history
// ----------------------
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user.id }).sort({ date: -1 });
    res.json({ attendance: records });
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// GET /all
// ----------------------
router.get("/all", authMiddleware, async (req, res) => {
  try {
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }
    const records = await Attendance.find()
      .populate("userId", "username email role")
      .sort({ date: -1 });
    res.json({ attendance: records });
  } catch (err) {
    console.error("Get all attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
router.get("/summary", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { startDate: qStart, endDate: qEnd, month, employeeId } = req.query;

    let startDate, endDate;
    if (month) {
      // month = "YYYY-MM"
      const [y, m] = month.split("-").map(Number);
      if (!y || !m) return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      startDate = new Date(y, m - 1, 1, 0, 0, 0);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    } else if (qStart && qEnd) {
      startDate = new Date(qStart + "T00:00:00");
      endDate = new Date(qEnd + "T23:59:59.999");
      if (isNaN(startDate) || isNaN(endDate)) return res.status(400).json({ message: "Invalid startDate/endDate" });
    } else {
      return res.status(400).json({ message: "Provide either month=YYYY-MM or startDate & endDate" });
    }

    // Build match
    const match = {
      date: { $gte: startDate, $lte: endDate }
    };
   if (employeeId) {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: "Invalid employeeId" });
  }
  match.userId = new mongoose.Types.ObjectId(employeeId);
}

    // Aggregation:
    // 1) normalize work minutes (prefer totalWorkMinutes then workMinutes)
    // 2) group by date string + userId
    // 3) lookup user
    // 4) project date, username, totalWorkMinutes, totalWorkHours
    const agg = [
      { $match: match },
      {
        $addFields: {
          _workMinutes: {
            $cond: [
              { $ifNull: ["$totalWorkMinutes", false] },
              "$totalWorkMinutes",
              { $ifNull: ["$workMinutes", 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            userId: "$userId"
          },
          totalWorkMinutes: { $sum: "$_workMinutes" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          userId: "$user._id",
          username: { $ifNull: ["$user.username", "$user.name", "$user.email"] },
          totalWorkMinutes: 1,
          totalWorkHours: { $round: [{ $divide: ["$totalWorkMinutes", 60] }, 2] }
        }
      },
      { $sort: { date: 1, username: 1 } }
    ];

    const rows = await Attendance.aggregate(agg).allowDiskUse(true);

    // Build unique employees list
    const employeesMap = new Map();
    rows.forEach((r) => {
      if (!employeesMap.has(String(r.userId))) {
        employeesMap.set(String(r.userId), { _id: String(r.userId), name: r.username });
      }
    });
    const employees = Array.from(employeesMap.values());

    // Generate list of all dates between startDate and endDate (ISO yyyy-mm-dd)
    function toISO(d) {
      const dt = new Date(d);
      return dt.toISOString().slice(0, 10);
    }
    const dateList = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateList.push(toISO(d));
    }

    // Build a map: date -> { username -> hours }
    const dateMap = {};
    dateList.forEach((dt) => (dateMap[dt] = {}));
    rows.forEach((r) => {
      if (!dateMap[r.date]) dateMap[r.date] = {};
      dateMap[r.date][r.username] = r.totalWorkHours;
    });

    // Build daily array formatted for frontend charts: each element: { date: 'YYYY-MM-DD', 'Alice': 8, 'Bob': 7.5, ... }
    const daily = dateList.map((dt) => {
      const row = { date: dt };
      // ensure every employee key exists (0 if absent)
      employees.forEach((emp) => {
        row[emp.name] = dateMap[dt][emp.name] ?? 0;
      });
      return row;
    });

    // Build weekends array: only Saturday(6) or Sunday(0)
    const weekends = dateList
      .filter((dt) => {
        const day = new Date(dt).getDay();
        return day === 0 || day === 6;
      })
      .map((dt) => {
        const row = { date: dt };
        employees.forEach((emp) => {
          row[emp.name] = dateMap[dt][emp.name] ?? 0;
        });
        return row;
      });

    return res.json({
      startDate: toISO(startDate),
      endDate: toISO(endDate),
      employees,
      daily,
      weekends
    });
  } catch (err) {
    console.error("Summary route error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});





module.exports = router;
