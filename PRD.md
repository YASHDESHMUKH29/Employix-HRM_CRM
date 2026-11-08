# Product Requirement Document (PRD)

## 1. Product Overview
- **Product Name:** Employix
- **Product Type:** Full-Stack Human Resource Management (HRM) & Internal CRM System
- **Version:** 1.0 (Full-Stack Live Database Release)
- **Target Audience:** HR Administrators, Operations Managers, Department Leads, and Employees.

---

## 2. Problem Statement & Objective
- **Problem:** Managing employee records, leave approvals, attendance tracking, payroll, and recruitment across fragmented spreadsheets leads to operational delays, data mismatch, and lack of real-time visibility.
- **Objective:** Provide a unified, responsive web application backed by a live RESTful API and persistent MongoDB database to streamline workforce operations, tracking, and reporting in real time.

---

## 3. Core Modules & Feature Scope

### 3.1 Dashboard & Key Metrics
- **Dynamic Stat Cards:** Real-time counters showing Total Employees, Active Departments, Present Today count, Pending Leave Requests, Open Recruitment Positions, and Payroll processing stats.
- **Role-Based Demo Selector:** Executive navigation control to simulate Admin and Employee perspectives dynamically across screens.

### 3.2 Employee Management
- **Directory Table:** Centralized view detailing Employee Name, Email, Department, Role, and Designation.
- **CRUD Operations:** REST API integration supporting employee creation, live directory listing, detail inspection, and record deletion directly synchronized with MongoDB.

### 3.3 Attendance & Leave Tracking
- **Attendance Monitoring:** Real-time daily check-in logs and present status tracking across departments.
- **Leave Requests & Approval Workflow:** Full lifecycle handling of employee leave submissions (Medical, Annual, Casual) with instant Admin Approve/Reject actions that update database statuses.

### 3.4 Department & Organizational Structure
- **Department Directory:** Overview of organizational units (IT, HR, Finance, Marketing, Operations) displaying active headcount metrics and department leadership.

### 3.5 Payroll, Recruitment & Reports (Extended Modules)
- **Payroll Management:** Salary processing tracking, status badges (Paid/Pending), and department-wise payroll breakdowns.
- **Recruitment Management:** Job opening trackers, applicant candidate pools, and hiring pipeline statuses.
- **HR Analytics & Reports:** Centralized reporting view generating summaries for attendance trends, department allocations, and leave usage.

---

## 4. Technical Architecture

### 4.1 Technology Stack
- **Frontend:** React.js, Vite, Tailwind CSS / Custom CSS, Lucide React Icons.
- **Backend:** Node.js, Express.js (REST API framework).
- **Database:** MongoDB / MongoDB Atlas using Mongoose ODM.
- **Environment Management:** dotenv for backend port, URI, and secret configurations.

### 4.2 Data & Database Architecture
- **Seeded Database Engine:** Automated `seed.js` script populating MongoDB with relational mock records (Employees, Departments, Attendance, Leave Requests, Payroll, Positions).
- **API Communication:** Async HTTP communications (`fetch`/`axios`) connecting React frontend state to Express REST API controllers (`/api/employees`, `/api/departments`, `/api/attendance`, `/api/leaves`).

---

## 5. Production & Future Scope (Phase 2)
- **Authentication & Authorization:** JWT (JSON Web Token) authentication with persistent login sessions (`/api/auth/login`, `/api/auth/register`).
- **Strict Role-Based Access Control (RBAC):** Route protection middleware securing backend endpoints and hiding sensitive UI options based on authenticated user tokens.
- **Document Export & Uploads:** Exporting payroll/attendance summaries to PDF/CSV and profile photo attachments via Cloudinary/S3 storage.

```

---