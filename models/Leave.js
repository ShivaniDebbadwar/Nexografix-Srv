const mongoose = require("mongoose");

const LEAVE_TYPES = [
  "casual",
  "sick",
  "earned",
  "maternity",
  "unpaid",
  "comp-off",
  "other",
];

const STATUS = ["pending", "approved", "rejected"];

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Auto-filled from the User doc if missing
    manager: {
      type: String,
      required: false,
      trim: true,
    },

    leaveType: {
      type: String,
      enum: LEAVE_TYPES,
      default: "other",
      lowercase: true,
      trim: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    fromDate: {
      type: Date,
      required: true,
    },

    toDate: {
      type: Date,
      required: true,
    },

    // Computed automatically (inclusive)
    leaveDays: {
      type: Number,
      default: 1,
      min: [1, "leaveDays must be at least 1"],
    },

    status: {
      type: String,
      enum: STATUS,
      default: "pending",
      lowercase: true,
      index: true,
    },

    // admin remark on approve/reject
    comment: {
      type: String,
      trim: true,
    },

    attachmentUrl: {
      type: String,
      trim: true,
      // loose but useful URL check; adjust as needed
      match: [
        /^(https?:\/\/)([\w.-]+)(:[0-9]+)?(\/.*)?$/i,
        "attachmentUrl must be a valid URL",
      ],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Helpful compound index for lists
leaveSchema.index({ employeeId: 1, createdAt: -1 });

// Normalize dates, validate range, compute leaveDays (inclusive)
leaveSchema.pre("validate", function (next) {
  if (this.fromDate && this.toDate) {
    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);

    // normalize to local midnight to avoid off-by-one
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    if (to < from) {
      return next(
        new mongoose.Error.ValidationError(this).addError(
          "toDate",
          new mongoose.Error.ValidatorError({
            message: "toDate cannot be earlier than fromDate",
            path: "toDate",
            value: this.toDate,
          })
        )
      );
    }

    this.fromDate = from;
    this.toDate = to;

    const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
    this.leaveDays = diffDays;
  }

  // normalize fields
  if (this.status) this.status = String(this.status).toLowerCase();
  if (this.leaveType) this.leaveType = String(this.leaveType).toLowerCase();

  next();
});

// Auto-fill manager from User if missing
leaveSchema.pre("save", async function (next) {
  if (!this.manager) {
    try {
      const User = mongoose.model("User");
      const u = await User.findById(this.employeeId).select("manager");
      if (u?.manager) this.manager = u.manager;
    } catch (e) {
      // Don't block save solely because manager lookup failed
    }
  }
  next();
});

module.exports = mongoose.model("Leave", leaveSchema);
