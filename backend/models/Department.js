import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    employeeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
