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

  // Admin sub-mode: 'SIGNIN' | 'REGISTER'
  const [adminSubMode, setAdminSubMode] = useState('SIGNIN');
  const [adminRegName, setAdminRegName] = useState('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState(null);

  // Forgot Password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotDeviceOtp, setForgotDeviceOtp] = useState(null);
  const [forgotSendingOtp, setForgotSendingOtp] = useState(false);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotCopied, setForgotCopied] = useState(false);

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

  const handleAdminRegister = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setAdminSuccessMsg(null);
    setLoading(true);

    if (!adminRegName.trim()) {
      setError('Please provide your Full Legal Name.');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError('Please provide your Administrator email address.');
      setLoading(false);
      return;
    }
    if (!adminOtp.trim()) {
      setError('Email Verification OTP is required. Click "Send OTP" to verify your email.');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter a secure password.');
      setLoading(false);
      return;
    }
    if (!adminProof.trim() || adminProof.trim().length < 3) {
      setError('Please create your Administrator Security Proof passphrase (minimum 3 characters).');
      setLoading(false);
      return;
    }

    try {
      const res = await api.adminSignup({
        email: email.trim(),
        full_name: adminRegName.trim(),
        password: password,
        admin_proof: adminProof.trim(),
        otp: adminOtp.trim()
      });

      if (res.access_token && res.user?.is_chief_admin) {
        setAuthToken(res.access_token);
        setCurrentUser(res.user);
        onLoginSuccess(res.user);
      } else {
        setAdminSuccessMsg(
          res.message || 'Administrator clearance request submitted successfully! Your request has been dispatched to Chief Administrator UTKARSH KUSHWAHA for review and activation.'
        );
        setAdminSubMode('SIGNIN');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit administrator registration request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      setError('Please provide your registered account email address first.');
      return;
    }
    setError(null);
    setForgotSendingOtp(true);
    setForgotCopied(false);
    try {
      const res = await api.sendOtp(forgotEmail.trim());
      setForgotOtpSent(true);
      const code = res.device_scoped_otp || res.dev_otp;
      if (code) {
        setForgotDeviceOtp(code);
        setForgotOtp(code);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification OTP to email.');
    } finally {
      setForgotSendingOtp(false);
    }
  };

  const handleCopyForgotOtp = () => {
    if (forgotDeviceOtp) {
      try {
        navigator.clipboard?.writeText(forgotDeviceOtp);
        setForgotCopied(true);
        setTimeout(() => setForgotCopied(false), 2500);
      } catch (e) {
        setForgotCopied(true);
      }
    }
  };

  const handleForgotPasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please provide your registered account email address.');
      return;
    }
    if (!forgotOtp.trim()) {
      setError('Please enter or copy the 6-digit Email Verification OTP.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotPasswordLogin({
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        new_password: forgotNewPassword.trim() || undefined
      });
      setAuthToken(res.access_token);
      setCurrentUser(res.user);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastDemoLogin = async (demoEmail, demoPass, isAdmin = false, adminProof = '') => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(
        demoEmail,
        demoPass,
        isAdmin ? '123456' : '',
        isAdmin,
        isAdmin ? adminProof : ''
      );
      setAuthToken(data.access_token);
      setCurrentUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Demo login failed. Please verify credentials.');
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
              setIsForgotPassword(false);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'STUDENT' && !isForgotPassword
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
              setIsForgotPassword(false);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'ADMIN' && !isForgotPassword
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <span>🛡️ Admin Login</span>
          </button>
        </div>

        {adminSuccessMsg && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
            <span>{adminSuccessMsg}</span>
            <button onClick={() => setAdminSuccessMsg(null)} className="text-slate-400 hover:text-white font-bold ml-2">×</button>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            {error.includes("No administrator account found") && (
              <button
                type="button"
                onClick={() => { setAdminSubMode('REGISTER'); setError(null); }}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow flex items-center justify-center gap-1.5"
              >
                <span>📝</span>
                <span>Register as Administrator Now ➔</span>
              </button>
            )}
            {(error.toLowerCase().includes("password") || error.toLowerCase().includes("incorrect")) && (
              <div className="pt-2 border-t border-red-800/60 flex items-center justify-between">
                <span className="text-[11px] text-red-200">Forgot your account password?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setForgotEmail(email);
                    setError(null);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition shadow flex items-center gap-1"
                >
                  <span>🔑</span>
                  <span>Reset & Enter with OTP ➔</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= FORGOT PASSWORD / ACCOUNT RECOVERY FORM ================= */}
        {isForgotPassword ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-slate-900 border border-indigo-500/50 text-center">
              <div className="text-xs font-black text-white flex items-center justify-center gap-1.5">
                <span className="text-sm">🔑</span>
                <span>Account Recovery & Instant Access</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Forgot your password? Enter your registered email to receive a verification OTP. Once verified, you will immediately enter your account.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordLogin} className="space-y-4">
              {/* Registered Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Account Email <span className="text-blue-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter registered email address"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={forgotSendingOtp}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-md whitespace-nowrap disabled:opacity-50"
                  >
                    {forgotSendingOtp ? 'Sending...' : forgotOtpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>

                {/* Dispatched OTP Display with Copy & Auto-Filled Badge */}
                {forgotDeviceOtp && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <span>🔒 Code sent to {forgotEmail}:</span>
                      <strong className="font-mono text-white text-xs bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-600">
                        {forgotDeviceOtp}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyForgotOtp}
                        className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <span>{forgotCopied ? '✓ Copied!' : '📋 Copy OTP'}</span>
                      </button>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                        Auto-Filled
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* OTP Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Verification OTP <span className="text-indigo-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="Enter or paste 6-digit OTP code"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono tracking-wider"
                  />
                  {forgotDeviceOtp && (
                    <button
                      type="button"
                      onClick={() => setForgotOtp(forgotDeviceOtp)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      Paste Code
                    </button>
                  )}
                </div>
              </div>

              {/* Optional New Password with Eye Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Set New Password <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    {showForgotNewPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <input
                  type={showForgotNewPassword ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Enter new password (leave blank to keep current)"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-indigo-400"
                />
                <p className="text-[11px] text-slate-400 leading-tight">
                  Leave blank to sign in immediately with OTP, or enter a new password to update it for future logins.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Verifying OTP & Authorizing Entry...</span>
                ) : (
                  <>
                    <span>🔓</span>
                    <span>Verify OTP & Enter Account</span>
                  </>
                )}
              </button>

              {/* Back to Sign In */}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                }}
                className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-all text-center"
              >
                ← Back to Sign In
              </button>
            </form>
          </div>
        ) : roleMode === 'ADMIN' ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-center">
              <div className="text-xs font-black text-amber-300 flex items-center justify-center gap-1.5">
                <span>🛡️ Administrator Clearance Section</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Chief Administrator authority held by <strong>UTKARSH KUSHWAHA</strong>.
                Credentials and security proof are confidential and masked.
              </p>
            </div>

            {/* Sub-mode switcher: Sign In vs Request Clearance */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-amber-600/40">
              <button
                type="button"
                onClick={() => { setAdminSubMode('SIGNIN'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  adminSubMode === 'SIGNIN'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>🔑</span>
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setAdminSubMode('REGISTER'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  adminSubMode === 'REGISTER'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>📝</span>
                <span>Request Clearance</span>
              </button>
            </div>

            {adminSubMode === 'REGISTER' ? (
              /* ================= ADMIN REGISTRATION FORM ================= */
              <form onSubmit={handleAdminRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={adminRegName}
                    onChange={(e) => setAdminRegName(e.target.value)}
                    placeholder="e.g. Raj Sharma / Gabbar Singh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Administrator Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. gabbarsingh7642@gmail.com"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-400"
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
                    <div className="mt-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center justify-between">
                      <span>🔒 Code (Dispatched to {email}): <strong className="font-mono text-white text-xs">{adminDeviceOtp}</strong></span>
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Auto-Filled</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Verification OTP <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminOtp}
                    onChange={(e) => setAdminOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP code sent to email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-amber-400 hover:text-amber-300"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-600/50 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>Create Security Proof Passphrase</span>
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
                    Create your own secret proof passphrase. You will use this to log into the Administrator portal.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Submitting Request...' : '🚀 Submit Administrator Clearance Request'}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Your application will be sent to <strong>Chief Administrator UTKARSH KUSHWAHA</strong>. Once approved, you can sign in.
                </p>
              </form>
            ) : (
              /* ================= ADMIN SIGN IN FORM ================= */
              <form onSubmit={handleLogin} className="space-y-4">
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
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">Forgot credentials?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotEmail(email);
                        setError(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1"
                    >
                      <span>🔑</span>
                      <span>Forgot Password?</span>
                    </button>
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

                {/* Helper prompt to register */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setAdminSubMode('REGISTER'); setError(null); }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Want to register as a new Administrator? <strong>Submit Clearance Request ➔</strong>
                  </button>
                </div>
              </form>
            )}

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
          </div>
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
                placeholder="Enter registered college email"
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
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">Forgot credentials?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setForgotEmail(email);
                    setError(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold transition flex items-center gap-1"
                >
                  <span>🔑</span>
                  <span>Forgot Password?</span>
                </button>
              </div>
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

        {/* Student Mode: Admin Option Card */}
        {roleMode === 'STUDENT' && !isForgotPassword && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            {/* Dedicated Admin Login Section Shortcut */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-950 border border-amber-600/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🛡️</span>
                <div>
                  <div className="text-xs font-bold text-amber-300">College Administrator?</div>
                  <div className="text-[11px] text-slate-400">Institutional Administrator & Chief Admin Portal Access</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRoleMode('ADMIN');
                  setError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md whitespace-nowrap"
              >
                Admin Login ➔
              </button>
            </div>
          </div>
        )}

        {/* ================= COMPANY PRESENTATION DEMO ACCOUNTS ================= */}
        {!isForgotPassword && (
          <div className="mt-6 pt-5 border-t border-slate-800/90">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🏢</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Company Presentation Demos
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                1-Click Evaluation
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-snug">
              Instant 1-click accounts prepared for live company review of all institutional roles:
            </p>

            <div className="space-y-2">
              {/* 1. Chief Administrator: Utkarsh Kushwaha */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleFastDemoLogin('utkarshkushwaha470@gmail.com', 'utkarsh2720A', true, 'ujjawal utkarsh 222005')}
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 hover:from-amber-900/80 hover:to-slate-800 border border-amber-500/50 text-left transition shadow-md flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <div className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                      UTKARSH KUSHWAHA
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Chief Administrator • Executive Oversight
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                  CHIEF ADMIN
                </span>
              </button>

              {/* 2. Faculty: Dr. Vikram Sharma */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleFastDemoLogin('faculty.demo@apex.edu', 'Faculty@123', false)}
                className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-purple-500/40 text-left transition shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">👨‍🏫</span>
                  <div>
                    <div className="text-xs font-bold text-purple-300 group-hover:text-purple-200">
                      Dr. Vikram Sharma
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Faculty / HOD • Problem Box & Advisory
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/60 font-bold">
                  FACULTY
                </span>
              </button>

              {/* 3. All Year Students Grid (Year 4, 3, 2, 1) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Year 4 Senior */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFastDemoLogin('student.4th@apex.edu', 'Student@123', false)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-blue-500/40 text-left transition shadow-sm flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">⭐</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/50 font-bold">
                      YEAR 4
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-[11px] font-bold text-blue-300 group-hover:text-blue-200 truncate">
                      Priya Nair
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">Senior Guide • 4th Yr</div>
                  </div>
                </button>

                {/* Year 3 Senior */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFastDemoLogin('student.3rd@apex.edu', 'Student@123', false)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-left transition shadow-sm flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">🎓</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-bold">
                      YEAR 3
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200 truncate">
                      Rohit Verma
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">Senior • 3rd Yr</div>
                  </div>
                </button>

                {/* Year 2 Student */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFastDemoLogin('student.2nd@apex.edu', 'Student@123', false)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-indigo-500/40 text-left transition shadow-sm flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">📘</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-bold">
                      YEAR 2
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-[11px] font-bold text-indigo-300 group-hover:text-indigo-200 truncate">
                      Aarav Mehta
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">Sophomore • 2nd Yr</div>
                  </div>
                </button>

                {/* Year 1 Junior */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFastDemoLogin('student.1st@apex.edu', 'Student@123', false)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-left transition shadow-sm flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">🌱</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold">
                      YEAR 1
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-[11px] font-bold text-emerald-300 group-hover:text-emerald-200 truncate">
                      Ananya Sen
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">Junior • 1st Yr</div>
                  </div>
                </button>
              </div>
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
