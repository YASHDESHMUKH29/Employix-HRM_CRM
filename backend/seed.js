import mongoose from "mongoose";
import dotenv from "dotenv";

import User        from "./models/User.js";
import Employee    from "./models/Employee.js";
import Leave       from "./models/Leave.js";
import Department  from "./models/Department.js";
import Attendance  from "./models/Attendance.js";

dotenv.config();

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

const seedData = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected for seeding");

    // ── Clear all collections ──────────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Employee.deleteMany({}),
      Leave.deleteMany({}),
      Attendance.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // ── Seed Departments ───────────────────────────────────────────
    const departments = await Department.insertMany([
      { name: "IT",         description: "Information Technology — systems and software", employeeCount: 5 },
      { name: "HR",         description: "Human Resources — people and policies",         employeeCount: 3 },
      { name: "Finance",    description: "Finance and accounting",                         employeeCount: 4 },
      { name: "Marketing",  description: "Marketing and brand management",                 employeeCount: 6 },
      { name: "Operations", description: "Operations and logistics",                       employeeCount: 7 },
    ]);
    console.log(`Departments seeded: ${departments.length}`);

    // ── Seed Employees ─────────────────────────────────────────────
    const employees = await Employee.insertMany([
      { name: "Rahul Sharma",  email: "rahul@employix.com",  department: "IT",      designation: "Software Developer" },
      { name: "Priya Patil",   email: "priya@employix.com",  department: "HR",      designation: "HR Manager"         },
      { name: "Amit Kulkarni", email: "amit@employix.com",   department: "Finance", designation: "Accountant"         },
    ]);
    console.log(`Employees seeded: ${employees.length}`);

    // Convenience references
    const rahul = employees[0]; // linked to employee@employix.com
    const priya = employees[1];
    const amit  = employees[2];

    // ── Seed Leave Requests ────────────────────────────────────────
    // employeeId is now stored so employee-scoped API filtering works.
    await Leave.insertMany([
      {
        employeeId:    rahul._id,
        name:          "Rahul Sharma",
        type:          "Sick Leave",
        dates:         "02 Sep 2026 - 04 Sep 2026",
        status:        "Pending",
        totalLeaves:   24,
        leavesTaken:   3,
        pendingLeaves: 1,
      },
      {
        employeeId:    priya._id,
        name:          "Priya Patil",
        type:          "Casual Leave",
        dates:         "05 Sep 2026 - 06 Sep 2026",
        status:        "Pending",
        totalLeaves:   24,
        leavesTaken:   2,
        pendingLeaves: 1,
      },
    ]);
    console.log("Leave requests seeded: 2");

    // ── Seed Attendance Records ────────────────────────────────────
    await Attendance.insertMany([
      { employeeId: rahul._id, employeeName: "Rahul Sharma",  date: "01 Sep 2026", checkIn: "09:00", status: "Present" },
      { employeeId: priya._id, employeeName: "Priya Patil",   date: "01 Sep 2026", checkIn: "09:00", status: "Present" },
      { employeeId: amit._id,  employeeName: "Amit Kulkarni", date: "01 Sep 2026", checkIn: "09:30", status: "Present" },
    ]);
    console.log("Attendance records seeded: 3");

    // ── Seed User Accounts (all 5 roles) ───────────────────────────
    // Passwords are hashed by the User model's pre-save hook.
    const users = await User.create([
      {
        email:    "admin@employix.com",
        password: "Password123",
        role:     "Admin",
      },
      {
        email:    "hr@employix.com",
        password: "Password123",
        role:     "HR Manager",
      },
      {
        email:    "dept.manager@employix.com",
        password: "Password123",
        role:     "Department Manager",
      },
      {
        email:    "recruiter@employix.com",
        password: "Password123",
        role:     "Recruiter",
      },
      {
        // Linked to Rahul Sharma so Employee-scoped routes filter correctly
        email:      "employee@employix.com",
        password:   "Password123",
        role:       "Employee",
        employeeId: rahul._id,
      },
    ]);

    console.log(`\nUser accounts seeded: ${users.length}`);
    console.log("  admin@employix.com        → Admin");
    console.log("  hr@employix.com           → HR Manager");
    console.log("  dept.manager@employix.com → Department Manager");
    console.log("  recruiter@employix.com    → Recruiter");
    console.log("  employee@employix.com     → Employee (linked to Rahul Sharma)");
    console.log("\nAll passwords: Password123");
    console.log("\nSeeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err.message);
    process.exit(1);
  }
};

seedData();
