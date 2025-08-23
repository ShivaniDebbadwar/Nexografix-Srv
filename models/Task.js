const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Task name
  employeeName: { type: String, required: true },
  assignedTo: { type: String, required: true },
  // fileUrl: { type: String },
   // ✅ fileRows will store multiple objects { pdfUrl, excelUrl }
  fileRows: [
    {
      pdfUrl: { type: String },
      excelUrl: { type: String },
      description: { type: String }
    }
  ],
  assignedDate: { type: String },  // e.g., "2025-08-08"
  assignedTime: { type: String },  // e.g., "14:30"
  submissionDate: { type: String }, // Filled during submission
  submissionTime: { type: String }, // Filled during submission
status: { type: String, enum: ["inprogress", "started", "completed"], default: "inprogress" }

}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
