import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";
import Leave from "./models/Leave.js";
import Department from "./models/Department.js";
import Attendance from "./models/Attendance.js";

dotenv.config();

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

const seedData = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected for seeding");

    // Clear existing data
    await Department.deleteMany({});
    await Employee.deleteMany({});
    await Leave.deleteMany({});
    await Attendance.deleteMany({});
    console.log("Cleared existing data");

    // Seed Departments
    const departments = await Department.insertMany([
      { name: "IT", description: "Information Technology team managing systems and software", employeeCount: 5 },
      { name: "HR", description: "Human Resources managing people and policies", employeeCount: 3 },
      { name: "Finance", description: "Finance and accounting department", employeeCount: 4 },
      { name: "Marketing", description: "Marketing and brand management team", employeeCount: 6 },
      { name: "Operations", description: "Operations and logistics management", employeeCount: 7 },
    ]);
    console.log("Departments seeded:", departments.length);

    // Seed Employees
    const employees = await Employee.insertMany([
      { name: "Rahul Sharma", email: "rahul@employix.com", department: "IT", designation: "Software Developer" },
      { name: "Priya Patil", email: "priya@employix.com", department: "HR", designation: "HR Manager" },
      { name: "Amit Kulkarni", email: "amit@employix.com", department: "Finance", designation: "Accountant" },
    ]);
    console.log("Employees seeded:", employees.length);

    // Seed Leave Requests
    const leaves = await Leave.insertMany([
      { name: "Rahul Sharma", type: "Sick Leave", dates: "02 Sep 2026 - 04 Sep 2026", status: "Pending" },
      { name: "Priya Patil", type: "Casual Leave", dates: "05 Sep 2026 - 06 Sep 2026", status: "Pending" },
    ]);
    console.log("Leave requests seeded:", leaves.length);

    // Seed Attendance Records
    const attendanceRecords = await Attendance.insertMany([
      { employeeId: employees[0]._id, employeeName: "Rahul Sharma", date: "01 Sep 2026", checkIn: "09:00 AM", status: "Present" },
      { employeeId: employees[1]._id, employeeName: "Priya Patil", date: "01 Sep 2026", checkIn: "09:00 AM", status: "Present" },
      { employeeId: employees[2]._id, employeeName: "Amit Kulkarni", date: "01 Sep 2026", checkIn: "09:30 AM", status: "Present" },
    ]);
    console.log("Attendance records seeded:", attendanceRecords.length);

    console.log("\nSeeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedData();
