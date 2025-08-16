const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const WeekendWork = require("../models/WeekendWork");

// helper - get month start and end
function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function calculatePayroll(userId, year, month) {
  const { start, end } = getMonthRange(year, month);

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // === Attendance ===
  const attendance = await Attendance.find({
    userId,
    date: { $gte: start, $lte: end },
  });

  // === Approved Leaves ===
  const leaves = await Leave.find({
    employeeId: userId,
    status: "approved",
    fromDate: { $lte: end },
    toDate: { $gte: start },
  });

  // === Weekend Work ===
  const weekends = await WeekendWork.find({
    user: userId,
    status: "approved",
    date: { $gte: start, $lte: end },
  });

  // === Salary base ===
  const salary = user.salary || 0;
  const deductionRate = salary === 15000 ? 500 : 330;

  // Leaves
  const doj = user.createdAt ? new Date(user.createdAt) : null;
  let leaveDays = 0;

  for (let lv of leaves) {
    for (
      let d = new Date(lv.fromDate);
      d <= lv.toDate;
      d.setDate(d.getDate() + 1)
    ) {
      if (d >= start && d <= end) leaveDays++;
    }
  }

  // Allow 1 free leave after DOJ
  let deductibleLeaves = leaveDays;
  if (doj && doj < start && deductibleLeaves > 0) {
    deductibleLeaves -= 1;
  }

  // total possible working days (Mon-Fri only)
  let totalWorkingDays = 0;
  let cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) totalWorkingDays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  // attendance
  const presentDays = attendance.length;

  const absentDays =
    totalWorkingDays -
    (presentDays + leaveDays > totalWorkingDays
      ? totalWorkingDays
      : presentDays + leaveDays);

  // salary calc
  const leaveDeduction = deductibleLeaves * deductionRate;
  const absentDeduction = absentDays > 0 ? absentDays * deductionRate : 0;
  const weekendBonus = weekends.length * 250;

  const netPay = salary - leaveDeduction - absentDeduction + weekendBonus;

  return {
    employee: user.username,
    joinDate: doj ? doj.toLocaleDateString() : "N/A",
    salary,
    month: `${year}-${month}`,
    presentDays,
    leaveDays,
    deductibleLeaves,
    absentDays,
    leaveDeduction,
    absentDeduction,
    weekendBonus,
    netPay,
  };
}

module.exports = { calculatePayroll };
