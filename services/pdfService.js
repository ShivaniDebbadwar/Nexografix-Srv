// services/pdfService.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/** Small helper to ensure dir exists */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Convert number to words (Indian system, simplified) */
function numberToWords(n) {
  if (n === 0) return "Zero";
  const a = [
    "", "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
    "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"
  ];
  const b = ["", "", "Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function inWords(num) {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? " " + a[num%10] : "");
    if (num < 1000) return a[Math.floor(num/100)] + " Hundred" + (num%100 ? " and " + inWords(num%100) : "");
    if (num < 100000) return inWords(Math.floor(num/1000)) + " Thousand" + (num%1000 ? " " + inWords(num%1000) : "");
    if (num < 10000000) return inWords(Math.floor(num/100000)) + " Lakh" + (num%100000 ? " " + inWords(num%100000) : "");
    return inWords(Math.floor(num/10000000)) + " Crore" + (num%10000000 ? " " + inWords(num%10000000) : "");
  }
  return inWords(Math.round(n));
}

/** Draw a table cell */
function cell(doc, x, y, w, h, text, opts = {}) {
  const { align = "left", bold = false } = opts;
  doc.rect(x, y, w, h).stroke();
  if (bold) doc.font("Helvetica-Bold");
  else doc.font("Helvetica");
  doc.text(text ?? "", x + 4, y + 6, { width: w - 8, align });
}

function generatePayslipPDF(row, outDir) {
  ensureDir(outDir);

  const { user, month, year, metrics, salaryBreakup, doj } = row;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long" });
  const fileName = `${user.username}_payslip_${year}-${String(month).padStart(2,"0")}.pdf`;
  const filePath = path.join(outDir, fileName);

  const doc = new PDFDocument({ margin: 18 });
  doc.pipe(fs.createWriteStream(filePath));

  // Header strip
  doc.rect(18, 18, doc.page.width - 36, 22).fill("#d26500");
  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(13)
    .text("NEXOGRAFIX PRIVATE LIMITED", 18, 22, { align: "center" });
  doc.fillColor("#000000");

  doc.moveDown(1.2);
  doc.fontSize(9).font("Helvetica")
     .text("Head Office-Bihar Krishna Nagar, Ward No 22/37 Saharsa, Pincode-852201", { align: "center" });
  doc.moveTo(18, 70).lineTo(doc.page.width - 18, 70).stroke();
  doc.font("Helvetica-Oblique").fontSize(8).text("Private and Confidential", doc.page.width - 150, 58, { width: 130, align: "right" });

  // Title row
  doc.font("Helvetica-Bold").fontSize(10)
     .text(`Pay Slip for the month of ${monthName} – ${year}`, 18, 78, { align: "center" });

  // Top grid
  const left = 18, top = 100, colW = (doc.page.width - 36) / 4, rowH = 22;

  // Row 1
  cell(doc, left, top, colW, rowH, "Employee Name", { bold: true });
  cell(doc, left + colW, top, colW, rowH, user.username);
  cell(doc, left + 2*colW, top, colW, rowH, "Paid Days", { bold: true });
  cell(doc, left + 3*colW, top, colW, rowH, String(metrics.paidDays ?? metrics.presentDays));

  // Row 2
  cell(doc, left, top + rowH, colW, rowH, "DOJ", { bold: true });
  cell(doc, left + colW, top + rowH, colW, rowH, doj.toLocaleDateString("en-GB"));
  cell(doc, left + 2*colW, top + rowH, colW, rowH, "Total Days", { bold: true });
  cell(doc, left + 3*colW, top + rowH, colW, rowH, String(metrics.totalWorkingDays));

  // Earnings/Deductions header
  const tTop = top + rowH * 2 + 12;
  cell(doc, left, tTop, 2*colW, rowH, "Earnings Description", { bold: true });
  cell(doc, left + 2*colW, tTop, 2*colW, rowH, "Deductions Description", { bold: true });

  // Sub-headers
  cell(doc, left, tTop + rowH, colW, rowH, "Basic salary", { bold: true });
  cell(doc, left + colW, tTop + rowH, colW, rowH, "Amount(Rs)", { bold: true });
  cell(doc, left + 2*colW, tTop + rowH, colW, rowH, "Professional Tax", { bold: true });
  cell(doc, left + 3*colW, tTop + rowH, colW, rowH, "Amount(Rs)", { bold: true });

  let curY = tTop + rowH * 2;

  // Earnings lines
  const E = salaryBreakup;
  const earnings = [
    ["Basic salary", E.basic],
    ["House Rent Allowance", 0],
    ["Conveyance Allowance", 0],
    ["Other Allowances", E.weekendBonus],
    ["Total Earnings", E.grossEarnings],
    ["Net Salary Payable", E.netPay]
  ];
  const deds = [
    ["Professional Tax", 0],
    ["Loss of Pay", 0],
    ["Salary Advance", 0],
    ["Other Deductions", E.leaveDeduction],
    ["Total Deductions", E.totalDeductions],
    ["", ""]
  ];

  for (let i = 0; i < earnings.length; i++) {
    cell(doc, left, curY, colW, rowH, earnings[i][0]);
    cell(doc, left + colW, curY, colW, rowH, String(earnings[i][1]));
    cell(doc, left + 2*colW, curY, colW, rowH, deds[i][0]);
    cell(doc, left + 3*colW, curY, colW, rowH, String(deds[i][1]));
    curY += rowH;
  }

  // Amount in words row
  cell(doc, left, curY, colW, rowH, "Amount in Words", { bold: true });
  cell(doc, left + colW, curY, 3*colW, rowH, numberToWords(E.netPay) + " Rupees Only");

  // Footnote
  doc.fontSize(8).text(
    `Present: ${metrics.presentDays}  |  Approved Leaves: ${metrics.approvedLeaveDays} (1 free)  |  Unpaid Leave/Absent: ${metrics.unpaidLeaveDays + metrics.trueAbsentDays}  |  Weekend Days: ${metrics.weekendDays} (₹${E.weekendBonus})  |  Per-day deduction: ₹${E.perDayDeduction}`,
    18, curY + rowH + 8
  );

  doc.end();
  return filePath;
}

module.exports = { generatePayslipPDF };
