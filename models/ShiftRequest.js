const mongoose = require("mongoose");

const shiftRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  managerRemark: { type: String }, // optional field for manager's notes
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ShiftRequest", shiftRequestSchema);
