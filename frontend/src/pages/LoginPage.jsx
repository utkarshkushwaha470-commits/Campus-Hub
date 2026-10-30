import React, { useState } from 'react';
import { api, setAuthToken, setCurrentUser } from '../services/api';

export default function LoginPage({ onLoginSuccess, onGoToSignUp }) {
  // Role Selection: 'STUDENT' | 'ADMIN'
  const [roleMode, setRoleMode] = useState('STUDENT');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminProof, setAdminProof] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const isAdmin = roleMode === 'ADMIN';

    if (isAdmin && !adminProof.trim()) {
      setError('Institutional Administrator Security Proof is required.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.login(
        email.trim(),
        password,
        '',
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 items-center justify-center text-white font-extrabold text-2xl mb-3 shadow-lg shadow-indigo-500/30">
            B
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Brogrammers</h1>
          <p className="text-xs text-slate-400 mt-1">Apex Institute of Technology • Campus Network</p>
        </div>

        {/* Admin or Student Selector */}
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
            <span>🎓 Student / Member</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleMode('ADMIN');
              setError(null);
              if (!email) setEmail('utkarshkushwaha470@gmail.com');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'ADMIN'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <span>🛡️ College Administrator</span>
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

        {/* Manual Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {roleMode === 'ADMIN' ? 'Administrator Email' : 'College Email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={roleMode === 'ADMIN' ? 'utkarshkushwaha470@gmail.com' : 'yourname@apex.edu'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Admin Exclusive: Institutional Security Proof */}
          {roleMode === 'ADMIN' && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🛡️ Institutional Security Proof</span>
                  <span className="text-[10px] text-rose-400 font-bold">*</span>
                </label>
                <span className="text-[10px] font-mono text-amber-400/80">Proof Clearance</span>
              </div>
              <input
                type="text"
                required
                value={adminProof}
                onChange={(e) => setAdminProof(e.target.value)}
                placeholder="Enter proof passphrase (e.g. ujjawal utkarsh 222005)"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-amber-800/80 text-amber-300 placeholder-amber-700/60 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-400 leading-tight">
                Mandatory clearance phrase required to log into the <strong>UTKARSH KUSHWAHA</strong> admin portal.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 ${
              roleMode === 'ADMIN'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
            }`}
          >
            {loading
              ? 'Verifying Clearance...'
              : roleMode === 'ADMIN'
              ? 'Authenticate as Administrator'
              : 'Sign In to Brogrammers'}
          </button>
        </form>

        {/* Student Test Quick Switchers (NO Admin one-click button) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
            Student & Faculty Fast Logins
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
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
              onClick={() => handleStudentDemo('priya.4th@apex.edu', 'Student@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-blue-400 text-left font-medium transition-all"
            >
              ⭐ Priya (4th Yr Senior)
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
              onClick={() => handleStudentDemo('dr.sharma@apex.edu', 'Faculty@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-purple-400 text-left font-medium transition-all"
            >
              🎓 Dr. Sharma (Faculty)
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Need an account?{' '}
            <button
              onClick={onGoToSignUp}
              className="text-blue-400 hover:underline font-semibold"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
