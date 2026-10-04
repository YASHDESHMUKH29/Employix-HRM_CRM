import mongoose from 'mongoose';
const performanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  reviewPeriod: { type: String, required: true },
  kpi: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String },
  reviewedBy: { type: String },
  status: { type: String, enum: ['Draft','Submitted','Acknowledged'], default: 'Draft' },
}, { timestamps: true });
export default mongoose.model('Performance', performanceSchema);
