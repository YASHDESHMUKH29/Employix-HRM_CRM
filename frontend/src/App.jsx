import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
  });

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [newLeave, setNewLeave] = useState({
    name: "",
    type: "Sick Leave",
    startDate: "",
    endDate: "",
  });

  const fetchAll = async () => {
    try {
      const [empRes, leaveRes, deptRes, attRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/leaves"),
        fetch("/api/departments"),
        fetch("/api/attendance"),
      ]);
      const [empData, leaveData, deptData, attData] = await Promise.all([
        empRes.json(),
        leaveRes.json(),
        deptRes.json(),
        attRes.json(),
      ]);
      setEmployees(empData);
      setLeaves(leaveData);
      setDepartments(deptData);
      setAttendance(attData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addEmployee = async (e) => {
    e.preventDefault();
    if (
      !newEmployee.name ||
      !newEmployee.email ||
      !newEmployee.department ||
      !newEmployee.designation
    ) {
      alert("Please fill all fields");
      return;
    }
    try {
      await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      setNewEmployee({ name: "", email: "", department: "", designation: "" });
      setShowEmployeeForm(false);
      const res = await fetch("/api/employees");
      setEmployees(await res.json());
    } catch (err) {
      console.error("Error adding employee:", err);
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const res = await fetch("/api/employees");
      setEmployees(await res.json());
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };

  const updateLeaveStatus = async (id, newStatus) => {
    try {
      await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const res = await fetch("/api/leaves");
      setLeaves(await res.json());
    } catch (err) {
      console.error("Error updating leave status:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const addLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.name || !newLeave.type || !newLeave.startDate || !newLeave.endDate) {
      alert("Please fill all fields");
      return;
    }
    const dates = `${formatDate(newLeave.startDate)} - ${formatDate(newLeave.endDate)}`;
    try {
      await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeave.name, type: newLeave.type, dates, status: "Pending" }),
      });
      setNewLeave({ name: "", type: "Sick Leave", startDate: "", endDate: "" });
      setShowLeaveForm(false);
      const res = await fetch("/api/leaves");
      setLeaves(await res.json());
    } catch (err) {
      console.error("Error adding leave:", err);
    }
  };

  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const pendingLeavesCount = leaves.filter((l) => l.status === "Pending").length;

  if (loading) {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">E</div>
            <div>
              <h2>EMPLOYIX</h2>
              <p>HRM CRM SYSTEM</p>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  const renderDashboard = () => {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back to Employix HRM CRM</p>
          </div>
          <div className="admin-profile">
            <div className="avatar">A</div>
            <div>
              <strong>Admin User</strong>
              <p>Administrator</p>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div>
              <p>Total Employees</p>
              <h2>{employees.length}</h2>
              <span>Active employees</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div>
              <p>Departments</p>
              <h2>{departments.length}</h2>
              <span>Active departments</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div>
              <p>Present Today</p>
              <h2>{presentCount}</h2>
              <span>Attendance records</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div>
              <p>Pending Leaves</p>
              <h2>{pendingLeavesCount}</h2>
              <span>Requires approval</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="panel">
            <h2>Recent Employees</h2>
            {employees.map((employee) => (
              <div className="recent-item" key={employee._id}>
                <div className="employee-avatar">
                  {employee.name.charAt(0)}
                </div>
                <div>
                  <strong>{employee.name}</strong>
                  <p>
                    {employee.designation} • {employee.department}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Quick Overview</h2>

            <div className="overview-row">
              <span>Attendance Rate</span>
              <strong>87%</strong>
            </div>

            <div className="progress">
              <div className="progress-fill attendance"></div>
            </div>

            <div className="overview-row">
              <span>Leave Requests</span>
              <strong>{leaves.length}</strong>
            </div>

            <div className="progress">
              <div className="progress-fill leave"></div>
            </div>

            <div className="overview-row">
              <span>Recruitment Progress</span>
              <strong>65%</strong>
            </div>

            <div className="progress">
              <div className="progress-fill recruitment"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmployees = () => {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Employee Management</h1>
            <p>Manage employee information and records</p>
          </div>
          <button
            className="primary-btn"
            onClick={() => setShowEmployeeForm(true)}
          >
            + Add Employee
          </button>
        </div>

        {showEmployeeForm && (
          <div className="form-card">
            <h2>Add New Employee</h2>
            <form onSubmit={addEmployee}>
              <div className="form-grid">
                <input
                  placeholder="Employee Name"
                  value={newEmployee.name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                />
                <input
                  placeholder="Email Address"
                  value={newEmployee.email}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, email: e.target.value })
                  }
                />
                <select
                  value={newEmployee.department}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, department: e.target.value })
                  }
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Designation"
                  value={newEmployee.designation}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, designation: e.target.value })
                  }
                />
              </div>
              <div className="form-buttons">
                <button className="primary-btn" type="submit">
                  Add Employee
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowEmployeeForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee._id}>
                  <td>
                    <strong>{employee.name}</strong>
                  </td>
                  <td>{employee.email}</td>
                  <td>
                    <span className="department-badge">
                      {employee.department}
                    </span>
                  </td>
                  <td>{employee.designation}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteEmployee(employee._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDepartments = () => {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Department Management</h1>
            <p>Manage company departments and teams</p>
          </div>
        </div>

        <div className="department-grid">
          {departments.map((dept) => (
            <div className="department-card" key={dept._id}>
              <div className="department-icon">🏢</div>
              <h2>{dept.name}</h2>
              <p>{dept.description}</p>
              <span>{dept.employeeCount} Employees</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttendance = () => {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Attendance Management</h1>
            <p>Monitor employee daily attendance</p>
          </div>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record._id}>
                  <td>{record.employeeName}</td>
                  <td>{record.date}</td>
                  <td>{record.checkIn}</td>
                  <td>
                    <span
                      className={
                        record.status === "Present"
                          ? "present-badge"
                          : record.status === "Late"
                          ? "late-badge"
                          : "absent-badge"
                      }
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLeave = () => {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Leave Management</h1>
            <p>Review and manage employee leave requests</p>
          </div>
          <button
            className="primary-btn"
            onClick={() => setShowLeaveForm(true)}
          >
            + Add Leave Request
          </button>
        </div>

        {showLeaveForm && (
          <div className="form-card">
            <h2>New Leave Request</h2>
            <form onSubmit={addLeave}>
              <div className="form-grid">
                <input
                  placeholder="Employee Name"
                  value={newLeave.name}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, name: e.target.value })
                  }
                />
                <select
                  value={newLeave.type}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, type: e.target.value })
                  }
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
                <input
                  type="date"
                  placeholder="Start Date"
                  value={newLeave.startDate}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, startDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={newLeave.endDate}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, endDate: e.target.value })
                  }
                />
              </div>
              <div className="form-buttons">
                <button className="primary-btn" type="submit">
                  Submit Request
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowLeaveForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="leave-grid">
          {leaves.map((leave) => (
            <div className="leave-card" key={leave._id}>
              <h3>{leave.name}</h3>
              <p>{leave.type}</p>
              <p>{leave.dates}</p>
              <span
                className={`status-badge ${leave.status.toLowerCase()}-badge`}
              >
                {leave.status}
              </span>
              {leave.status === "Pending" && (
                <div className="leave-actions">
                  <button
                    className="approve-btn"
                    onClick={() => updateLeaveStatus(leave._id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => updateLeaveStatus(leave._id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activePage === "Dashboard") return renderDashboard();
    if (activePage === "Employees") return renderEmployees();
    if (activePage === "Departments") return renderDepartments();
    if (activePage === "Attendance") return renderAttendance();
    if (activePage === "Leave Management") return renderLeave();
    return renderDashboard();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">E</div>
          <div>
            <h2>EMPLOYIX</h2>
            <p>HRM CRM SYSTEM</p>
          </div>
        </div>

        <div className="menu">
          {[
            "Dashboard",
            "Employees",
            "Departments",
            "Attendance",
            "Leave Management",
          ].map((item) => (
            <button
              key={item}
              className={`menu-item ${
                activePage === item ? "active" : ""
              }`}
              onClick={() => setActivePage(item)}
            >
              {item === "Dashboard" && "📊 "}
              {item === "Employees" && "👥 "}
              {item === "Departments" && "🏢 "}
              {item === "Attendance" && "🕒 "}
              {item === "Leave Management" && "📅 "}
              {item}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <p>Employix HRM CRM</p>
          <span>Version 1.0</span>
        </div>
      </aside>

      <main className="main-content">{renderContent()}</main>
    </div>
  );
}

export default App;
