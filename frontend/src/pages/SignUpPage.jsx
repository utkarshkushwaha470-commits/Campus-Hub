import React, { useState } from 'react';
import { api, setAuthToken, setCurrentUser } from '../services/api';

export default function SignUpPage({ onSignUpSuccess, onGoToLogin }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [batch, setBatch] = useState('2026-2030');
  const [requestedYear, setRequestedYear] = useState(1);
  const [crn, setCrn] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [otp, setOtp] = useState('');
  const [idPhoto, setIdPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendOtp = async () => {
    if (!email) {
      setError('Please provide your college email first.');
      return;
    }
    setError(null);
    try {
      const res = await api.sendOtp(email);
      setOtpSent(true);
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtp(res.dev_otp); // Auto-fill for seamless user testing
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch email OTP.');
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
    if (!idPhoto) {
      setError('Please upload your official college physical ID card photo.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('full_name', fullName);
      formData.append('password', password);
      formData.append('batch', batch);
      formData.append('requested_year', requestedYear);
      formData.append('crn_or_roll_number', crn);
      formData.append('role', role);
      formData.append('otp', otp);
      formData.append('id_card', idPhoto);

      const res = await api.signup(formData);
      setAuthToken(res.access_token);
      setCurrentUser(res.user);
      onSignUpSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Registration failed. Check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl">
        <div className="text-center mb-5">
          <div className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white font-bold text-lg mb-2 shadow-lg shadow-blue-500/25">
            C
          </div>
          <h2 className="text-xl font-bold text-white">College ID Verification Sign Up</h2>
          <p className="text-xs text-slate-400">One ID / CRN = One Account • Admin Verified</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name & CRN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ananya Sen"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CRN / Roll Number</label>
              <input
                type="text"
                required
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
                placeholder="e.g. CRN-2026-105"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Email & OTP */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">College Email Address</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@apex.edu"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 font-semibold text-xs border border-blue-500/40 whitespace-nowrap"
              >
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>
            {devOtpHint && (
              <span className="text-[10px] text-emerald-400 mt-1 block">
                ✓ OTP dispatched to email. Verification Code: <strong className="font-mono">{devOtpHint}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email 6-digit OTP</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Batch & Year */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="STUDENT">Student (UG)</option>
                <option value="PG">Postgrad (PG)</option>
                <option value="FACULTY">Faculty</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Batch</label>
              <input
                type="text"
                required
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="2026-2030"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
              <select
                value={requestedYear}
                onChange={(e) => setRequestedYear(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          {/* ID Card Upload with preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Upload Physical College ID Card Photo
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 text-center bg-slate-950/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="id-card-input"
              />
              <label htmlFor="id-card-input" className="cursor-pointer block">
                {photoPreview ? (
                  <div className="flex flex-col items-center">
                    <img src={photoPreview} alt="Preview" className="h-28 object-contain rounded-lg border border-slate-700 mb-2" />
                    <span className="text-[11px] text-blue-400 font-medium">Click to select different photo</span>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 mx-auto text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate-300 font-semibold">Tap to capture or upload student ID card</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Encrypted at rest • Used solely for admin verification</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/50 text-[11px] text-blue-300 flex items-start gap-2">
            <span className="text-blue-400 font-bold">ℹ</span>
            <span>
              <strong>Gemma 4 Pre-Check Active:</strong> The AI multimodal engine will cross-check your name, batch, and year from the ID photo to provide a match hint. The college admin holds final decision authority and locks your year.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            {loading ? 'Submitting & Running Gemma 4 Pre-Check...' : 'Submit for Admin ID Verification'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Already have an account? <span className="text-blue-400 font-semibold">Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
