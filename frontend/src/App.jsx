import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext.jsx';
import Login    from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function App() {
  // ── Auth ────────────────────────────────────────────────────────
  const { user, logout, authFetch } = useAuth();

  // Show login/register when not authenticated
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (!user) {
    return authView === 'login'
      ? <Login    onSwitchToRegister={() => setAuthView('register')} />
      : <Register onSwitchToLogin={()    => setAuthView('login')}    />;
  }

  // Derive role from JWT user object
  const role       = user.role;
  const canEdit    = role === 'Admin' || role === 'HR Manager' || role === 'Department Manager';
  const canRecruit = role === 'Admin' || role === 'Recruiter';
  const isDeptMgr  = role === 'Department Manager';
  const isEmployee = role === 'Employee';

  return <AppShell role={role} canEdit={canEdit} canRecruit={canRecruit} isDeptMgr={isDeptMgr} isEmployee={isEmployee} authFetch={authFetch} logout={logout} user={user} />;
}

// ── AppShell ─────────────────────────────────────────────────────
// Separated so hooks run unconditionally (Rules of Hooks satisfied).
function AppShell({ role, canEdit, canRecruit, isDeptMgr, isEmployee, authFetch, logout, user }) {
  const [activePage, setActivePage] = useState('Dashboard');
  const [loading,    setLoading]    = useState(true);

  // Core data state
  const [employees,   setEmployees]   = useState([]);
  const [leaves,      setLeaves]      = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [candidates,  setCandidates]  = useState([]);
  const [payroll,     setPayroll]     = useState([]);
  const [performance, setPerformance] = useState([]);

  // Toast
  const [toasts, setToasts] = useState([]);

  // Announcements (frontend-only, no persistence)
  const [announcements,       setAnnouncements]       = useState([]);
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);
  const [newAnnouncementText,   setNewAnnouncementText]   = useState('');

  // Form visibility / state
  const [showEmployeeForm,    setShowEmployeeForm]    = useState(false);
  const [newEmployee,         setNewEmployee]         = useState({ name: '', email: '', department: '', designation: '' });

  const [showLeaveForm,       setShowLeaveForm]       = useState(false);
  const [newLeave,            setNewLeave]            = useState({ name: '', type: 'Sick Leave', startDate: '', endDate: '' });

  const [showDepartmentForm,  setShowDepartmentForm]  = useState(false);
  const [newDepartment,       setNewDepartment]       = useState({ name: '', description: '' });

  const [showAttendanceForm,  setShowAttendanceForm]  = useState(false);
  const [newAttendance,       setNewAttendance]       = useState({ employeeName: '', date: '', checkIn: '', status: 'Present' });

  const [showCandidateForm,   setShowCandidateForm]   = useState(false);
  const [newCandidate,        setNewCandidate]        = useState({ name: '', email: '', phone: '', position: '', department: '', interviewDate: '', status: 'Applied' });

  const [showPayrollForm,     setShowPayrollForm]     = useState(false);
  const [newPayroll,          setNewPayroll]          = useState({ employeeId: '', employeeName: '', department: '', designation: '', basicSalary: '', allowances: '0', deductions: '0', month: '', payDate: '' });

  const [showPerformanceForm, setShowPerformanceForm] = useState(false);
  const [newPerformance,      setNewPerformance]      = useState({ employeeId: '', employeeName: '', department: '', reviewPeriod: '', kpi: '', rating: '3', review: '', reviewedBy: '' });

  const [printPayslip, setPrintPayslip] = useState(null);

  const [myProfile,        setMyProfile]        = useState(null);
  const [profileForm,      setProfileForm]      = useState({});
  const [showProfileEdit,  setShowProfileEdit]  = useState(false);

  // ── Toast helpers ──────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Authenticated fetch helpers ────────────────────────────────
  // Returns a parsed array, or [] on any error/non-OK response.
  const safeFetchArray = useCallback(async (url) => {
    try {
      const res = await authFetch(url);
      if (!res.ok) {
        if (res.status === 401) { logout(); return []; }
        console.error(`API error ${res.status} for ${url}`);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`Network error for ${url}:`, err);
      return [];
    }
  }, [authFetch, logout]);

  // ── Initial data load ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
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

      // Fetch employee's own profile if role is Employee
      if (role === 'Employee') {
        try {
          const profileRes = await authFetch('/api/employees/me');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setMyProfile(profileData);
            setProfileForm(profileData);
          }
        } catch (err) {
          console.error('Failed to fetch employee profile:', err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [safeFetchArray]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived counts ─────────────────────────────────────────────
  const presentCount      = attendance.filter(a => a.status === 'Present').length;
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const attendanceRate    = Math.round((presentCount / Math.max(attendance.length, 1)) * 100);
  const recruitmentRate   = Math.round((candidates.filter(c => c.status === 'Hired').length / Math.max(candidates.length, 1)) * 100);
  const openPositions     = candidates.filter(c => c.status !== 'Hired' && c.status !== 'Rejected').length;

  // ── Date helpers ───────────────────────────────────────────────
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

  const nowTimestamp = () => `${todayString} ${nowTime()}`;

  // ── CSV export ─────────────────────────────────────────────────
  const exportCSV = (filename, headers, rows) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  };

  // ── Employee handlers ──────────────────────────────────────────
  const addEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.department || !newEmployee.designation) {
      showToast('Please fill all fields.', 'error'); return;
    }
    try {
      const res = await authFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify(newEmployee),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewEmployee({ name: '', email: '', department: '', designation: '' });
      setShowEmployeeForm(false);
      setEmployees(await safeFetchArray('/api/employees'));
      showToast(`Employee "${newEmployee.name}" added successfully.`);
    } catch (err) { showToast(err.message || 'Failed to add employee.', 'error'); }
  };

  const deleteEmployee = async (id, name) => {
    try {
      await authFetch(`/api/employees/${id}`, { method: 'DELETE' });
      const [empData, leaveData, attData] = await Promise.all([
        safeFetchArray('/api/employees'),
        safeFetchArray('/api/leaves'),
        safeFetchArray('/api/attendance'),
      ]);
      setEmployees(empData); setLeaves(leaveData); setAttendance(attData);
      showToast(`Employee "${name}" and their records removed.`);
    } catch (err) { showToast('Failed to delete employee.', 'error'); }
  };

  // ── Leave handlers ─────────────────────────────────────────────
  const addLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.name || !newLeave.type || !newLeave.startDate || !newLeave.endDate) {
      showToast('Please fill all fields.', 'error'); return;
    }
    const dates = `${formatDate(newLeave.startDate)} - ${formatDate(newLeave.endDate)}`;
    try {
      const res = await authFetch('/api/leaves', {
        method: 'POST',
        body: JSON.stringify({ name: newLeave.name, type: newLeave.type, dates, status: 'Pending' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewLeave({ name: '', type: 'Sick Leave', startDate: '', endDate: '' });
      setShowLeaveForm(false);
      setLeaves(await safeFetchArray('/api/leaves'));
      showToast('Leave request submitted successfully.');
    } catch (err) { showToast(err.message || 'Failed to submit leave request.', 'error'); }
  };

  const updateLeaveStatus = async (id, newStatus, employeeName) => {
    try {
      const res = await authFetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setLeaves(await safeFetchArray('/api/leaves'));
      showToast(`Leave for ${employeeName} ${newStatus.toLowerCase()}.`, newStatus === 'Approved' ? 'success' : 'warning');
    } catch (err) { showToast('Failed to update leave status.', 'error'); }
  };

  // ── Department handlers ────────────────────────────────────────
  const addDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.name) { showToast('Department name is required.', 'error'); return; }
    try {
      const res = await authFetch('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ ...newDepartment, employeeCount: 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewDepartment({ name: '', description: '' });
      setShowDepartmentForm(false);
      setDepartments(await safeFetchArray('/api/departments'));
      showToast(`Department "${newDepartment.name}" created successfully.`);
    } catch (err) { showToast(err.message || 'Failed to create department.', 'error'); }
  };

  // ── Attendance handlers ────────────────────────────────────────
  const markAttendance = async (e) => {
    e.preventDefault();
    if (!newAttendance.employeeName || !newAttendance.date) {
      showToast('Employee name and date are required.', 'error'); return;
    }
    const matched = employees.find(emp => emp.name.toLowerCase() === newAttendance.employeeName.toLowerCase());
    if (!matched) { showToast('No employee found with that name.', 'error'); return; }
    const payload = {
      employeeId:   matched._id,
      employeeName: matched.name,
      date:         formatDate(newAttendance.date),
      checkIn:      newAttendance.checkIn || nowTime(),
      status:       newAttendance.status,
    };
    try {
      const res = await authFetch('/api/attendance', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewAttendance({ employeeName: '', date: '', checkIn: '', status: 'Present' });
      setShowAttendanceForm(false);
      setAttendance(await safeFetchArray('/api/attendance'));
      showToast(`Attendance marked for ${matched.name} — ${payload.status}.`);
    } catch (err) { showToast(err.message || 'Failed to mark attendance.', 'error'); }
  };

  const updateAttendanceStatus = async (id, newStatus, employeeName) => {
    try {
      const res = await authFetch(`/api/attendance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAttendance(await safeFetchArray('/api/attendance'));
      showToast(`${employeeName} marked as ${newStatus}.`);
    } catch (err) { showToast('Failed to update attendance.', 'error'); }
  };

  // ── Candidate handlers ─────────────────────────────────────────
  const addCandidate = async (e) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.email || !newCandidate.position || !newCandidate.department) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    try {
      const res = await authFetch('/api/candidates', { method: 'POST', body: JSON.stringify(newCandidate) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewCandidate({ name: '', email: '', phone: '', position: '', department: '', interviewDate: '', status: 'Applied' });
      setShowCandidateForm(false);
      setCandidates(await safeFetchArray('/api/candidates'));
      showToast(`Candidate "${newCandidate.name}" added.`);
    } catch (err) { showToast(err.message || 'Failed to add candidate.', 'error'); }
  };

  const updateCandidateStatus = async (id, newStatus, name) => {
    try {
      const res = await authFetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCandidates(await safeFetchArray('/api/candidates'));
      showToast(`${name} status updated to ${newStatus}.`);
    } catch (err) { showToast('Failed to update candidate.', 'error'); }
  };

  const deleteCandidate = async (id, name) => {
    try {
      await authFetch(`/api/candidates/${id}`, { method: 'DELETE' });
      setCandidates(await safeFetchArray('/api/candidates'));
      showToast(`Candidate "${name}" removed.`);
    } catch (err) { showToast('Failed to delete candidate.', 'error'); }
  };

  // ── Payroll handlers ───────────────────────────────────────────
  const addPayroll = async (e) => {
    e.preventDefault();
    if (!newPayroll.employeeId || !newPayroll.basicSalary || !newPayroll.month) {
      showToast('Employee, basic salary, and month are required.', 'error'); return;
    }
    try {
      const res = await authFetch('/api/payroll', { method: 'POST', body: JSON.stringify(newPayroll) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewPayroll({ employeeId: '', employeeName: '', department: '', designation: '', basicSalary: '', allowances: '0', deductions: '0', month: '', payDate: '' });
      setShowPayrollForm(false);
      setPayroll(await safeFetchArray('/api/payroll'));
      showToast('Payroll record added.');
    } catch (err) { showToast(err.message || 'Failed to add payroll record.', 'error'); }
  };

  const markPaid = async (id, employeeName) => {
    try {
      const res = await authFetch(`/api/payroll/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Paid' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPayroll(await safeFetchArray('/api/payroll'));
      showToast(`Payroll for ${employeeName} marked as Paid.`);
    } catch (err) { showToast('Failed to mark as paid.', 'error'); }
  };

  // ── Performance handlers ───────────────────────────────────────
  const addPerformance = async (e) => {
    e.preventDefault();
    if (!newPerformance.employeeId || !newPerformance.reviewPeriod || !newPerformance.kpi || !newPerformance.rating) {
      showToast('Employee, review period, KPI, and rating are required.', 'error'); return;
    }
    try {
      const res = await authFetch('/api/performance', {
        method: 'POST',
        body: JSON.stringify({ ...newPerformance, rating: Number(newPerformance.rating) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewPerformance({ employeeId: '', employeeName: '', department: '', reviewPeriod: '', kpi: '', rating: '3', review: '', reviewedBy: '' });
      setShowPerformanceForm(false);
      setPerformance(await safeFetchArray('/api/performance'));
      showToast('Performance review added.');
    } catch (err) { showToast(err.message || 'Failed to add performance review.', 'error'); }
  };

  const updatePerformanceStatus = async (id, newStatus, name) => {
    try {
      const res = await authFetch(`/api/performance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPerformance(await safeFetchArray('/api/performance'));
      showToast(`${name} review status updated to ${newStatus}.`);
    } catch (err) { showToast('Failed to update performance status.', 'error'); }
  };

  // ── Announcement handlers ──────────────────────────────────────
  const postAnnouncement = () => {
    if (!newAnnouncementText.trim()) return;
    const item = { id: Date.now(), text: newAnnouncementText.trim(), timestamp: nowTimestamp() };
    setAnnouncements(prev => [item, ...prev].slice(0, 3));
    setNewAnnouncementText('');
    setShowAnnouncementInput(false);
    showToast('Announcement posted.');
  };
  const dismissAnnouncement = (id) => setAnnouncements(prev => prev.filter(a => a.id !== id));

  // ── Payslip print ──────────────────────────────────────────────
  const handlePrintPayslip = (record) => {
    setPrintPayslip(record);
    setTimeout(() => { window.print(); setPrintPayslip(null); }, 150);
  };

  // ── Badge helpers ──────────────────────────────────────────────
  const attendanceBadgeClass = (s) =>
    s === 'Present' ? 'present-badge' : s === 'Late' ? 'late-badge' : s === 'Half-Day' ? 'halfday-badge' : 'absent-badge';

  const candidateBadgeClass = (s) =>
    s === 'Applied' ? 'applied-badge' : s === 'Shortlisted' ? 'shortlisted-badge' :
    s === 'Interview Scheduled' ? 'interview-badge' : s === 'Hired' ? 'hired-badge' : 'rejected-badge';

  const performanceBadgeClass = (s) =>
    s === 'Submitted' ? 'shortlisted-badge' : s === 'Acknowledged' ? 'approved-badge' : 'pending-badge';

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'star-filled' : 'star-empty'}>{i < rating ? '★' : '☆'}</span>
    ));

  // ── Loading screen ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app">
        <header className="top-header">
          <strong>🏢 Employix HRM</strong>
        </header>
        <div className="app-body">
          <aside className="sidebar">
            <div className="logo">
              <div className="logo-icon">E</div>
              <div><h2>EMPLOYIX</h2><p>HRM CRM SYSTEM</p></div>
            </div>
          </aside>
          <main className="main-content"><p>Loading...</p></main>
        </div>
      </div>
    );
  }

  // ── Sidebar nav items filtered by role ────────────────────────
  // ── Sidebar nav items — role-specific ──────────────────────────
  const navByRole = {
    'Admin':              [
      { label: 'Dashboard',        icon: '📊' },
      { label: 'Employees',        icon: '👥' },
      { label: 'Departments',      icon: '🏢' },
      { label: 'Attendance',       icon: '🕒' },
      { label: 'Leave Management', icon: '📅' },
      { label: 'Recruitment',      icon: '📋' },
      { label: 'Payroll',          icon: '💰' },
      { label: 'Performance',      icon: '⭐' },
      { label: 'Reports',          icon: '📈' },
    ],
    'HR Manager':         [
      { label: 'Dashboard',        icon: '📊' },
      { label: 'Employees',        icon: '👥' },
      { label: 'Departments',      icon: '🏢' },
      { label: 'Attendance',       icon: '🕒' },
      { label: 'Leave Management', icon: '📅' },
      { label: 'Payroll',          icon: '💰' },
      { label: 'Performance',      icon: '⭐' },
      { label: 'Reports',          icon: '📈' },
    ],
    'Department Manager': [
      { label: 'Dashboard',        icon: '📊' },
      { label: 'Team Management',  icon: '👥' },
      { label: 'Attendance',       icon: '🕒' },
      { label: 'Leave Management', icon: '📅' },
      { label: 'Performance',      icon: '⭐' },
    ],
    'Recruiter':          [
      { label: 'Dashboard',        icon: '📊' },
      { label: 'Recruitment',      icon: '📋' },
    ],
    'Employee':           [
      { label: 'Dashboard',        icon: '📊' },
      { label: 'My Profile',       icon: '👤' },
      { label: 'Attendance',       icon: '🕒' },
      { label: 'Leave Management', icon: '📅' },
      { label: 'Payroll',          icon: '💰' },
    ],
  };
  const visibleNavItems = navByRole[role] || navByRole['Employee'];


  // ── Page renderers ─────────────────────────────────────────────
  const renderDashboard = () => (
    <div>
      {announcements.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {announcements.map(ann => (
            <div key={ann.id} className="announcement-banner">
              <div>
                <strong>📢 Announcement</strong>
                <p>{ann.text}</p>
                <small>{ann.timestamp}</small>
              </div>
              <button className="toast-close" onClick={() => dismissAnnouncement(ann.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div style={{ marginBottom: '20px' }}>
          {showAnnouncementInput ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
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
          <div className="avatar">{user.email.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{user.email}</strong>
            <p><span className="department-badge">{role}</span></p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div><p>Total Employees</p><h2>{employees.length}</h2><span>Active employees</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div><p>Departments</p><h2>{departments.length}</h2><span>Active departments</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div><p>Present Today</p><h2>{presentCount}</h2><span>Attendance records</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div><p>Pending Leaves</p><h2>{pendingLeavesCount}</h2><span>Requires approval</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
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
                <p>{emp.designation} • {emp.department}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Quick Overview</h2>
          <div className="overview-row"><span>Attendance Rate</span><strong>{attendanceRate}%</strong></div>
          <div className="progress"><div className="progress-fill attendance" style={{ width: attendanceRate + '%' }}></div></div>
          <div className="overview-row"><span>Leave Requests</span><strong>{leaves.length}</strong></div>
          <div className="progress"><div className="progress-fill leave" style={{ width: Math.min(leaves.length * 8, 100) + '%' }}></div></div>
          <div className="overview-row"><span>Recruitment Progress</span><strong>{recruitmentRate}%</strong></div>
          <div className="progress"><div className="progress-fill recruitment" style={{ width: recruitmentRate + '%' }}></div></div>
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
              <input placeholder="Employee Name" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
              <input placeholder="Email Address" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
              <select value={newEmployee.department} onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map(dept => <option key={dept._id} value={dept.name}>{dept.name}</option>)}
              </select>
              <input placeholder="Designation" value={newEmployee.designation} onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })} />
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
          <thead><tr><th>Employee</th><th>Email</th><th>Department</th><th>Designation</th>{canEdit && <th>Action</th>}</tr></thead>
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
              <input placeholder="Department Name" value={newDepartment.name} onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value })} />
              <input placeholder="Description (optional)" value={newDepartment.description} onChange={e => setNewDepartment({ ...newDepartment, description: e.target.value })} />
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
            <div className="department-icon">🏢</div>
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
        {canEdit && (
          <button className="primary-btn" onClick={() => {
            setNewAttendance({ employeeName: '', date: new Date().toISOString().split('T')[0], checkIn: '', status: 'Present' });
            setShowAttendanceForm(true);
          }}>+ Mark Attendance</button>
        )}
      </div>
      {showAttendanceForm && canEdit && (
        <div className="form-card">
          <h2>Mark Attendance</h2>
          <form onSubmit={markAttendance}>
            <div className="form-grid">
              <select value={newAttendance.employeeName} onChange={e => setNewAttendance({ ...newAttendance, employeeName: e.target.value })}>
                <option value="">Select Employee</option>
                {employees.map(emp => <option key={emp._id} value={emp.name}>{emp.name}</option>)}
              </select>
              <input type="date" value={newAttendance.date} onChange={e => setNewAttendance({ ...newAttendance, date: e.target.value })} />
              <input type="time" placeholder="Check-In Time (optional)" value={newAttendance.checkIn} onChange={e => setNewAttendance({ ...newAttendance, checkIn: e.target.value })} />
              <select value={newAttendance.status} onChange={e => setNewAttendance({ ...newAttendance, status: e.target.value })}>
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
          <thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Status</th>{canEdit && <th>Action</th>}</tr></thead>
          <tbody>
            {attendance.map(record => (
              <tr key={record._id}>
                <td>{record.employeeName}</td>
                <td>{record.date}</td>
                <td>{record.checkIn || '—'}</td>
                <td><span className={attendanceBadgeClass(record.status)}>{record.status}</span></td>
                {canEdit && (
                  <td>
                    <div className="att-actions">
                      {['Present','Absent','Late','Half-Day'].filter(s => s !== record.status).map(s => (
                        <button key={s} className="att-status-btn" onClick={() => updateAttendanceStatus(record._id, s, record.employeeName)}>{s}</button>
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

  const renderLeave = () => {
    // Compute leave stats from already-filtered leaves array (Employee sees only own leaves)
    const myLeaveStats = {
      totalLeaves:   leaves[0]?.totalLeaves  ?? 24,
      leavesTaken:   leaves.reduce((s, l) => s + (l.leavesTaken  || 0), 0),
      pendingLeaves: leaves.filter(l => l.status === 'Pending').length,
      leaveBalance:  (leaves[0]?.totalLeaves ?? 24) - leaves.reduce((s, l) => s + (l.leavesTaken || 0), 0),
    };

    return (
      <div>
        <div className="page-header">
          <div><h1>Leave Management</h1><p>Review and manage employee leave requests</p></div>
          <button className="primary-btn" onClick={() => setShowLeaveForm(true)}>
            {isEmployee ? 'Apply for Leave' : '+ Add Leave Request'}
          </button>
        </div>

        {/* Employee leave metric cards */}
        {isEmployee && (
          <div className="leave-metrics-grid">
            <div className="leave-metric-card">
              <div className="leave-metric-icon">📋</div>
              <div>
                <p>Total Leaves</p>
                <h2>{myLeaveStats.totalLeaves}</h2>
                <span>Annual allocation</span>
              </div>
            </div>
            <div className="leave-metric-card">
              <div className="leave-metric-icon">✓</div>
              <div>
                <p>Leaves Taken</p>
                <h2>{myLeaveStats.leavesTaken}</h2>
                <span>Used this year</span>
              </div>
            </div>
            <div className="leave-metric-card">
              <div className="leave-metric-icon">⏳</div>
              <div>
                <p>Pending</p>
                <h2>{myLeaveStats.pendingLeaves}</h2>
                <span>Awaiting approval</span>
              </div>
            </div>
            <div className="leave-metric-card balance-card">
              <div className="leave-metric-icon">💚</div>
              <div>
                <p>Leave Balance</p>
                <h2>{myLeaveStats.leaveBalance}</h2>
                <span>Days remaining</span>
              </div>
            </div>
          </div>
        )}

        {showLeaveForm && (
          <div className="form-card">
            <h2>New Leave Request</h2>
            <form onSubmit={addLeave}>
              <div className="form-grid">
                <input placeholder="Employee Name" value={newLeave.name} onChange={e => setNewLeave({ ...newLeave, name: e.target.value })} />
                <select value={newLeave.type} onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
                <input type="date" value={newLeave.startDate} onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                <input type="date" value={newLeave.endDate} onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })} />
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
                  <button className="reject-btn"  onClick={() => updateLeaveStatus(leave._id, 'Rejected', leave.name)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMyProfile = () => {
    const handleProfileUpdate = async (e) => {
      e.preventDefault();
      if (!myProfile?._id) return;
      try {
        const res = await authFetch(`/api/employees/${myProfile._id}`, {
          method: 'PATCH',
          body: JSON.stringify(profileForm),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const updated = await res.json();
        setMyProfile(updated);
        setProfileForm(updated);
        setShowProfileEdit(false);
        showToast('Profile updated successfully.');
      } catch (err) {
        showToast(err.message || 'Failed to update profile.', 'error');
      }
    };

    return (
      <div>
        <div className="page-header">
          <div><h1>My Profile</h1><p>View and update your personal information</p></div>
          {!showProfileEdit && (
            <button className="primary-btn" onClick={() => setShowProfileEdit(true)}>Edit Profile</button>
          )}
        </div>

        {myProfile ? (
          <>
            {!showProfileEdit && (
              <div className="profile-card">
                <div className="profile-avatar-lg">{myProfile.name.charAt(0)}</div>
                <div className="profile-details">
                  <h2>{myProfile.name}</h2>
                  <p className="profile-role-tag">{myProfile.designation} &middot; {myProfile.department}</p>
                  <div className="profile-info-grid">
                    <div className="profile-info-item"><span>Email</span><strong>{myProfile.email}</strong></div>
                    <div className="profile-info-item"><span>Phone</span><strong>{myProfile.phone || '—'}</strong></div>
                    <div className="profile-info-item"><span>Address</span><strong>{myProfile.address || '—'}</strong></div>
                    <div className="profile-info-item"><span>Emergency Contact</span><strong>{myProfile.emergencyContact || '—'}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {showProfileEdit && (
              <div className="form-card">
                <h2>Edit Profile</h2>
                <form onSubmit={handleProfileUpdate}>
                  <div className="form-grid">
                    <input placeholder="Full Name"        value={profileForm.name  || ''} onChange={e => setProfileForm({ ...profileForm, name:  e.target.value })} />
                    <input placeholder="Email"            value={profileForm.email || ''} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                    <input placeholder="Phone Number"     value={profileForm.phone || ''} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                    <input placeholder="Emergency Contact (Name & Phone)" value={profileForm.emergencyContact || ''} onChange={e => setProfileForm({ ...profileForm, emergencyContact: e.target.value })} />
                    <input placeholder="Address" style={{gridColumn: '1 / -1'}} value={profileForm.address || ''} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
                  </div>
                  <div className="form-buttons">
                    <button className="primary-btn" type="submit">Save Changes</button>
                    <button className="secondary-btn" type="button" onClick={() => setShowProfileEdit(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="form-card"><p>No employee record linked to your account. Please contact HR.</p></div>
        )}
      </div>
    );
  };

  const renderTeamManagement = () => {
    const pendingLeavesForTeam = leaves.filter(l => l.status === 'Pending');
    return (
      <div>
        <div className="page-header">
          <div><h1>Team Management</h1><p>Manage your team&apos;s attendance, performance, and leaves</p></div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div><p>Team Size</p><h2>{employees.length}</h2><span>Total employees</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div><p>Present Today</p><h2>{presentCount}</h2><span>Attendance records</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div><p>Pending Leave Requests</p><h2>{pendingLeavesForTeam.length}</h2><span>Awaiting action</span></div>
          </div>
        </div>

        <div className="table-card" style={{marginBottom: '24px'}}>
          <h2 style={{padding: '16px 20px', margin: 0, fontSize: '16px', borderBottom: '1px solid #f1f5f9'}}>Team Members</h2>
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Actions</th></tr></thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp._id}>
                  <td><strong>{emp.name}</strong></td>
                  <td><span className="department-badge">{emp.department}</span></td>
                  <td>{emp.designation}</td>
                  <td>
                    <div className="att-actions">
                      <button className="att-status-btn" onClick={() => setActivePage('Performance')}>View Performance</button>
                      <button className="att-status-btn" onClick={() => setActivePage('Attendance')}>Verify Attendance</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="team-panels">
          <div className="team-panel">
            <h2>Pending Leave Requests</h2>
            {pendingLeavesForTeam.length === 0 ? (
              <p style={{color: '#94a3b8', fontSize: '14px'}}>No pending leave requests.</p>
            ) : (
              pendingLeavesForTeam.map(leave => (
                <div key={leave._id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9'}}>
                  <div>
                    <strong style={{fontSize: '14px'}}>{leave.name}</strong>
                    <p style={{fontSize: '12px', color: '#64748b', margin: '2px 0 0'}}>{leave.type} &bull; {leave.dates}</p>
                  </div>
                  <div className="att-actions">
                    <button className="approve-btn" onClick={() => updateLeaveStatus(leave._id, 'Approved', leave.name)}>Approve</button>
                    <button className="reject-btn"  onClick={() => updateLeaveStatus(leave._id, 'Rejected', leave.name)}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="team-panel">
            <h2>Performance Overview</h2>
            {performance.length === 0 ? (
              <p style={{color: '#94a3b8', fontSize: '14px'}}>No performance reviews yet.</p>
            ) : (
              performance.slice(0, 5).map(p => (
                <div key={p._id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9'}}>
                  <div>
                    <strong style={{fontSize: '14px'}}>{p.employeeName}</strong>
                    <p style={{fontSize: '12px', color: '#64748b', margin: '2px 0 0'}}>{p.reviewPeriod} &bull; {p.kpi}</p>
                  </div>
                  <div>{renderStars(p.rating)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRecruitment = () => {
    const pipelineCounts = {
      Applied:              candidates.filter(c => c.status === 'Applied').length,
      Shortlisted:          candidates.filter(c => c.status === 'Shortlisted').length,
      'Interview Scheduled': candidates.filter(c => c.status === 'Interview Scheduled').length,
      Hired:                candidates.filter(c => c.status === 'Hired').length,
      Rejected:             candidates.filter(c => c.status === 'Rejected').length,
    };

    return (
      <div>
        <div className="page-header">
          <div><h1>Recruitment</h1><p>Track job vacancies and candidate pipeline</p></div>
          <button className="primary-btn" onClick={() => setShowCandidateForm(true)}>+ Add Candidate</button>
        </div>

        {canRecruit && (
          <div className="pipeline-grid">
            <div className="pipeline-tile applied">
              <h3>{pipelineCounts.Applied}</h3>
              <p>Applied</p>
            </div>
            <div className="pipeline-tile shortlisted">
              <h3>{pipelineCounts.Shortlisted}</h3>
              <p>Shortlisted</p>
            </div>
            <div className="pipeline-tile interview">
              <h3>{pipelineCounts['Interview Scheduled']}</h3>
              <p>Interview Scheduled</p>
            </div>
            <div className="pipeline-tile hired">
              <h3>{pipelineCounts.Hired}</h3>
              <p>Hired</p>
            </div>
            <div className="pipeline-tile rejected">
              <h3>{pipelineCounts.Rejected}</h3>
              <p>Rejected</p>
            </div>
          </div>
        )}

        {showCandidateForm && (
          <div className="form-card">
            <h2>Add New Candidate</h2>
            <form onSubmit={addCandidate}>
              <div className="form-grid">
                <input placeholder="Candidate Name" value={newCandidate.name} onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })} />
                <input placeholder="Email" value={newCandidate.email} onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })} />
                <input placeholder="Phone" value={newCandidate.phone} onChange={e => setNewCandidate({ ...newCandidate, phone: e.target.value })} />
                <input placeholder="Position Applied For" value={newCandidate.position} onChange={e => setNewCandidate({ ...newCandidate, position: e.target.value })} />
                <select value={newCandidate.department} onChange={e => setNewCandidate({ ...newCandidate, department: e.target.value })}>
                  <option value="">Select Department</option>
                  {departments.map(dept => <option key={dept._id} value={dept.name}>{dept.name}</option>)}
                </select>
                <input type="datetime-local" value={newCandidate.interviewDate} onChange={e => setNewCandidate({ ...newCandidate, interviewDate: e.target.value })} />
                <select value={newCandidate.status} onChange={e => setNewCandidate({ ...newCandidate, status: e.target.value })}>
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
            <thead><tr><th>Name</th><th>Email</th><th>Position</th><th>Department</th><th>Interview Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c._id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.position}</td>
                  <td>{c.department}</td>
                  <td>{c.interviewDate ? new Date(c.interviewDate).toLocaleString() : '—'}</td>
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
  };

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
                <select value={newPayroll.employeeId} onChange={e => {
                  const emp = employees.find(em => em._id === e.target.value);
                  setNewPayroll({ ...newPayroll, employeeId: e.target.value, employeeName: emp?.name || '', department: emp?.department || '', designation: emp?.designation || '' });
                }}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                </select>
                <input placeholder="Month (e.g. Sep 2026)" value={newPayroll.month} onChange={e => setNewPayroll({ ...newPayroll, month: e.target.value })} />
                <input type="number" placeholder="Basic Salary"  value={newPayroll.basicSalary}  onChange={e => setNewPayroll({ ...newPayroll, basicSalary:  e.target.value })} />
                <input type="number" placeholder="Allowances"    value={newPayroll.allowances}    onChange={e => setNewPayroll({ ...newPayroll, allowances:    e.target.value })} />
                <input type="number" placeholder="Deductions"    value={newPayroll.deductions}    onChange={e => setNewPayroll({ ...newPayroll, deductions:    e.target.value })} />
                <input type="date"   placeholder="Pay Date"      value={newPayroll.payDate}       onChange={e => setNewPayroll({ ...newPayroll, payDate:       e.target.value })} />
              </div>
              <p style={{ margin: '15px 0 5px', fontWeight: 600 }}>Net Pay Preview: <span style={{ color: '#16a34a' }}>₹{netPreview.toLocaleString()}</span></p>
              <div className="form-buttons">
                <button className="primary-btn" type="submit">Add Record</button>
                <button className="secondary-btn" type="button" onClick={() => setShowPayrollForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        <div className="table-card">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Month</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {payroll.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.employeeName}</strong></td>
                  <td>{p.department}</td>
                  <td>{p.month}</td>
                  <td>₹{(p.basicSalary  || 0).toLocaleString()}</td>
                  <td>₹{(p.allowances   || 0).toLocaleString()}</td>
                  <td>₹{(p.deductions   || 0).toLocaleString()}</td>
                  <td><strong>₹{(p.netPay || 0).toLocaleString()}</strong></td>
                  <td><span className={`status-badge ${p.status === 'Paid' ? 'paid-badge' : 'pending-badge'}`}>{p.status}</span></td>
                  <td>
                    <div className="att-actions">
                      {p.status === 'Pending' && <button className="approve-btn" onClick={() => markPaid(p._id, p.employeeName)}>Mark Paid</button>}
                      <button className="secondary-btn" style={{ marginLeft: 0 }} onClick={() => handlePrintPayslip(p)}>🖨 Payslip</button>
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
              <select value={newPerformance.employeeId} onChange={e => {
                const emp = employees.find(em => em._id === e.target.value);
                setNewPerformance({ ...newPerformance, employeeId: e.target.value, employeeName: emp?.name || '', department: emp?.department || '' });
              }}>
                <option value="">Select Employee</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
              </select>
              <input placeholder="Review Period (e.g. Q3 2026)" value={newPerformance.reviewPeriod} onChange={e => setNewPerformance({ ...newPerformance, reviewPeriod: e.target.value })} />
              <input placeholder="KPI Description" value={newPerformance.kpi} onChange={e => setNewPerformance({ ...newPerformance, kpi: e.target.value })} />
              <select value={newPerformance.rating} onChange={e => setNewPerformance({ ...newPerformance, rating: e.target.value })}>
                <option value="1">1 ★</option>
                <option value="2">2 ★★</option>
                <option value="3">3 ★★★</option>
                <option value="4">4 ★★★★</option>
                <option value="5">5 ★★★★★</option>
              </select>
              <input placeholder="Reviewed By" value={newPerformance.reviewedBy} onChange={e => setNewPerformance({ ...newPerformance, reviewedBy: e.target.value })} />
            </div>
            <textarea
              style={{ width: '100%', marginTop: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <strong style={{ fontSize: '16px' }}>{p.employeeName}</strong>
              <span className={`status-badge ${performanceBadgeClass(p.status)}`}>{p.status}</span>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>{p.department} • {p.reviewPeriod}</p>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}><strong>KPI:</strong> {p.kpi}</p>
            <div style={{ marginBottom: '8px' }}>{renderStars(p.rating)}</div>
            {p.review && <p style={{ color: '#475569', fontSize: '13px', marginBottom: '12px', fontStyle: 'italic' }}>"{p.review}"</p>}
            {p.reviewedBy && <p style={{ fontSize: '12px', color: '#94a3b8' }}>Reviewed by: {p.reviewedBy}</p>}
            {canEdit && (
              <div style={{ marginTop: '12px' }}>
                {p.status === 'Draft'     && <button className="att-status-btn" onClick={() => updatePerformanceStatus(p._id, 'Submitted',    p.employeeName)}>Submit</button>}
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
    const pendingLeaves  = leaves.filter(l => l.status === 'Pending').length;
    const absentCount    = attendance.filter(a => a.status === 'Absent').length;
    const lateCount      = attendance.filter(a => a.status === 'Late').length;
    const halfDayCount   = attendance.filter(a => a.status === 'Half-Day').length;
    const paidPayroll    = payroll.filter(p => p.status === 'Paid').length;
    const pendingPayroll = payroll.filter(p => p.status === 'Pending').length;
    const totalNetPay    = payroll.reduce((sum, p) => sum + (p.netPay || 0), 0);
    const deptBreakdown  = departments.map(d => ({ name: d.name, count: employees.filter(e => e.department === d.name).length }));

    return (
      <div>
        <div className="page-header">
          <div><h1>Reports</h1><p>Exportable HR analytics summaries</p></div>
        </div>
        <div className="report-grid">
          <div className="report-card">
            <h3>👥 Employee Summary</h3>
            <p>Total: <strong>{employees.length}</strong></p>
            {deptBreakdown.map(d => <p key={d.name}>{d.name}: {d.count}</p>)}
            <button className="export-btn" onClick={() => exportCSV('employees.csv', ['Name','Email','Department','Designation'], employees.map(e => [e.name, e.email, e.department, e.designation]))}>Export CSV</button>
          </div>
          <div className="report-card">
            <h3>📅 Leave Summary</h3>
            <p>Total Requests: <strong>{leaves.length}</strong></p>
            <p>Approved: <strong>{approvedLeaves}</strong></p>
            <p>Rejected: <strong>{rejectedLeaves}</strong></p>
            <p>Pending: <strong>{pendingLeaves}</strong></p>
            <button className="export-btn" onClick={() => exportCSV('leaves.csv', ['Name','Type','Dates','Status'], leaves.map(l => [l.name, l.type, l.dates, l.status]))}>Export CSV</button>
          </div>
          <div className="report-card">
            <h3>🕒 Attendance Summary</h3>
            <p>Total Records: <strong>{attendance.length}</strong></p>
            <p>Present: <strong>{presentCount}</strong></p>
            <p>Absent: <strong>{absentCount}</strong></p>
            <p>Late: <strong>{lateCount}</strong></p>
            <p>Half-Day: <strong>{halfDayCount}</strong></p>
            <button className="export-btn" onClick={() => exportCSV('attendance.csv', ['Employee','Date','Check In','Status'], attendance.map(a => [a.employeeName, a.date, a.checkIn, a.status]))}>Export CSV</button>
          </div>
          <div className="report-card">
            <h3>💰 Payroll Summary</h3>
            <p>Total Records: <strong>{payroll.length}</strong></p>
            <p>Paid: <strong>{paidPayroll}</strong></p>
            <p>Pending: <strong>{pendingPayroll}</strong></p>
            <p>Total Net Pay: <strong>₹{totalNetPay.toLocaleString()}</strong></p>
            <button className="export-btn" onClick={() => exportCSV('payroll.csv', ['Employee','Department','Month','Basic Salary','Allowances','Deductions','Net Pay','Status'], payroll.map(p => [p.employeeName, p.department, p.month, p.basicSalary, p.allowances, p.deductions, p.netPay, p.status]))}>Export CSV</button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activePage === 'Dashboard')        return renderDashboard();
    if (activePage === 'Employees')        return renderEmployees();
    if (activePage === 'Departments')      return renderDepartments();
    if (activePage === 'Attendance')       return renderAttendance();
    if (activePage === 'Leave Management') return renderLeave();
    if (activePage === 'Recruitment')      return renderRecruitment();
    if (activePage === 'Payroll')          return renderPayroll();
    if (activePage === 'Performance')      return renderPerformance();
    if (activePage === 'Reports')          return renderReports();
    if (activePage === 'My Profile')      return renderMyProfile();
    if (activePage === 'Team Management') return renderTeamManagement();
    return renderDashboard();
  };

  // ── Shell render ───────────────────────────────────────────────
  return (
    <div className="app">
      {/* Toast container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
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
            <p><strong>Employee:</strong>   {printPayslip.employeeName}</p>
            <p><strong>Designation:</strong> {printPayslip.designation}</p>
            <p><strong>Department:</strong>  {printPayslip.department}</p>
            <p><strong>Month:</strong>       {printPayslip.month}</p>
            <p><strong>Pay Date:</strong>    {printPayslip.payDate ? formatDate(printPayslip.payDate) : '—'}</p>
            <hr />
            <p><strong>Basic Salary:</strong> ₹{(printPayslip.basicSalary || 0).toLocaleString()}</p>
            <p><strong>Allowances:</strong>   ₹{(printPayslip.allowances  || 0).toLocaleString()}</p>
            <p><strong>Deductions:</strong>   ₹{(printPayslip.deductions  || 0).toLocaleString()}</p>
            <hr />
            <p style={{ fontSize: '20px' }}><strong>Net Pay: ₹{(printPayslip.netPay || 0).toLocaleString()}</strong></p>
          </div>
        </div>
      )}

      {/* Top header — real user info + logout */}
      <header className="top-header">
        <strong>🏢 Employix HRM</strong>
        <div className="header-user">
          <div className="avatar header-avatar">{user.email.charAt(0).toUpperCase()}</div>
          <div className="header-user-info">
            <span className="header-email">{user.email}</span>
            <span className="header-role-badge">{role}</span>
          </div>
          <button className="logout-btn" onClick={logout} aria-label="Sign out">
            Sign Out
          </button>
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
              <button key={item.label}
                className={`menu-item ${activePage === item.label ? 'active' : ''}`}
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
