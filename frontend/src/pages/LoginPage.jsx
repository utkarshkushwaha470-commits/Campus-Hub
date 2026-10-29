import React, { useState } from 'react';
import { api, setAuthToken, setCurrentUser } from '../services/api';

export default function LoginPage({ onLoginSuccess, onGoToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2fa, setShow2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(email, password, twoFactorCode);
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      if (err.data?.detail && err.data.detail.includes('2FA')) {
        setShow2fa(true);
      }
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOneClickDemo = async (demoEmail, demoPass, code = '') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (code) {
      setTwoFactorCode(code);
      setShow2fa(true);
    } else {
      setTwoFactorCode('');
      setShow2fa(false);
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(demoEmail, demoPass, code);
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      if (err.data?.detail && err.data.detail.includes('2FA')) {
        setShow2fa(true);
      }
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white font-extrabold text-2xl mb-3 shadow-lg shadow-blue-500/30">
            C
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CampusConnect</h1>
          <p className="text-xs text-slate-400 mt-1">Apex Institute of Technology • Single College Portal</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

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

          {show2fa && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-amber-400">Admin 2FA Security Token</label>
                <span className="text-[10px] text-amber-400/80 font-mono">Code: 888888</span>
              </div>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="Enter 6-digit code (888888)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-800/80 text-amber-300 placeholder-amber-600 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to CampusConnect'}
          </button>
        </form>

        {/* Demo Fast-Switch */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
            Instant One-Click Demo Logins
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleOneClickDemo('utkarshkushwaha47@gmail.com', 'utkarsh222005')}
            className="w-full mb-2.5 p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/60 text-amber-300 text-left font-bold transition-all flex items-center justify-between"
          >
            <span>👑 Utkarsh Kushwaha (Chief Admin)</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-900 text-amber-200">Director</span>
          </button>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('admin@apex.edu', 'Admin@123', '888888')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-amber-400 text-left font-medium transition-all"
            >
              👑 Staff Admin (2FA)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('dr.sharma@apex.edu', 'Faculty@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-purple-400 text-left font-medium transition-all"
            >
              🎓 Dr. Sharma (Faculty)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('aravind.pg@apex.edu', 'Student@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 text-left font-medium transition-all"
            >
              🔬 Aravind (PG / M.Tech)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('priya.4th@apex.edu', 'Student@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-blue-400 text-left font-medium transition-all"
            >
              ⭐ Priya (4th Yr Senior)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('ananya.1st@apex.edu', 'Student@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 text-left font-medium transition-all"
            >
              🌱 Ananya (1st Yr Junior)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('rahul.pending@apex.edu', 'Student@123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-rose-400 text-left font-medium transition-all"
            >
              ⏳ Rahul (Pending ID)
            </button>
          </div>
        </div>

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
