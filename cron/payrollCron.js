// cron/payrollCron.js
const path = require("path");
const cron = require("node-cron");
const { calculatePayrollForMonth } = require("../services/payrollService");
const { generatePayslipPDF } = require("../services/pdfService");
const { sendPayslip } = require("../services/emailService");

async function runMonthly() {
  const today = new Date();
  // On the 1st we want previous month’s payroll
  const monthFor = today.getMonth() === 0 ? 12 : today.getMonth();
  const yearFor  = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

  const rows = await calculatePayrollForMonth(yearFor, monthFor);
  const outDir = path.join(process.cwd(), "payslips", `${yearFor}-${String(monthFor).padStart(2,"0")}`);

  for (const row of rows) {
    const pdf = generatePayslipPDF(row, outDir);
    // email if you want
    if (row.user.email) {
      try { await sendPayslip(row.user.email, pdf); } catch (e) { console.error("email failed", row.user.email, e.message); }
    }
  }
  console.log(`Payslips done for ${yearFor}-${monthFor}`);
}

// Run 09:00 on the 1st of every month
cron.schedule("0 9 1 * *", () => runMonthly());

module.exports = { runMonthly };
