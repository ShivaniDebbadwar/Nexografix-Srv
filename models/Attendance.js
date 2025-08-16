const mongoose = require("mongoose");

const breakSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date }, // null until break-out
  durationMinutes: { type: Number, default: 0 } // computed at break-out
});

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true }, // store midnight UTC for the day
  loginTime: { type: Date },
  logoutTime: { type: Date },
  breaks: [breakSchema],
  totalBreakMinutes: { type: Number, default: 0 },
  totalWorkMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ["in_progress", "on_break", "completed"], default: "in_progress" }
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true }); // one record per user+day

module.exports = mongoose.model("Attendance", attendanceSchema);
