import React, { useState } from 'react';
import { api, setAuthToken, setCurrentUser } from '../services/api';

export default function LoginPage({ onLoginSuccess, onGoToSignUp }) {
  // Option: 'STUDENT' or 'ADMIN'
  const [roleMode, setRoleMode] = useState('STUDENT');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminProof, setAdminProof] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminDeviceOtp, setAdminDeviceOtp] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Visibility toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showProof, setShowProof] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendAdminOtp = async () => {
    if (!email.trim()) {
      setError('Please provide your Administrator email address first.');
      return;
    }
    setError(null);
    setSendingOtp(true);
    try {
      const res = await api.sendOtp(email.trim());
      setAdminOtpSent(true);
      const code = res.device_scoped_otp || res.dev_otp;
      if (code) {
        setAdminDeviceOtp(code);
        setAdminOtp(code);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch email verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const isAdmin = roleMode === 'ADMIN';

    if (isAdmin && !adminOtp.trim()) {
      setError('Email Verification OTP is required. Click "Send OTP" to verify your email.');
      setLoading(false);
      return;
    }

    if (isAdmin && !adminProof.trim()) {
      setError('Administrator Security Proof passphrase is required.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.login(
        email.trim(),
        password,
        isAdmin ? adminOtp.trim() : '',
        isAdmin,
        isAdmin ? adminProof.trim() : ''
      );
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentDemo = async (demoEmail, demoPass) => {
    setRoleMode('STUDENT');
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(demoEmail, demoPass, '', false, '');
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubAdminDemo = async (demoEmail, demoPass, demoProof) => {
    setRoleMode('ADMIN');
    setEmail(demoEmail);
    setPassword(demoPass);
    setAdminProof(demoProof);
    setAdminOtp('123456');
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(demoEmail, demoPass, '123456', true, demoProof);
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Sub-Admin demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md bg-slate-900 border rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-200 ${
        roleMode === 'ADMIN' ? 'border-amber-500/60 shadow-amber-500/10' : 'border-slate-800'
      }`}>
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex w-12 h-12 rounded-2xl items-center justify-center font-black text-2xl mb-3 shadow-lg ${
            roleMode === 'ADMIN' 
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 shadow-amber-500/30'
              : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
          }`}>
            {roleMode === 'ADMIN' ? '🛡️' : 'B'}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Brogrammers</h1>
          <p className="text-xs text-slate-400 mt-1">Apex Institute of Technology • Single College Portal</p>
        </div>

        {/* Section Selector: Student or Admin */}
        <div className="mb-6 p-1 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setRoleMode('STUDENT');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'STUDENT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🎓 Student Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleMode('ADMIN');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'ADMIN'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <span>🛡️ Admin Login</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ================= ADMIN LOGIN FORM (MASKED INPUTS ONLY) ================= */}
        {roleMode === 'ADMIN' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-center">
              <div className="text-xs font-black text-amber-300 flex items-center justify-center gap-1.5">
                <span>🛡️ Administrator Clearance Section</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Chief Administrator authority held by <strong>UTKARSH KUSHWAHA</strong>.
                Credentials and security proof are confidential and masked.
              </p>
            </div>

            {/* Input 1: Admin Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email address"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={handleSendAdminOtp}
                  disabled={sendingOtp}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md whitespace-nowrap disabled:opacity-50"
                >
                  {sendingOtp ? 'Sending...' : adminOtpSent ? 'Resend' : 'Send OTP'}
                </button>
              </div>

              {adminDeviceOtp && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center justify-between">
                  <span>🔒 Verification Code (Dispatched to {email}): <strong className="font-mono text-white text-xs">{adminDeviceOtp}</strong></span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Auto-Filled</span>
                </div>
              )}
            </div>

            {/* Email Verification OTP Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Verification OTP <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={adminOtp}
                onChange={(e) => setAdminOtp(e.target.value)}
                placeholder="Enter 6-digit OTP code sent to your email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
              />
            </div>

            {/* Input 2: Password (Masked with Eye Toggle) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-amber-400 hover:text-amber-300"
                >
                  {showPassword ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Input 3: Security Proof (Masked with Eye Toggle) */}
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>Proof (Security Passphrase)</span>
                  <span className="text-[10px] text-rose-400 font-bold">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowProof(!showProof)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-mono"
                >
                  {showProof ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <input
                type={showProof ? 'text' : 'password'}
                required
                value={adminProof}
                onChange={(e) => setAdminProof(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-amber-500 text-amber-300 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-amber-300"
              />
              <p className="text-[11px] text-slate-400 leading-tight">
                Mandatory clearance phrase required to log into the administrator portal.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying Clearance...</span>
              ) : (
                <>
                  <span>🛡️</span>
                  <span>Sign In as Administrator</span>
                </>
              )}
            </button>

            {/* Sub-Admin Demo Fast Access (Leaves Chief Admin strictly manual) */}
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
                Sub-Admin Fast Access
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubAdminDemo('staff.admin@apex.edu', 'Admin@123', 'staffadmin2026')}
                className="w-full p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-600/40 text-amber-400 text-xs font-semibold flex items-center justify-between transition-all"
              >
                <span>🛡️ Staff Admin (Demo Sub-Admin)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">SUB-ADMIN</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Chief Administrator (Utkarsh Kushwaha) clearance is strictly manual.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setRoleMode('STUDENT');
                setError(null);
              }}
              className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-all text-center"
            >
              ← Back to Student Portal
            </button>
          </form>
        ) : (
          /* ================= STUDENT LOGIN FORM ================= */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">College Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@apex.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                >
                  {showPassword ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In to Brogrammers'}
            </button>
          </form>
        )}

        {/* Student Mode: Admin Option Card + Instant One-Click Demo Logins */}
        {roleMode === 'STUDENT' && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            {/* Dedicated Admin Login Section Shortcut */}
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-950 border border-amber-600/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <div>
                  <div className="text-xs font-bold text-amber-300">College Administrator?</div>
                  <div className="text-[11px] text-slate-400">Chief Admin (UTKARSH KUSHWAHA) Manual Access</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRoleMode('ADMIN');
                  setError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md"
              >
                Admin Login ➔
              </button>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Instant One-Click Demo Logins
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStudentDemo('dr.sharma@apex.edu', 'Faculty@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-purple-400 text-left font-medium transition-all"
              >
                🎓 Dr. Sharma (Faculty)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStudentDemo('aravind.pg@apex.edu', 'Student@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 text-left font-medium transition-all"
              >
                🔬 Aravind (PG / M.Tech)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStudentDemo('priya.4th@apex.edu', 'Student@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-blue-400 text-left font-medium transition-all"
              >
                ⭐ Priya (4th Yr Senior)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStudentDemo('ananya.1st@apex.edu', 'Student@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 text-left font-medium transition-all"
              >
                🌱 Ananya (1st Yr Junior)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStudentDemo('rahul.pending@apex.edu', 'Student@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-rose-400 text-left font-medium transition-all col-span-2"
              >
                ⏳ Rahul (Pending ID)
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            New student or haven't registered your ID?{' '}
            <button
              type="button"
              onClick={onGoToSignUp}
              className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2"
            >
              Create Verified Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
