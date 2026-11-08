import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'employix_token';
const USER_KEY  = 'employix_user';

export function AuthProvider({ children }) {
  // Initialise from localStorage so the session survives a page refresh
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user,  setUser]  = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  /** Called after a successful /api/auth/login or /register response */
  const login = useCallback((tokenValue, userObject) => {
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userObject));
    setToken(tokenValue);
    setUser(userObject);
  }, []);

  /** Clears all auth state and storage */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Drop-in replacement for fetch() that automatically injects
   * `Authorization: Bearer <token>` on every request.
   *
   * Usage:  const data = await authFetch('/api/employees')
   *         const data = await authFetch('/api/employees', { method: 'POST', body: JSON.stringify(payload) })
   */
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
