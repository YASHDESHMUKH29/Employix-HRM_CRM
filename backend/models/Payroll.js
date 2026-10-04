import mongoose from 'mongoose';
const payrollSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  basicSalary: { type: Number, required: true },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netPay: { type: Number },
  month: { type: String, required: true },
  payDate: { type: String },
  status: { type: String, enum: ['Pending','Paid'], default: 'Pending' },
}, { timestamps: true });
export default mongoose.model('Payroll', payrollSchema);
