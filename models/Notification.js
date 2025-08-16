// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientRole: { type: String, enum: ["admin", "employee"], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional for per-user
  message: { type: String, required: true },
  meta: { type: Object }, // e.g., { taskId, title, employeeName }
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
