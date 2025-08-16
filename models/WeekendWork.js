// models/WeekendWork.js
const mongoose = require("mongoose");

const weekendWorkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // store both for convenience
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managerName: { type: String, required: true, trim: true },

    date: { type: Date, required: true, index: true },
    reason: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
      lowercase: true,
      index: true,
    },

    submittedAt: { type: Date },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// prevent duplicates per user per date
weekendWorkSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("WeekendWork", weekendWorkSchema);
