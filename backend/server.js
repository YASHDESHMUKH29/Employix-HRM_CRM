import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import Employee    from "./models/Employee.js";
import Leave       from "./models/Leave.js";
import Department  from "./models/Department.js";
import Attendance  from "./models/Attendance.js";
import Candidate   from "./models/Candidate.js";
import Payroll     from "./models/Payroll.js";
import Performance from "./models/Performance.js";
import User        from "./models/User.js";

import authRouter from "./routes/auth.js";
import { verifyToken, authorizeRoles } from "./middleware/auth.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── MongoDB Connection ───────────────────────────────────────────
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
  console.error("FATAL: No MongoDB URI found. Set MONGODB_URI in your .env file.");
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ── Auth routes (public) ─────────────────────────────────────────
app.use("/api/auth", authRouter);

// ── Role-guard shorthand ─────────────────────────────────────────
const anyAuth    = verifyToken;
// Managers who can create / approve / mutate:
const hrOrAdmin  = [verifyToken, authorizeRoles("Admin", "HR Manager", "Department Manager")];
const adminOnly  = [verifyToken, authorizeRoles("Admin")];
const recruiters = [verifyToken, authorizeRoles("Admin", "Recruiter")];

// ── Employee-scoped filter helper ────────────────────────────────
/**
 * For requests made by an Employee-role user, returns a Mongoose
 * query filter restricted to that employee's records.
 * For all other roles returns {} (no restriction).
 *
 * @param {object} jwtPayload  req.user  { id, email, role }
 * @param {string} field       The document field that holds the ObjectId
 *                             reference to Employee (e.g. 'employeeId')
 * @returns {{ [field]: ObjectId } | {}}
 */
async function employeeScopeFilter(jwtPayload, field = "employeeId") {
  if (jwtPayload.role !== "Employee") return {};

  // employeeId is NOT in the JWT — look it up from the User document
  const user = await User.findById(jwtPayload.id).lean();
  if (!user?.employeeId) return { [field]: null }; // no linked record → empty result
  return { [field]: user.employeeId };
}

// ── EMPLOYEE ROUTES ──────────────────────────────────────────────

// GET – any logged-in user (Employee role sees all names for UI dropdowns)
app.get("/api/employees", anyAuth, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/me – Employee sees only their own record
app.get("/api/employees/me", anyAuth, async (req, res) => {
  try {
    if (req.user.role !== "Employee") {
      return res.status(403).json({ error: "Only Employee accounts have a /me profile." });
    }
    const user = await User.findById(req.user.id).lean();
    if (!user?.employeeId) return res.status(404).json({ error: "No employee record linked to this account." });
    const emp = await Employee.findById(user.employeeId);
    if (!emp) return res.status(404).json({ error: "Employee record not found." });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST – Admin / HR Manager / Department Manager
app.post("/api/employees", hrOrAdmin, async (req, res) => {
  try {
    const emp   = new Employee(req.body);
    const saved = await emp.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE – Admin only (cascade: removes attendance + leave records)
app.delete("/api/employees/:id", adminOnly, async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    await Attendance.deleteMany({ employeeId: emp._id });
    await Leave.deleteMany({ employeeId: emp._id });
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee and related records deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH – any logged-in user; Employee can only update their own record
app.patch("/api/employees/:id", anyAuth, async (req, res) => {
  try {
    // If Employee role, verify the :id matches their linked employeeId
    if (req.user.role === 'Employee') {
      const user = await User.findById(req.user.id).lean();
      if (!user?.employeeId || user.employeeId.toString() !== req.params.id) {
        return res.status(403).json({ error: 'Employees can only update their own profile.' });
      }
    }
    // Only allow safe fields
    const { name, email, phone, address, emergencyContact, department, designation } = req.body;
    const updateFields = {};
    if (name             !== undefined) updateFields.name             = name;
    if (email            !== undefined) updateFields.email            = email;
    if (phone            !== undefined) updateFields.phone            = phone;
    if (address          !== undefined) updateFields.address          = address;
    if (emergencyContact !== undefined) updateFields.emergencyContact = emergencyContact;
    if (department       !== undefined) updateFields.department       = department;
    if (designation      !== undefined) updateFields.designation      = designation;
    const updated = await Employee.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) return res.status(404).json({ error: 'Employee not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── LEAVE ROUTES ─────────────────────────────────────────────────

// GET – Employees see only their own leaves; all other roles see all
app.get("/api/leaves", anyAuth, async (req, res) => {
  try {
    const filter = await employeeScopeFilter(req.user, "employeeId");
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST – any authenticated user can submit a leave request
app.post("/api/leaves", anyAuth, async (req, res) => {
  try {
    // If an Employee submits, stamp their employeeId automatically
    if (req.user.role === "Employee") {
      const user = await User.findById(req.user.id).lean();
      if (user?.employeeId) req.body.employeeId = user.employeeId;
    }
    const leave = new Leave(req.body);
    const saved = await leave.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH – Admin / HR Manager / Department Manager can approve or reject;
//         also updates leavesTaken / pendingLeaves counters
app.patch("/api/leaves/:id", hrOrAdmin, async (req, res) => {
  try {
    const { status, leavesTaken, pendingLeaves } = req.body;

    const updateFields = {};
    if (status)       updateFields.status       = status;
    if (leavesTaken  !== undefined) updateFields.leavesTaken  = leavesTaken;
    if (pendingLeaves !== undefined) updateFields.pendingLeaves = pendingLeaves;

    const updated = await Leave.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Leave not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DEPARTMENT ROUTES ────────────────────────────────────────────

app.get("/api/departments", anyAuth, async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/departments", hrOrAdmin, async (req, res) => {
  try {
    const dept  = new Department(req.body);
    const saved = await dept.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/departments/:id", hrOrAdmin, async (req, res) => {
  try {
    const updated = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Department not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── ATTENDANCE ROUTES ────────────────────────────────────────────

// GET – Employees see only their own records
app.get("/api/attendance", anyAuth, async (req, res) => {
  try {
    const filter  = await employeeScopeFilter(req.user, "employeeId");
    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/attendance", hrOrAdmin, async (req, res) => {
  try {
    const record = new Attendance(req.body);
    const saved  = await record.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/attendance/:id", hrOrAdmin, async (req, res) => {
  try {
    const { status, checkIn } = req.body;
    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...(status  && { status }),
        ...(checkIn && { checkIn }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Record not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── CANDIDATE ROUTES ─────────────────────────────────────────────

// GET – Admin, HR Manager, Department Manager, Recruiter
app.get("/api/candidates", [verifyToken, authorizeRoles("Admin", "HR Manager", "Department Manager", "Recruiter")], async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/candidates", recruiters, async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    const saved     = await candidate.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/candidates/:id", recruiters, async (req, res) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Candidate not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/candidates/:id", adminOnly, async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ message: "Candidate deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAYROLL ROUTES ───────────────────────────────────────────────

// GET – Admin / HR Manager / Department Manager see all;
//       Employee sees only their own payslips
app.get("/api/payroll", anyAuth, async (req, res) => {
  try {
    const filter  = await employeeScopeFilter(req.user, "employeeId");
    const records = await Payroll.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll", hrOrAdmin, async (req, res) => {
  try {
    const data    = req.body;
    data.netPay   = (Number(data.basicSalary) || 0) +
                    (Number(data.allowances)  || 0) -
                    (Number(data.deductions)  || 0);
    const record  = new Payroll(data);
    const saved   = await record.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/payroll/:id", hrOrAdmin, async (req, res) => {
  try {
    const updated = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Payroll record not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/payroll/:id", adminOnly, async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: "Payroll record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PERFORMANCE ROUTES ───────────────────────────────────────────

// GET – Employees see only their own reviews
app.get("/api/performance", anyAuth, async (req, res) => {
  try {
    const filter  = await employeeScopeFilter(req.user, "employeeId");
    const records = await Performance.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/performance", hrOrAdmin, async (req, res) => {
  try {
    const record = new Performance(req.body);
    const saved  = await record.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/performance/:id", hrOrAdmin, async (req, res) => {
  try {
    const updated = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Performance record not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/performance/:id", adminOnly, async (req, res) => {
  try {
    await Performance.findByIdAndDelete(req.params.id);
    res.json({ message: "Performance record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
