const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager: { type: String, required: true },
  date: { type: Date, required: true },
  tasks: [
    {
      type: { type: String, enum: ['work', 'weekend'], default: 'work' },
      login: { type: String },
      logout: { type: String },
      hours: { type: String }, // <-- allow "8h 30m" directly
    }
  ],
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' },
  submittedAt: { type: Date },
  approvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Timesheet', timesheetSchema);
