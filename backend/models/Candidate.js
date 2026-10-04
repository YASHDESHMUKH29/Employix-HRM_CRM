import mongoose from 'mongoose';
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  position: { type: String, required: true },
  department: { type: String, required: true },
  interviewDate: { type: String },
  status: { type: String, enum: ['Applied','Shortlisted','Interview Scheduled','Hired','Rejected'], default: 'Applied' },
}, { timestamps: true });
export default mongoose.model('Candidate', candidateSchema);
