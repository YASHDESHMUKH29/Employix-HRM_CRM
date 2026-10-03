import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import Employee from "./models/Employee.js";
import Leave from "./models/Leave.js";
import Department from "./models/Department.js";
import Attendance from "./models/Attendance.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ================= EMPLOYEE ROUTES =================

// GET all employees
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new employee
app.post("/api/employees", async (req, res) => {
  try {
    const newEmployee = new Employee(req.body);
    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE employee
app.delete("/api/employees/:id", async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= LEAVE ROUTES =================

// GET all leaves
app.get("/api/leaves", async (req, res) => {
  try {
    const leaves = await Leave.find().sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update leave status
app.patch("/api/leaves/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(updatedLeave);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST new leave request
app.post("/api/leaves", async (req, res) => {
  try {
    const newLeave = new Leave(req.body);
    const savedLeave = await newLeave.save();
    res.status(201).json(savedLeave);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ================= DEPARTMENT ROUTES =================

// GET all departments
app.get("/api/departments", async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new department
app.post("/api/departments", async (req, res) => {
  try {
    const newDepartment = new Department(req.body);
    const savedDepartment = await newDepartment.save();
    res.status(201).json(savedDepartment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ================= ATTENDANCE ROUTES =================

// GET all attendance records
app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new attendance record
app.post("/api/attendance", async (req, res) => {
  try {
    const newRecord = new Attendance(req.body);
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});