// services/emailService.js
const nodemailer = require("nodemailer");

function makeTransport() {
  return nodemailer.createTransport({
    service: "gmail",                // or your SMTP
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendPayslip(to, filePath) {
  const t = makeTransport();
  await t.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Monthly Payslip",
    text: "Please find your payslip attached.",
    attachments: [{ filename: filePath.split("/").pop(), path: filePath }],
  });
}

module.exports = { sendPayslip };
