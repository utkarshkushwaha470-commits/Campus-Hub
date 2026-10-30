import React, { useState } from 'react';
import { api, setCurrentUser } from '../services/api';

export default function SettingsPage({ user, onUserUpdated }) {
  // Profile State
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [batch, setBatch] = useState(user.batch || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  // Admin Proof State (Only for Admins)
  const isAdmin = user.role === 'ADMIN';
  const [currentProof, setCurrentProof] = useState('');
  const [newProof, setNewProof] = useState('');
  const [confirmProof, setConfirmProof] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofMsg, setProofMsg] = useState(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const updated = await api.updateProfile({
        full_name: fullName,
        email: email,
        batch: batch
      });
      setCurrentUser(updated);
      if (onUserUpdated) onUserUpdated(updated);
      setProfileMsg({ type: 'success', text: '✓ Profile details updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwdLoading(true);
    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setPwdMsg({ type: 'success', text: `✓ ${res.message || 'Password updated successfully.'}` });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleUpdateAdminProof = async (e) => {
    e.preventDefault();
    setProofMsg(null);
    if (!currentProof.trim() || !newProof.trim()) {
      setProofMsg({ type: 'error', text: 'Please fill in both current and new security proof passphrases.' });
      return;
    }
    if (newProof !== confirmProof) {
      setProofMsg({ type: 'error', text: 'New security proof passphrases do not match.' });
      return;
    }
    setProofLoading(true);
    try {
      const res = await api.updateAdminProof(currentProof.trim(), newProof.trim());
      setProofMsg({
        type: 'success',
        text: `✓ ${res.message || 'Admin security proof updated successfully! Future admin logins require this new proof.'}`
      });
      setCurrentProof('');
      setNewProof('');
      setConfirmProof('');
    } catch (err) {
      setProofMsg({ type: 'error', text: err.message || 'Failed to update admin security proof.' });
    } finally {
      setProofLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800/40">
              Account Preferences
            </span>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/40">
                Administrator Privileges
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">Account Settings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your personal profile, institutional credentials, and security clearance passphrases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Profile Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>👤 Profile Information</span>
          </h3>

          {profileMsg && (
            <div className={`p-3 rounded-xl text-xs ${
              profileMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name / Display Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Academic Batch</label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. 2026-2030 or ADMIN-HEAD"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-blue-500"
              />
            </div>

            {/* Read-Only Metadata */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div>CRN / Institutional ID: <strong className="text-slate-200 font-mono">{user.crn_or_roll_number}</strong></div>
              <div>Account Role: <span className="font-bold text-blue-400">{user.role}</span></div>
              {user.locked_year && (
                <div>Academic Year: <span className="font-bold text-amber-400">Year {user.locked_year} (Permanently Locked from ID)</span></div>
              )}
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20"
            >
              {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>🔒 Change Password</span>
          </h3>

          {pwdMsg && (
            <div className={`p-3 rounded-xl text-xs ${
              pwdMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}>
              {pwdMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs"
            >
              {pwdLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Admin Special Security Setting (Change "Proof") */}
      {isAdmin && (
        <div className="bg-gradient-to-b from-slate-900 to-amber-950/20 border border-amber-600/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-bold text-amber-300 text-base">
                  Institutional Administrator Clearance Passphrase ("Proof")
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                This secret passphrase is required whenever logging into the Admin clearance portal. Only Chief Administrators can alter this proof.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold uppercase font-mono">
              Admin Exclusive
            </span>
          </div>

          {proofMsg && (
            <div className={`p-3 rounded-xl text-xs ${
              proofMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}>
              {proofMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateAdminProof} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                Current Security Proof Passphrase <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={currentProof}
                onChange={(e) => setCurrentProof(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                  New Security Proof Passphrase <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newProof}
                  onChange={(e) => setNewProof(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                  Confirm New Proof Passphrase <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmProof}
                  onChange={(e) => setConfirmProof(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={proofLoading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
            >
              {proofLoading ? 'Updating Proof...' : 'Update Admin Security Proof ("Proof")'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
