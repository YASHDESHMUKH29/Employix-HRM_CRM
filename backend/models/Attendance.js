import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String, required: true },
    date: { type: String, required: true },
    checkIn: { type: String },
    status: { type: String, enum: ["Present", "Absent", "Late"], default: "Present" },
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
