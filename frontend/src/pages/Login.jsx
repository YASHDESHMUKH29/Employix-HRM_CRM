import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
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

        <h3 className="auth-title">Sign in to your account</h3>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
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
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <button className="auth-link-btn" onClick={onSwitchToRegister}>
            Register
          </button>
        </p>

        {/* Quick-fill hints for dev convenience */}
        <div className="auth-hints">
          <p>Demo accounts (password: <code>Password123</code>)</p>
          <div className="auth-hint-row">
            <button className="auth-hint-btn" onClick={() => setForm({ email: 'admin@employix.com',       password: 'Password123' })}>Admin</button>
            <button className="auth-hint-btn" onClick={() => setForm({ email: 'hr@employix.com',            password: 'Password123' })}>HR Manager</button>
            <button className="auth-hint-btn" onClick={() => setForm({ email: 'dept.manager@employix.com', password: 'Password123' })}>Dept Manager</button>
            <button className="auth-hint-btn" onClick={() => setForm({ email: 'recruiter@employix.com',    password: 'Password123' })}>Recruiter</button>
            <button className="auth-hint-btn" onClick={() => setForm({ email: 'employee@employix.com',     password: 'Password123' })}>Employee</button>
          </div>
        </div>
      </div>
    </div>
  );
}
