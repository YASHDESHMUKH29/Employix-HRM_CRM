import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    designation:      { type: String, required: true },
    phone:            { type: String, default: '' },
    address:          { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);