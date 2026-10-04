import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('Admin');

  // Core state
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [performance, setPerformance] = useState([]);

  // Toast
  const [toasts, setToasts] = useState([]);

  // Announcements (frontend-only, no persistence)
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);
  const [newAnnouncementText, setNewAnnouncementText] = useState('');

  // Employee form
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', department: '', designation: '' });

  // Leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [newLeave, setNewLeave] = useState({ name: '', type: 'Sick Leave', startDate: '', endDate: '' });

  // Department form
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });

  // Attendance form
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [newAttendance, setNewAttendance] = useState({ employeeName: '', date: '', checkIn: '', status: 'Present' });

  // Candidate form
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', email: '', phone: '', position: '', department: '', interviewDate: '', status: 'Applied' });

  // Payroll form
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [newPayroll, setNewPayroll] = useState({ employeeId: '', employeeName: '', department: '', designation: '', basicSalary: '', allowances: '0', deductions: '0', month: '', payDate: '' });

  // Performance form
  const [showPerformanceForm, setShowPerformanceForm] = useState(false);
  const [newPerformance, setNewPerformance] = useState({ employeeId: '', employeeName: '', department: '', reviewPeriod: '', kpi: '', rating: '3', review: '', reviewedBy: '' });

  // Payslip print state
  const [printPayslip, setPrintPayslip] = useState(null);

  // Toast helpers
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // Safe fetch
  const safeFetchArray = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) { console.error(`API error ${res.status} for ${url}`); return []; }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`Network error for ${url}:`, err);
      return [];
    }
  };

  const fetchAll = async () => {
    try {
      const [empData, leaveData, deptData, attData, candData, payData, perfData] = await Promise.all([
        safeFetchArray('/api/employees'),
        safeFetchArray('/api/leaves'),
        safeFetchArray('/api/departments'),
        safeFetchArray('/api/attendance'),
        safeFetchArray('/api/candidates'),
        safeFetchArray('/api/payroll'),
        safeFetchArray('/api/performance'),
      ]);
      setEmployees(empData);
      setLeaves(leaveData);
      setDepartments(deptData);
      setAttendance(attData);
      setCandidates(candData);
      setPayroll(payData);
      setPerformance(perfData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Derived counts
  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const attendanceRate = Math.round((presentCount / Math.max(attendance.length, 1)) * 100);
  const recruitmentRate = Math.round((candidates.filter(c => c.status === 'Hired').length / Math.max(candidates.length, 1)) * 100);
  const openPositions = candidates.filter(c => c.status !== 'Hired' && c.status !== 'Rejected').length;

  // Role-based permissions
  const canEdit = role === 'Admin' || role === 'HR Manager';
  const canRecruit = role === 'Admin' || role === 'Recruiter';

  // Date helpers
  const todayString = (() => {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  })();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const nowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const nowTimestamp = () => {
    const d = new Date();
    return `${todayString} ${nowTime()}`;
  };

  // CSV export utility
  const exportCSV = (filename, headers, rows) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // -- Employee handlers --
  const addEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.department || !newEmployee.designation) {
      showToast('Please fill all fields.', 'error'); return;
    }
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewEmployee({ name: '', email: '', department: '', designation: '' });
      setShowEmployeeForm(false);
      setEmployees(await safeFetchArray('/api/employees'));
      showToast(`Employee "${newEmployee.name}" added successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to add employee.', 'error');
    }
  };

  const deleteEmployee = async (id, name) => {
    try {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const [empData, leaveData, attData] = await Promise.all([
        safeFetchArray('/api/employees'),
        safeFetchArray('/api/leaves'),
        safeFetchArray('/api/attendance'),
      ]);
      setEmployees(empData);
      setLeaves(leaveData);
      setAttendance(attData);
      showToast(`Employee "${name}" and their records removed.`);
    } catch (err) {
      showToast('Failed to delete employee.', 'error');
    }
  };

  // -- Leave handlers --
  const addLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.name || !newLeave.type || !newLeave.startDate || !newLeave.endDate) {
      showToast('Please fill all fields.', 'error'); return;
    }
    const dates = `${formatDate(newLeave.startDate)} - ${formatDate(newLeave.endDate)}`;
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeave.name, type: newLeave.type, dates, status: 'Pending' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewLeave({ name: '', type: 'Sick Leave', startDate: '', endDate: '' });
      setShowLeaveForm(false);
      setLeaves(await safeFetchArray('/api/leaves'));
      showToast('Leave request submitted successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to submit leave request.', 'error');
    }
  };

  const updateLeaveStatus = async (id, newStatus, employeeName) => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setLeaves(await safeFetchArray('/api/leaves'));
      showToast(`Leave for ${employeeName} ${newStatus.toLowerCase()}.`, newStatus === 'Approved' ? 'success' : 'warning');
    } catch (err) {
      showToast('Failed to update leave status.', 'error');
    }
  };

  // -- Department handlers --
  const addDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.name) { showToast('Department name is required.', 'error'); return; }
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDepartment, employeeCount: 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewDepartment({ name: '', description: '' });
      setShowDepartmentForm(false);
      setDepartments(await safeFetchArray('/api/departments'));
      showToast(`Department "${newDepartment.name}" created successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to create department.', 'error');
    }
  };

  // -- Attendance handlers --
  const markAttendance = async (e) => {
    e.preventDefault();
    if (!newAttendance.employeeName || !newAttendance.date) {
      showToast('Employee name and date are required.', 'error'); return;
    }
    const matched = employees.find(emp => emp.name.toLowerCase() === newAttendance.employeeName.toLowerCase());
    if (!matched) { showToast('No employee found with that name.', 'error'); return; }
    const payload = {
      employeeId: matched._id,
      employeeName: matched.name,
      date: formatDate(newAttendance.date),
      checkIn: newAttendance.checkIn || nowTime(),
      status: newAttendance.status,
    };
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewAttendance({ employeeName: '', date: '', checkIn: '', status: 'Present' });
      setShowAttendanceForm(false);
      setAttendance(await safeFetchArray('/api/attendance'));
      showToast(`Attendance marked for ${matched.name} \u2014 ${payload.status}.`);
    } catch (err) {
      showToast(err.message || 'Failed to mark attendance.', 'error');
    }
  };

  const updateAttendanceStatus = async (id, newStatus, employeeName) => {
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAttendance(await safeFetchArray('/api/attendance'));
      showToast(`${employeeName} marked as ${newStatus}.`);
    } catch (err) {
      showToast('Failed to update attendance.', 'error');
    }
  };

  // -- Candidate handlers --
  const addCandidate = async (e) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.email || !newCandidate.position || !newCandidate.department) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewCandidate({ name: '', email: '', phone: '', position: '', department: '', interviewDate: '', status: 'Applied' });
      setShowCandidateForm(false);
      setCandidates(await safeFetchArray('/api/candidates'));
      showToast(`Candidate "${newCandidate.name}" added.`);
    } catch (err) {
      showToast(err.message || 'Failed to add candidate.', 'error');
    }
  };

  const updateCandidateStatus = async (id, newStatus, name) => {
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCandidates(await safeFetchArray('/api/candidates'));
      showToast(`${name} status updated to ${newStatus}.`);
    } catch (err) {
      showToast('Failed to update candidate.', 'error');
    }
  };

  const deleteCandidate = async (id, name) => {
    try {
      await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      setCandidates(await safeFetchArray('/api/candidates'));
      showToast(`Candidate "${name}" removed.`);
    } catch (err) {
      showToast('Failed to delete candidate.', 'error');
    }
  };

  // -- Payroll handlers --
  const addPayroll = async (e) => {
    e.preventDefault();
    if (!newPayroll.employeeId || !newPayroll.basicSalary || !newPayroll.month) {
      showToast('Employee, basic salary, and month are required.', 'error'); return;
    }
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayroll),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewPayroll({ employeeId: '', employeeName: '', department: '', designation: '', basicSalary: '', allowances: '0', deductions: '0', month: '', payDate: '' });
      setShowPayrollForm(false);
      setPayroll(await safeFetchArray('/api/payroll'));
      showToast('Payroll record added.');
    } catch (err) {
      showToast(err.message || 'Failed to add payroll record.', 'error');
    }
  };

  const markPaid = async (id, employeeName) => {
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPayroll(await safeFetchArray('/api/payroll'));
      showToast(`Payroll for ${employeeName} marked as Paid.`);
    } catch (err) {
      showToast('Failed to mark as paid.', 'error');
    }
  };

  // -- Performance handlers --
  const addPerformance = async (e) => {
    e.preventDefault();
    if (!newPerformance.employeeId || !newPerformance.reviewPeriod || !newPerformance.kpi || !newPerformance.rating) {
      showToast('Employee, review period, KPI, and rating are required.', 'error'); return;
    }
    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPerformance, rating: Number(newPerformance.rating) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewPerformance({ employeeId: '', employeeName: '', department: '', reviewPeriod: '', kpi: '', rating: '3', review: '', reviewedBy: '' });
      setShowPerformanceForm(false);
      setPerformance(await safeFetchArray('/api/performance'));
      showToast('Performance review added.');
    } catch (err) {
      showToast(err.message || 'Failed to add performance review.', 'error');
    }
  };

  const updatePerformanceStatus = async (id, newStatus, name) => {
    try {
      const res = await fetch(`/api/performance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPerformance(await safeFetchArray('/api/performance'));
      showToast(`${name} review status updated to ${newStatus}.`);
    } catch (err) {
      showToast('Failed to update performance status.', 'error');
    }
  };

  // -- Announcement handlers --
  const postAnnouncement = () => {
    if (!newAnnouncementText.trim()) return;
    const newItem = { id: Date.now(), text: newAnnouncementText.trim(), timestamp: nowTimestamp() };
    setAnnouncements(prev => {
      const updated = [newItem, ...prev];
      return updated.length > 3 ? updated.slice(0, 3) : updated;
    });
    setNewAnnouncementText('');
    setShowAnnouncementInput(false);
    showToast('Announcement posted.');
  };

  const dismissAnnouncement = (id) => setAnnouncements(prev => prev.filter(a => a.id !== id));

  // -- Print payslip --
  const handlePrintPayslip = (record) => {
    setPrintPayslip(record);
    setTimeout(() => { window.print(); setPrintPayslip(null); }, 150);
  };

  // -- Badge helpers --
  const attendanceBadgeClass = (status) => {
    if (status === 'Present') return 'present-badge';
    if (status === 'Late') return 'late-badge';
    if (status === 'Half-Day') return 'halfday-badge';
    return 'absent-badge';
  };

  const candidateBadgeClass = (status) => {
    if (status === 'Applied') return 'applied-badge';
    if (status === 'Shortlisted') return 'shortlisted-badge';
    if (status === 'Interview Scheduled') return 'interview-badge';
    if (status === 'Hired') return 'hired-badge';
    return 'rejected-badge';
  };

  const performanceBadgeClass = (status) => {
    if (status === 'Submitted') return 'shortlisted-badge';
    if (status === 'Acknowledged') return 'approved-badge';
    return 'pending-badge';
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'star-filled' : 'star-empty'}>{i < rating ? '\u2605' : '\u2606'}</span>
    ));
  };

  // -- Loading screen --
  if (loading) {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">E</div>
            <div><h2>EMPLOYIX</h2><p>HRM CRM SYSTEM</p></div>
          </div>
        </aside>
        <main className="main-content"><p>Loading\u2026</p></main>
      </div>
    );
  }

  // -- Sidebar nav items by role --
  const allNavItems = [
    { label: 'Dashboard', icon: '\uD83D\uDCCA' },
    { label: 'Employees', icon: '\uD83D\uDC65' },
    { label: 'Departments', icon: '\uD83C\uDFE2' },
    { label: 'Attendance', icon: '\uD83D\uDD52' },
    { label: 'Leave Management', icon: '\uD83D\uDCC5' },
    { label: 'Recruitment', icon: '\uD83D\uDCCB', show: canRecruit },
    { label: 'Payroll', icon: '\uD83D\uDCB0', show: canEdit },
    { label: 'Performance', icon: '\u2B50' },
    { label: 'Reports', icon: '\uD83D\uDCC8', show: canEdit },
  ];

  const visibleNavItems = allNavItems.filter(item => {
    if (item.show === false) return false;
    if (role === 'Employee') return ['Dashboard','Attendance','Leave Management'].includes(item.label);
    if (role === 'Recruiter') return ['Dashboard','Recruitment'].includes(item.label);
    if (role === 'HR Manager') return item.label !== 'Recruitment';
    return true; // Admin sees all
  });

  // -- Page renderers --
  const renderDashboard = () => (
    <div>
      {/* Announcements banner */}
      {announcements.length > 0 && (
        <div style={{marginBottom: '20px'}}>
          {announcements.map(ann => (
            <div key={ann.id} className="announcement-banner">
              <div>
                <strong>\uD83D\uDCE2 Announcement</strong>
                <p>{ann.text}</p>
                <small>{ann.timestamp}</small>
              </div>
              <button className="toast-close" onClick={() => dismissAnnouncement(ann.id)} aria-label="Dismiss">\u00D7</button>
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div style={{marginBottom: '20px'}}>
          {showAnnouncementInput ? (
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <input
                style={{flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none'}}
                placeholder="Type your announcement..."
                value={newAnnouncementText}
                onChange={e => setNewAnnouncementText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') postAnnouncement(); }}
              />
              <button className="primary-btn" onClick={postAnnouncement}>Post</button>
              <button className="secondary-btn" onClick={() => { setShowAnnouncementInput(false); setNewAnnouncementText(''); }}>Cancel</button>
            </div>
          ) : (
            <button className="secondary-btn" onClick={() => setShowAnnouncementInput(true)}>+ New Announcement</button>
          )}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back to Employix HRM CRM</p>
        </div>
        <div className="admin-profile">
          <div className="avatar">{role.charAt(0)}</div>
          <div><strong>{role}</strong><p><span className="department-badge">{role}</span></p></div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">\uD83D\uDC65</div>
          <div><p>Total Employees</p><h2>{employees.length}</h2><span>Active employees</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">\uD83C\uDFE2</div>
          <div><p>Departments</p><h2>{departments.length}</h2><span>Active departments</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">\u2713</div>
          <div><p>Present Today</p><h2>{presentCount}</h2><span>Attendance records</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">\uD83D\uDCC5</div>
          <div><p>Pending Leaves</p><h2>{pendingLeavesCount}</h2><span>Requires approval</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">\uD83D\uDCCB</div>
          <div><p>Open Positions</p><h2>{openPositions}</h2><span>Active candidates</span></div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Recent Employees</h2>
          {employees.slice(0, 5).map(emp => (
            <div className="recent-item" key={emp._id}>
              <div className="employee-avatar">{emp.name.charAt(0)}</div>
              <div>
                <strong>{emp.name}</strong>
                <p>{emp.designation} \u2022 {emp.department}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Quick Overview</h2>
          <div className="overview-row"><span>Attendance Rate</span><strong>{attendanceRate}%</strong></div>
          <div className="progress"><div className="progress-fill attendance" style={{width: attendanceRate + '%'}}></div></div>
          <div className="overview-row"><span>Leave Requests</span><strong>{leaves.length}</strong></div>
          <div className="progress"><div className="progress-fill leave" style={{width: Math.min(leaves.length * 8, 100) + '%'}}></div></div>
          <div className="overview-row"><span>Recruitment Progress</span><strong>{recruitmentRate}%</strong></div>
          <div className="progress"><div className="progress-fill recruitment" style={{width: recruitmentRate + '%'}}></div></div>
        </div>
      </div>
    </div>
  );

  const renderEmployees = () => (
    <div>
      <div className="page-header">
        <div><h1>Employee Management</h1><p>Manage employee information and records</p></div>
        {canEdit && <button className="primary-btn" onClick={() => setShowEmployeeForm(true)}>+ Add Employee</button>}
      </div>

      {showEmployeeForm && canEdit && (
        <div className="form-card">
          <h2>Add New Employee</h2>
          <form onSubmit={addEmployee}>
            <div className="form-grid">
              <input placeholder="Employee Name" value={newEmployee.name}
                onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
              <input placeholder="Email Address" value={newEmployee.email}
                onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
              <select value={newEmployee.department}
                onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map(dept => <option key={dept._id} value={dept.name}>{dept.name}</option>)}
              </select>
              <input placeholder="Designation" value={newEmployee.designation}
                onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })} />
            </div>
            <div className="form-buttons">
              <button className="primary-btn" type="submit">Add Employee</button>
              <button className="secondary-btn" type="button" onClick={() => setShowEmployeeForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr><th>Employee</th><th>Email</th><th>Department</th><th>Designation</th>{canEdit && <th>Action</th>}</tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp._id}>
                <td><strong>{emp.name}</strong></td>
                <td>{emp.email}</td>
                <td><span className="department-badge">{emp.department}</span></td>
                <td>{emp.designation}</td>
                {canEdit && <td><button className="delete-btn" onClick={() => deleteEmployee(emp._id, emp.name)}>Delete</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDepartments = () => (
    <div>
      <div className="page-header">
        <div><h1>Department Management</h1><p>Manage company departments and teams</p></div>
        {canEdit && <button className="primary-btn" onClick={() => setShowDepartmentForm(true)}>+ Add Department</button>}
      </div>

      {showDepartmentForm && canEdit && (
        <div className="form-card">
          <h2>Add New Department</h2>
          <form onSubmit={addDepartment}>
            <div className="form-grid">
              <input placeholder="Department Name" value={newDepartment.name}
                onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value })} />
              <input placeholder="Description (optional)" value={newDepartment.description}
                onChange={e => setNewDepartment({ ...newDepartment, description: e.target.value })} />
            </div>
            <div className="form-buttons">
              <button className="primary-btn" type="submit">Create Department</button>
              <button className="secondary-btn" type="button" onClick={() => setShowDepartmentForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="department-grid">
        {departments.map(dept => (
          <div className="department-card" key={dept._id}>
            <div className="department-icon">\uD83C\uDFE2</div>
            <h2>{dept.name}</h2>
            <p>{dept.description || 'No description provided.'}</p>
            <span>{dept.employeeCount} Employees</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div>
      <div className="page-header">
        <div><h1>Attendance Management</h1><p>Monitor and log employee daily attendance</p></div>
        {canEdit && <button className="primary-btn" onClick={() => {
          setNewAttendance({ employeeName: '', date: new Date().toISOString().split('T')[0], checkIn: '', status: 'Present' });
          setShowAttendanceForm(true);
        }}>+ Mark Attendance</button>}
      </div>

      {showAttendanceForm && canEdit && (
        <div className="form-card">
          <h2>Mark Attendance</h2>
          <form onSubmit={markAttendance}>
            <div className="form-grid">
              <select value={newAttendance.employeeName}
                onChange={e => setNewAttendance({ ...newAttendance, employeeName: e.target.value })}>
                <option value="">Select Employee</option>
                {employees.map(emp => <option key={emp._id} value={emp.name}>{emp.name}</option>)}
              </select>
              <input type="date" value={newAttendance.date}
                onChange={e => setNewAttendance({ ...newAttendance, date: e.target.value })} />
              <input type="time" placeholder="Check-In Time (optional)" value={newAttendance.checkIn}
                onChange={e => setNewAttendance({ ...newAttendance, checkIn: e.target.value })} />
              <select value={newAttendance.status}
                onChange={e => setNewAttendance({ ...newAttendance, status: e.target.value })}>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Half-Day">Half-Day</option>
              </select>
            </div>
            <div className="form-buttons">
              <button className="primary-btn" type="submit">Save Record</button>
              <button className="secondary-btn" type="button" onClick={() => setShowAttendanceForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr><th>Employee</th><th>Date</th><th>Check In</th><th>Status</th>{canEdit && <th>Action</th>}</tr>
          </thead>
          <tbody>
            {attendance.map(record => (
              <tr key={record._id}>
                <td>{record.employeeName}</td>
                <td>{record.date}</td>
                <td>{record.checkIn || '\u2014'}</td>
                <td><span className={attendanceBadgeClass(record.status)}>{record.status}</span></td>
                {canEdit && (
                  <td>
                    <div className="att-actions">
                      {['Present','Absent','Late','Half-Day'].filter(s => s !== record.status).map(s => (
                        <button key={s} className="att-status-btn"
                          onClick={() => updateAttendanceStatus(record._id, s, record.employeeName)}>{s}</button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLeave = () => (
    <div>
      <div className="page-header">
        <div><h1>Leave Management</h1><p>Review and manage employee leave requests</p></div>
        <button className="primary-btn" onClick={() => setShowLeaveForm(true)}>+ Add Leave Request</button>
      </div>

      {showLeaveForm && (
        <div className="form-card">
          <h2>New Leave Request</h2>
          <form onSubmit={addLeave}>
            <div className="form-grid">
              <input placeholder="Employee Name" value={newLeave.name}
                onChange={e => setNewLeave({ ...newLeave, name: e.target.value })} />
              <select value={newLeave.type}
                onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </select>
              <input type="date" value={newLeave.startDate}
                onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })} />
              <input type="date" value={newLeave.endDate}
                onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })} />
            </div>
            <div className="form-buttons">
              <button className="primary-btn" type="submit">Submit Request</button>
              <button className="secondary-btn" type="button" onClick={() => setShowLeaveForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="leave-grid">
        {leaves.map(leave => (
          <div className="leave-card" key={leave._id}>
            <h3>{leave.name}</h3>
            <p>{leave.type}</p>
            <p>{leave.dates}</p>
            <span className={`status-badge ${leave.status.toLowerCase()}-badge`}>{leave.status}</span>
            {leave.status === 'Pending' && canEdit && (
              <div className="leave-actions">
                <button className="approve-btn" onClick={() => updateLeaveStatus(leave._id, 'Approved', leave.name)}>Approve</button>
                <button className="reject-btn" onClick={() => updateLeaveStatus(leave._id, 'Rejected', leave.name)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecruitment = () => (
    <div>
      <div className="page-header">
        <div><h1>Recruitment</h1><p>Track job vacancies and candidate pipeline</p></div>
        <button className="primary-btn" onClick={() => setShowCandidateForm(true)}>+ Add Candidate</button>
      </div>

      {showCandidateForm && (
        <div className="form-card">
          <h2>Add New Candidate</h2>
          <form onSubmit={addCandidate}>
            <div className="form-grid">
              <input placeholder="Candidate Name" value={newCandidate.name}
                onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })} />
              <input placeholder="Email" value={newCandidate.email}
                onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })} />
              <input placeholder="Phone" value={newCandidate.phone}
                onChange={e => setNewCandidate({ ...newCandidate, phone: e.target.value })} />
              <input placeholder="Position Applied For" value={newCandidate.position}
                onChange={e => setNewCandidate({ ...newCandidate, position: e.target.value })} />
              <select value={newCandidate.department}
                onChange={e => setNewCandidate({ ...newCandidate, department: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map(dept => <option key={dept._id} value={dept.name}>{dept.name}</option>)}
              </select>
              <input type="datetime-local" placeholder="Interview Date" value={newCandidate.interviewDate}
                onChange={e => setNewCandidate({ ...newCandidate, interviewDate: e.target.value })} />
              <select value={newCandidate.status}
                onChange={e => setNewCandidate({ ...newCandidate, status: e.target.value })}>
                <option value="Applied">Applied</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="form-buttons">
              <button className="primary-btn" type="submit">Add Candidate</button>
              <button className="secondary-btn" type="button" onClick={() => setShowCandidateForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Position</th><th>Department</th><th>Interview Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {candidates.map(c => (
              <tr key={c._id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.email}</td>
                <td>{c.position}</td>
                <td>{c.department}</td>
                <td>{c.interviewDate ? new Date(c.interviewDate).toLocaleString() : '\u2014'}</td>
                <td><span className={`status-badge ${candidateBadgeClass(c.status)}`}>{c.status}</span></td>
                <td>
                  <div className="att-actions">
                    {c.status !== 'Shortlisted' && c.status !== 'Hired' && c.status !== 'Rejected' && (
                      <button className="att-status-btn" onClick={() => updateCandidateStatus(c._id, 'Shortlisted', c.name)}>Shortlist</button>
                    )}
                    {c.status === 'Shortlisted' && (
                      <button className="att-status-btn" onClick={() => updateCandidateStatus(c._id, 'Interview Scheduled', c.name)}>Schedule</button>
                    )}
                    {(c.status === 'Interview Scheduled' || c.status === 'Shortlisted') && (
                      <button className="att-status-btn" onClick={() => updateCandidateStatus(c._id, 'Hired', c.name)}>Hire</button>
                    )}
                    {c.status !== 'Hired' && c.status !== 'Rejected' && (
                      <button className="att-status-btn" onClick={() => updateCandidateStatus(c._id, 'Rejected', c.name)}>Reject</button>
                    )}
                    <button className="delete-btn" onClick={() => deleteCandidate(c._id, c.name)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayroll = () => {
    const netPreview = (Number(newPayroll.basicSalary) || 0) + (Number(newPayroll.allowances) || 0) - (Number(newPayroll.deductions) || 0);
    return (
      <div>
        <div className="page-header">
          <div><h1>Payroll</h1><p>Manage salary structures and payslips</p></div>
          <button className="primary-btn" onClick={() => setShowPayrollForm(true)}>+ Add Payroll Record</button>
        </div>

        {showPayrollForm && (
          <div className="form-card">
            <h2>Add Payroll Record</h2>
            <form onSubmit={addPayroll}>
              <div className="form-grid">
                <select value={newPayroll.employeeId}
                  onChange={e => {
                    const emp = employees.find(em => em._id === e.target.value);
                    setNewPayroll({ ...newPayroll, employeeId: e.target.value, employeeName: emp ? emp.name : '', department: emp ? emp.department : '', designation: emp ? emp.designation : '' });
                  }}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                </select>
                <input placeholder="Month (e.g. Sep 2026)" value={newPayroll.month}
                  onChange={e => setNewPayroll({ ...newPayroll, month: e.target.value })} />
                <input type="number" placeholder="Basic Salary" value={newPayroll.basicSalary}
                  onChange={e => setNewPayroll({ ...newPayroll, basicSalary: e.target.value })} />
                <input type="number" placeholder="Allowances" value={newPayroll.allowances}
                  onChange={e => setNewPayroll({ ...newPayroll, allowances: e.target.value })} />
                <input type="number" placeholder="Deductions" value={newPayroll.deductions}
                  onChange={e => setNewPayroll({ ...newPayroll, deductions: e.target.value })} />
                <input type="date" placeholder="Pay Date" value={newPayroll.payDate}
                  onChange={e => setNewPayroll({ ...newPayroll, payDate: e.target.value })} />
              </div>
              <p style={{margin: '15px 0 5px', fontWeight: 600}}>Net Pay Preview: <span style={{color: '#16a34a'}}>\u20B9{netPreview.toLocaleString()}</span></p>
              <div className="form-buttons">
                <button className="primary-btn" type="submit">Add Record</button>
                <button className="secondary-btn" type="button" onClick={() => setShowPayrollForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-card">
          <table>
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Month</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {payroll.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.employeeName}</strong></td>
                  <td>{p.department}</td>
                  <td>{p.month}</td>
                  <td>\u20B9{(p.basicSalary || 0).toLocaleString()}</td>
                  <td>\u20B9{(p.allowances || 0).toLocaleString()}</td>
                  <td>\u20B9{(p.deductions || 0).toLocaleString()}</td>
                  <td><strong>\u20B9{(p.netPay || 0).toLocaleString()}</strong></td>
                  <td><span className={`status-badge ${p.status === 'Paid' ? 'paid-badge' : 'pending-badge'}`}>{p.status}</span></td>
                  <td>
                    <div className="att-actions">
                      {p.status === 'Pending' && <button className="approve-btn" onClick={() => markPaid(p._id, p.employeeName)}>Mark Paid</button>}
                      <button className="secondary-btn" style={{marginLeft: 0}} onClick={() => handlePrintPayslip(p)}>\uD83D\uDDA8 Payslip</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPerformance = () => (
    <div>
      <div className="page-header">
        <div><h1>Performance</h1><p>Track KPIs, ratings, and employee reviews</p></div>
        {canEdit && <button className="primary-btn" onClick={() => setShowPerformanceForm(true)}>+ Add Review</button>}
      </div>

      {showPerformanceForm && canEdit && (
        <div className="form-card">
          <h2>Add Performance Review</h2>
          <form onSubmit={addPerformance}>
            <div className="form-grid">
              <select value={newPerformance.employeeId}
                onChange={e => {
                  const emp = employees.find(em => em._id === e.target.value);
                  setNewPerformance({ ...newPerformance, employeeId: e.target.value, employeeName: emp ? emp.name : '', department: emp ? emp.department : '' });
                }}>
                <option value="">Select Employee</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
              </select>
              <input placeholder="Review Period (e.g. Q3 2026)" value={newPerformance.reviewPeriod}
                onChange={e => setNewPerformance({ ...newPerformance, reviewPeriod: e.target.value })} />
              <input placeholder="KPI Description" value={newPerformance.kpi}
                onChange={e => setNewPerformance({ ...newPerformance, kpi: e.target.value })} />
              <select value={newPerformance.rating}
                onChange={e => setNewPerformance({ ...newPerformance, rating: e.target.value })}>
                <option value="1">1 \u2605</option>
                <option value="2">2 \u2605\u2605</option>
                <option value="3">3 \u2605\u2605\u2605</option>
                <option value="4">4 \u2605\u2605\u2605\u2605</option>
                <option value="5">5 \u2605\u2605\u2605\u2605\u2605</option>
              </select>
              <input placeholder="Reviewed By" value={newPerformance.reviewedBy}
                onChange={e => setNewPerformance({ ...newPerformance, reviewedBy: e.target.value })} />
            </div>
            <textarea
              style={{width: '100%', marginTop: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical'}}
              placeholder="Review comments..."
              value={newPerformance.review}
              onChange={e => setNewPerformance({ ...newPerformance, review: e.target.value })}
            />
            <div className="form-buttons">
              <button className="primary-btn" type="submit">Add Review</button>
              <button className="secondary-btn" type="button" onClick={() => setShowPerformanceForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="department-grid">
        {performance.map(p => (
          <div className="department-card perf-card" key={p._id}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
              <strong style={{fontSize: '16px'}}>{p.employeeName}</strong>
              <span className={`status-badge ${performanceBadgeClass(p.status)}`}>{p.status}</span>
            </div>
            <p style={{color: '#64748b', fontSize: '13px', marginBottom: '4px'}}>{p.department} \u2022 {p.reviewPeriod}</p>
            <p style={{fontSize: '13px', marginBottom: '8px'}}><strong>KPI:</strong> {p.kpi}</p>
            <div style={{marginBottom: '8px'}}>{renderStars(p.rating)}</div>
            {p.review && <p style={{color: '#475569', fontSize: '13px', marginBottom: '12px', fontStyle: 'italic'}}>\u201C{p.review}\u201D</p>}
            {p.reviewedBy && <p style={{fontSize: '12px', color: '#94a3b8'}}>Reviewed by: {p.reviewedBy}</p>}
            {canEdit && (
              <div style={{marginTop: '12px'}}>
                {p.status === 'Draft' && <button className="att-status-btn" onClick={() => updatePerformanceStatus(p._id, 'Submitted', p.employeeName)}>Submit</button>}
                {p.status === 'Submitted' && <button className="att-status-btn" onClick={() => updatePerformanceStatus(p._id, 'Acknowledged', p.employeeName)}>Acknowledge</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => {
    const approvedLeaves = leaves.filter(l => l.status === 'Approved').length;
    const rejectedLeaves = leaves.filter(l => l.status === 'Rejected').length;
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
    const absentCount = attendance.filter(a => a.status === 'Absent').length;
    const lateCount = attendance.filter(a => a.status === 'Late').length;
    const halfDayCount = attendance.filter(a => a.status === 'Half-Day').length;
    const paidPayroll = payroll.filter(p => p.status === 'Paid').length;
    const pendingPayroll = payroll.filter(p => p.status === 'Pending').length;
    const totalNetPay = payroll.reduce((sum, p) => sum + (p.netPay || 0), 0);

    // Dept breakdown
    const deptBreakdown = departments.map(d => ({
      name: d.name,
      count: employees.filter(e => e.department === d.name).length,
    }));

    return (
      <div>
        <div className="page-header">
          <div><h1>Reports</h1><p>Exportable HR analytics summaries</p></div>
        </div>
        <div className="report-grid">
          <div className="report-card">
            <h3>\uD83D\uDC65 Employee Summary</h3>
            <p>Total: <strong>{employees.length}</strong></p>
            {deptBreakdown.map(d => <p key={d.name}>{d.name}: {d.count}</p>)}
            <button className="export-btn" onClick={() => exportCSV('employees.csv', ['Name','Email','Department','Designation'], employees.map(e => [e.name, e.email, e.department, e.designation]))}>Export CSV</button>
          </div>
          <div className="report-card">
            <h3>\uD83D\uDCC5 Leave Summary</h3>
            <p>Total Requests: <strong>{leaves.length}</strong></p>
            <p>Approved: <strong>{approvedLeaves}</strong></p>
            <p>Rejected: <strong>{rejectedLeaves}</strong></p>
            <p>Pending: <strong>{pendingLeaves}</strong></p>
            <button className="export-btn" onClick={() => exportCSV('leaves.csv', ['Name','Type','Dates','Status'], leaves.map(l => [l.name, l.type, l.dates, l.status]))}>Export CSV</button>
          </div>
          <div className="report-card">
            <h3>\uD83D\uDD52 Attendance Summary</h3>
            <p>Total Records: <strong>{attendance.length}</strong></p>
            <p>Present: <strong>{presentCount}</strong></p>
            <p>Absent: <strong>{absentCount}</strong></p>
            <p>Late: <strong>{lateCount}</strong></p>
            <p>Half-Day: <strong>{halfDayCount}</strong></p>
            <button className="export-btn" onClick={() => exportCSV('attendance.csv', ['Employee','Date','Check In','Status'], attendance.map(a => [a.employeeName, a.date, a.checkIn, a.status]))}>Export CSV</button>
          </div>
          <div className="report-card">
            <h3>\uD83D\uDCB0 Payroll Summary</h3>
            <p>Total Records: <strong>{payroll.length}</strong></p>
            <p>Paid: <strong>{paidPayroll}</strong></p>
            <p>Pending: <strong>{pendingPayroll}</strong></p>
            <p>Total Net Pay: <strong>\u20B9{totalNetPay.toLocaleString()}</strong></p>
            <button className="export-btn" onClick={() => exportCSV('payroll.csv', ['Employee','Department','Month','Basic Salary','Allowances','Deductions','Net Pay','Status'], payroll.map(p => [p.employeeName, p.department, p.month, p.basicSalary, p.allowances, p.deductions, p.netPay, p.status]))}>Export CSV</button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activePage === 'Dashboard') return renderDashboard();
    if (activePage === 'Employees') return renderEmployees();
    if (activePage === 'Departments') return renderDepartments();
    if (activePage === 'Attendance') return renderAttendance();
    if (activePage === 'Leave Management') return renderLeave();
    if (activePage === 'Recruitment') return renderRecruitment();
    if (activePage === 'Payroll') return renderPayroll();
    if (activePage === 'Performance') return renderPerformance();
    if (activePage === 'Reports') return renderReports();
    return renderDashboard();
  };

  return (
    <div className="app">
      {/* Toast container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">\u00D7</button>
          </div>
        ))}
      </div>

      {/* Payslip hidden print div */}
      {printPayslip && (
        <div id="payslip-print">
          <div className="payslip">
            <h1>Employix</h1>
            <h2>Payslip</h2>
            <hr />
            <p><strong>Employee:</strong> {printPayslip.employeeName}</p>
            <p><strong>Designation:</strong> {printPayslip.designation}</p>
            <p><strong>Department:</strong> {printPayslip.department}</p>
            <p><strong>Month:</strong> {printPayslip.month}</p>
            <p><strong>Pay Date:</strong> {printPayslip.payDate ? formatDate(printPayslip.payDate) : '\u2014'}</p>
            <hr />
            <p><strong>Basic Salary:</strong> \u20B9{(printPayslip.basicSalary || 0).toLocaleString()}</p>
            <p><strong>Allowances:</strong> \u20B9{(printPayslip.allowances || 0).toLocaleString()}</p>
            <p><strong>Deductions:</strong> \u20B9{(printPayslip.deductions || 0).toLocaleString()}</p>
            <hr />
            <p style={{fontSize: '20px'}}><strong>Net Pay: \u20B9{(printPayslip.netPay || 0).toLocaleString()}</strong></p>
          </div>
        </div>
      )}

      {/* Top header */}
      <header className="top-header">
        <strong>\uD83C\uDFE2 Employix HRM</strong>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <label htmlFor="role-select" style={{fontSize: '14px', color: '#475569'}}>Role:</label>
          <select id="role-select" className="role-select" value={role} onChange={e => setRole(e.target.value)}>
            <option value="Admin">Admin</option>
            <option value="HR Manager">HR Manager</option>
            <option value="Employee">Employee</option>
            <option value="Recruiter">Recruiter</option>
          </select>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">E</div>
            <div><h2>EMPLOYIX</h2><p>HRM CRM SYSTEM</p></div>
          </div>

          <div className="menu">
            {visibleNavItems.map(item => (
              <button key={item.label} className={`menu-item ${activePage === item.label ? 'active' : ''}`}
                onClick={() => setActivePage(item.label)}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <p>Employix HRM CRM</p>
            <span>Version 2.0</span>
          </div>
        </aside>

        <main className="main-content">{renderContent()}</main>
      </div>
    </div>
  );
}

export default App;
