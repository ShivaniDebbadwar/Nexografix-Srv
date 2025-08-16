const express = require("express");
const router = express.Router();
const { calculatePayroll } = require("../services/payrollService");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

// GET /api/payroll/:userId/:year/:month
router.get("/:userId/:year/:month", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const payroll = await calculatePayroll(userId, year, month);
    res.json(payroll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payroll calculation failed" });
  }
});

module.exports = router;
