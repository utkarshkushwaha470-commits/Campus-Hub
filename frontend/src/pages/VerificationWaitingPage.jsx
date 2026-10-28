import React, { useState } from 'react';
import { api, setCurrentUser } from '../services/api';

export default function VerificationWaitingPage({ user, onRefreshUser, onLogout }) {
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const isRejected = user.status === 'REJECTED';

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!newPhoto) {
      setError('Please choose a clearer photograph of your student ID.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('id_card', newPhoto);
      const res = await api.resubmitId(formData);
      setMsg(res.message);
      // Refresh current user data
      const updatedUser = await api.getMe();
      setCurrentUser(updatedUser);
      onRefreshUser(updatedUser);
    } catch (err) {
      setError(err.message || 'Resubmission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl text-center">
        {isRejected ? (
          <div>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">ID Card Rejected</h2>
            <div className="my-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs text-left">
              <strong>Admin Reason:</strong> The administrator reviewed your submitted photo and rejected it. Please ensure all text, your name, and batch year are clearly readable with no glare.
            </div>

            {msg && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
                {msg}
              </div>
            )}
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleResubmit} className="space-y-3 mt-4 text-left">
              <label className="block text-xs font-semibold text-slate-300">
                Resubmit Clear College ID Card Photo
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center bg-slate-950/60">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setNewPhoto(f);
                      setPhotoPreview(URL.createObjectURL(f));
                    }
                  }}
                  id="resubmit-file"
                  className="hidden"
                />
                <label htmlFor="resubmit-file" className="cursor-pointer block">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-28 mx-auto object-contain rounded border border-slate-700" />
                  ) : (
                    <span className="text-xs text-blue-400 font-semibold">Tap to select replacement ID photo</span>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all disabled:opacity-50"
              >
                {loading ? 'Resubmitting...' : 'Upload & Resubmit for Review'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Verification in Progress</h2>
            <p className="text-xs text-slate-400 mt-2">
              Welcome, <strong className="text-slate-200">{user.full_name}</strong>! Your ID card photo and enrollment details (CRN: <span className="font-mono text-slate-300">{user.crn_or_roll_number}</span>) have been received.
            </p>

            <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Account Status: <strong>PENDING REVIEW</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>AI Assist: Gemma 4 OCR Pre-Check Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Final Authority: Waiting for college admin review</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              For security, protected campus sections remain locked until an administrator approves your ID. Check back shortly.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const u = await api.getMe();
                    setCurrentUser(u);
                    onRefreshUser(u);
                  } catch (e) {
                    console.log(e);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Check Approval Status
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 text-xs font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
