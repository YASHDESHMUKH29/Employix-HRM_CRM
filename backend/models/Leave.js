import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    // Link to the Employee document — used for employee-scoped API filtering.
    // Optional so that legacy records seeded without an ObjectId still load.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    name: { type: String, required: true },
    type: { type: String, required: true },
    // Human-readable date range string, e.g. "02 Sep 2026 - 04 Sep 2026"
    dates: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // ── Leave balance tracking ─────────────────────────────────
    totalLeaves:   { type: Number, default: 24 },
    leavesTaken:   { type: Number, default: 0  },
    pendingLeaves: { type: Number, default: 0  },
    // leaveBalance is a virtual: totalLeaves - leavesTaken
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

// Virtual: remaining leave balance
leaveSchema.virtual("leaveBalance").get(function () {
  return this.totalLeaves - this.leavesTaken;
});

export default mongoose.model("Leave", leaveSchema);
