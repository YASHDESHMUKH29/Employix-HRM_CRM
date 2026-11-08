import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register({ onSwitchToLogin }) {
  const { login } = useAuth();

  const [form,    setForm]    = useState({ email: '', password: '', confirm: '', role: 'Employee' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password || !form.confirm) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email, password: form.password, role: form.role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      login(data.token, data.user);
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">E</div>
          <div>
            <h2>EMPLOYIX</h2>
            <p>HRM CRM SYSTEM</p>
          </div>
        </div>

        <h3 className="auth-title">Create a new account</h3>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              placeholder="you@employix.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              name="confirm"
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-role">Role</label>
            <select
              id="reg-role"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="Admin">Admin</option>
              <option value="HR Manager">HR Manager</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link-btn" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
