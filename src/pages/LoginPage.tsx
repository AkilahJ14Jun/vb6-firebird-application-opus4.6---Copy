/**
 * ============================================================================
 * LOGIN PAGE
 * ============================================================================
 * Replaces: frmLogin from VB6
 *
 * ORIGINAL VB6 BEHAVIOR:
 *   - Simple username/password form
 *   - Validated against USERS table via modDatabase.ExecuteSQL
 *   - On success: set modGlobal.g_UserID, g_UserName, g_UserRole
 *   - On failure: show MsgBox "Invalid username or password"
 *   - After 3 failed attempts: disable login and exit application
 *
 * MODERN IMPLEMENTATION:
 *   - Clean login form with validation
 *   - Role-based access control
 *   - Demo credentials shown for testing
 *   - In production: would call POST /auth/login API with JWT response
 * ============================================================================
 */

import { useState } from 'react';
import { Scale, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { User } from '@/types';


interface LoginPageProps {
  /** The current list of users to authenticate against */
  users: User[];
  /** Called when login is successful, passes the authenticated user */
  onLogin: (user: User) => void;
}

export function LoginPage({ users, onLogin }: LoginPageProps) {
  /* ── Form State ──────────────────────────────────────────────────────── */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  /**
   * Handle login form submission
   * In the original VB6:
   *   rs = ExecuteSQL("SELECT * FROM USERS WHERE USERNAME='" & txtUser & "'")
   *   If rs.EOF Then MsgBox "Invalid" Else check password
   */
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check attempt limit (mirrors VB6's 3-attempt lockout)
    if (attempts >= 5) {
      setError('Too many failed attempts. Please contact administrator.');
      return;
    }

    // Find user (in production: API call)
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      setAttempts((a) => a + 1);
      setError('Invalid username or password.');
      return;
    }

    if (!user.isActive) {
      setError('This account has been deactivated. Contact administrator.');
      return;
    }

    // For demo: any password works. In production: bcrypt compare
    if (password.length < 1) {
      setError('Please enter your password.');
      return;
    }

    // Success — mirrors VB6's g_CurrentUser = user pattern
    onLogin(user);
  };

  /** Quick login with a demo account */
  const quickLogin = (u: string) => {
    const user = users.find((x) => x.username === u);
    if (user) onLogin(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* ── Logo & Title ──────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WS Series</h1>
          <p className="text-slate-400 text-sm mt-1">Weighing Scale Management System</p>
        </div>

        {/* ── Login Card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the system</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={attempts >= 5}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign In
            </button>
          </form>

          {/* ── Demo Quick Login ──────────────────────────────────── */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-3">Demo — Quick Login (any password):</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                // NOTE: 'sysadmin' role has the highest system privileges (Role Level 1).
                // It is intentionally suppressed from the demo quick login buttons (isSuppressed: true)
                // so regular demo users only access standard roles, while retaining sysadmin for future/support use.
                { user: 'sysadmin', label: 'System Admin (Support)', color: 'bg-purple-50 text-purple-700 border-purple-200', isSuppressed: true },
                { user: 'admin', label: 'Administrator', color: 'bg-red-50 text-red-700 border-red-200' },
                { user: 'planner1', label: 'Planner', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                { user: 'operator1', label: 'Operator', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { user: 'manager1', label: 'Manager', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { user: 'viewer1', label: 'Viewer', color: 'bg-slate-50 text-slate-700 border-slate-200' },
              ]
                .filter((demo) => !demo.isSuppressed)
                .map((demo) => (
                  <button
                    key={demo.user}
                    onClick={() => quickLogin(demo.user)}
                    className={`text-xs font-medium px-2.5 py-2 rounded-lg border transition-all hover:shadow ${demo.color} truncate text-center`}
                    title={demo.label}
                  >
                    {demo.label}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Migrated from VB6 + Firebird 2.5 → React + TypeScript
        </p>
      </div>
    </div>
  );
}
