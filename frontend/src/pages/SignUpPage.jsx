import React, { useState } from 'react';
import { api, setAuthToken, setCurrentUser } from '../services/api';

export default function SignUpPage({ onSignUpSuccess, onGoToLogin }) {
  // Mode: 'STUDENT' | 'ADMIN'
  const [regMode, setRegMode] = useState('STUDENT');

  // Shared Fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  // Admin Field
  const [adminProof, setAdminProof] = useState('');

  // Visibility toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showProof, setShowProof] = useState(false);

  // Student Fields
  const [batch, setBatch] = useState('2026-2030');
  const [requestedYear, setRequestedYear] = useState(1);
  const [crn, setCrn] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [otp, setOtp] = useState('');
  const [idPhoto, setIdPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [deviceOtp, setDeviceOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminSuccess, setAdminSuccess] = useState(null);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please provide your email address first.');
      return;
    }
    setError(null);
    try {
      const res = await api.sendOtp(email.trim());
      setOtpSent(true);
      const code = res.device_scoped_otp || res.dev_otp;
      if (code) {
        setDeviceOtp(code);
        setOtp(code); // Scoped to this browser device only
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch email verification code.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (regMode === 'ADMIN') {
        if (!otp.trim()) {
          setError('Email Verification OTP is required. Please verify your email.');
          setLoading(false);
          return;
        }
        if (!adminProof.trim()) {
          setError('Please create your Administrator Security Proof passphrase.');
          setLoading(false);
          return;
        }
        if (adminProof.trim().length < 3) {
          setError('Security proof passphrase must be at least 3 characters.');
          setLoading(false);
          return;
        }

        const res = await api.adminSignup({
          email: email.trim(),
          full_name: fullName.trim(),
          password: password,
          admin_proof: adminProof.trim(),
          otp: otp.trim()
        });
        if (res.access_token && res.user?.is_chief_admin) {
          setAuthToken(res.access_token);
          setCurrentUser(res.user);
          onSignUpSuccess(res.user);
        } else {
          setAdminSuccess(
            res.message || 'Administrator clearance request submitted! Your request has been dispatched to Chief Administrator UTKARSH KUSHWAHA for review and activation.'
          );
        }
      } else {
        if (!idPhoto) {
          setError('Please upload your official college physical ID card photo.');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('email', email.trim());
        formData.append('full_name', fullName.trim());
        formData.append('password', password);
        formData.append('batch', batch);
        formData.append('requested_year', requestedYear);
        formData.append('crn_or_roll_number', crn.trim());
        formData.append('role', role);
        formData.append('otp', otp);
        formData.append('id_card', idPhoto);

        const res = await api.signup(formData);
        setAuthToken(res.access_token);
        setCurrentUser(res.user);
        onSignUpSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient glowing atmosphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 z-10">
        {/* Brand Header */}
        <div className="text-center mb-7 relative">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 items-center justify-center text-white font-black text-2xl mb-3 shadow-xl shadow-indigo-500/35 ring-4 ring-indigo-500/25">
            C
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Join Campus Hub</span>
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 shadow-sm">
              PWA
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Allenhouse Institute of Technology • Account Enrollment</span>
          </p>
        </div>

        {/* Role Mode Selector: Admin or Student */}
        <div className="mb-6 p-1 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setRegMode('STUDENT');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              regMode === 'STUDENT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🎓 Student Registration</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRegMode('ADMIN');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              regMode === 'ADMIN'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <span>🛡️ Admin Clearance Registration</span>
          </button>
        </div>

        {adminSuccess && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs space-y-2 shadow-xl">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>✓</span>
              <span>Clearance Request Dispatched</span>
            </div>
            <p className="leading-relaxed">{adminSuccess}</p>
            <button
              type="button"
              onClick={onGoToLogin}
              className="mt-2 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
            >
              Go to Sign In ➔
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={regMode === 'ADMIN' ? 'e.g. Raj Sharma' : 'e.g. Ananya Sen'}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {regMode === 'ADMIN' ? 'Administrator Email Address' : 'Email Address'}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={regMode === 'ADMIN' ? 'e.g. admin@gmail.com' : 'yourname@gmail.com'}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all whitespace-nowrap"
              >
                {otpSent ? 'Resend' : 'Send OTP'}
              </button>
            </div>

            {/* Device-Scoped Verification Badge */}
            {deviceOtp && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center justify-between">
                <span>🔒 Verification Code (Dispatched to {email}): <strong className="font-mono text-white text-xs">{deviceOtp}</strong></span>
                <span className="text-[10px] uppercase font-bold text-emerald-400">Auto-Filled</span>
              </div>
            )}
          </div>

          {/* Email Verification OTP Field for both Admin and Student */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Verification OTP <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP code sent to email"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:border-blue-500 outline-none font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
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
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:border-blue-500 outline-none font-mono"
            />
          </div>

          {/* ADMIN-SPECIFIC REGISTRATION FIELD (MASKED INPUT WITH CUSTOM PROOF CREATION) */}
          {regMode === 'ADMIN' ? (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300">
                  Create Security Proof Passphrase <span className="text-rose-400">*</span>
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
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-800/80 text-amber-300 placeholder-slate-600 text-xs font-mono focus:border-amber-400 outline-none"
              />
              <p className="text-[11px] text-slate-400 leading-tight">
                Create your own confidential security proof passphrase. You will use this passphrase whenever signing into the Administrator portal.
              </p>
            </div>
          ) : (
            /* STUDENT-SPECIFIC REGISTRATION FIELDS */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Batch</label>
                  <input
                    type="text"
                    required
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="2026-2030"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Year</label>
                  <select
                    value={requestedYear}
                    onChange={(e) => setRequestedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-blue-500 outline-none"
                  >
                    <option value={1}>1st Year (Junior)</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year (Senior)</option>
                    <option value={4}>4th Year (Senior)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">College CRN / Roll Number</label>
                <input
                  type="text"
                  required
                  value={crn}
                  onChange={(e) => setCrn(e.target.value)}
                  placeholder="e.g. CRN-2026-105"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Physical College ID Card Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                {photoPreview && (
                  <div className="mt-2.5 p-2 bg-slate-950 rounded-xl border border-slate-800 max-h-36 overflow-hidden flex items-center justify-center">
                    <img src={photoPreview} alt="ID Preview" className="max-h-32 object-contain rounded" />
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-lg disabled:opacity-50 mt-2 ${
              regMode === 'ADMIN'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
            }`}
          >
            {loading
              ? 'Processing Registration...'
              : regMode === 'ADMIN'
              ? 'Register & Activate Administrator Account'
              : 'Submit ID Verification & Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <button onClick={onGoToLogin} className="text-blue-400 hover:underline font-semibold">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
