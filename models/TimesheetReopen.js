const mongoose = require("mongoose");

const TimesheetReopenSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reason: String,
  date: String,
  manager: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
});

module.exports = mongoose.model("TimesheetReopen", TimesheetReopenSchema);
