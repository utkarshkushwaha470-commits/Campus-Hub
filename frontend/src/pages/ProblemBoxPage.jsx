import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ProblemBoxPage({ user }) {
  const isAdmin = user?.role === 'ADMIN' || Boolean(user?.is_chief_admin) || user?.email?.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com';

  // Student State
  const [recipient, setRecipient] = useState('DEAN');
  const [subject, setSubject] = useState('');
  const [contentText, setContentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // Admin State
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFilter, setAdminFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'SAFETY' | 'FORWARDED' | 'REPLIED'
  const [adminSearch, setAdminSearch] = useState('');
  const [forwardTargets, setForwardTargets] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [actionSuccess, setActionSuccess] = useState(null);
  const [showTestSubmit, setShowTestSubmit] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Initial Load
  useEffect(() => {
    if (isAdmin) {
      loadAdminQueue();
      const interval = setInterval(loadAdminQueue, 3500);
      return () => clearInterval(interval);
    } else {
      loadMyMessages();
      const interval = setInterval(loadMyMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const loadMyMessages = async () => {
    try {
      const msgs = await api.getMyProblemMessages();
      setMyMessages(msgs || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load my problem messages:', err);
    }
  };

  const loadAdminQueue = async () => {
    try {
      const msgs = await api.getProblemBoxAdminQueue();
      setAdminMessages(msgs || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin problem queue:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.submitProblemBox(recipient, subject, contentText);
      setSuccessMsg('✓ Confidential grievance securely submitted to college administration.');
      setSubject('');
      setContentText('');
      if (isAdmin) {
        loadAdminQueue();
      } else {
        loadMyMessages();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit problem box message.');
    } finally {
      setLoading(false);
    }
  };

  const handleForwardProblem = async (msgId) => {
    const target = forwardTargets[msgId] || 'Dean of Academics & Student Welfare';
    try {
      const res = await api.forwardProblemBox(msgId, target);
      setActionSuccess(`✓ Anonymized grievance dispatched to ${target}`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadAdminQueue();
    } catch (err) {
      alert(err.message || 'Failed to forward grievance.');
    }
  };

  const handleReplyProblem = async (msgId) => {
    const text = replyTexts[msgId];
    if (!text || !text.trim()) {
      alert('Please enter an official response message for the student.');
      return;
    }
    try {
      await api.replyProblemBox(msgId, text.trim());
      setActionSuccess('✓ Official platform reply delivered to student');
      setReplyTexts(prev => ({ ...prev, [msgId]: '' }));
      setTimeout(() => setActionSuccess(null), 4000);
      loadAdminQueue();
    } catch (err) {
      alert(err.message || 'Failed to deliver response.');
    }
  };

  // Admin Filtered List
  const filteredAdminMessages = adminMessages.filter(m => {
    if (adminFilter === 'PENDING') return m.status === 'SUBMITTED';
    if (adminFilter === 'SAFETY') return Boolean(m.ai_safety_flag);
    if (adminFilter === 'FORWARDED') return m.status === 'FORWARDED_ANONYMOUSLY';
    if (adminFilter === 'REPLIED') return m.status === 'REPLIED';
    return true;
  }).filter(m => {
    if (!adminSearch.trim()) return true;
    const q = adminSearch.toLowerCase();
    const name = (m.student_name || m.sender_name || '').toLowerCase();
    const email = (m.student_email || m.sender_email || '').toLowerCase();
    const subj = (m.subject || '').toLowerCase();
    const text = (m.content_text || '').toLowerCase();
    const crn = (m.sender_crn || m.student_batch || '').toLowerCase();
    return name.includes(q) || email.includes(q) || subj.includes(q) || text.includes(q) || crn.includes(q);
  });

  const pendingCount = adminMessages.filter(m => m.status === 'SUBMITTED').length;
  const safetyCount = adminMessages.filter(m => Boolean(m.ai_safety_flag)).length;
  const repliedCount = adminMessages.filter(m => m.status === 'REPLIED').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* ===================== ADMIN VIEW ===================== */}
      {isAdmin ? (
        <div className="space-y-6">
          {/* Executive Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Chief Administrator Queue
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Sync Active
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>📬 Problem Box Resolution Center</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Confidential institutional grievances submitted by students of <span className="text-indigo-400 font-semibold">Allenhouse Institute of Technology</span>. 
                  Student identity is visible strictly to you as Admin. Forwarding strips identity for 100% dean anonymity.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestSubmit(!showTestSubmit)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                >
                  <span>✍️</span>
                  <span>{showTestSubmit ? 'Hide Test Form' : 'Submit Test Grievance'}</span>
                </button>
                <button
                  type="button"
                  onClick={loadAdminQueue}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <span>🔄</span>
                  <span>Refresh Queue</span>
                </button>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
              <div 
                onClick={() => setAdminFilter('ALL')}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  adminFilter === 'ALL'
                    ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Grievances</div>
                <div className="text-2xl font-black text-white mt-1">{adminMessages.length}</div>
              </div>

              <div 
                onClick={() => setAdminFilter('PENDING')}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  adminFilter === 'PENDING'
                    ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Pending Action</span>
                  {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
                </div>
                <div className="text-2xl font-black text-amber-300 mt-1">{pendingCount}</div>
              </div>

              <div 
                onClick={() => setAdminFilter('SAFETY')}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  adminFilter === 'SAFETY'
                    ? 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                  <span>AI Safety Alerts</span>
                  {safetyCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>}
                </div>
                <div className="text-2xl font-black text-rose-300 mt-1">{safetyCount}</div>
              </div>

              <div 
                onClick={() => setAdminFilter('REPLIED')}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  adminFilter === 'REPLIED'
                    ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Replied & Closed</div>
                <div className="text-2xl font-black text-emerald-300 mt-1">{repliedCount}</div>
              </div>
            </div>
          </div>

          {/* Action Success Alert */}
          {actionSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 animate-fadeIn">
              <span className="text-base">✓</span>
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Collapsible Test Submission Form */}
          {showTestSubmit && (
            <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/40 p-6 shadow-xl backdrop-blur-xl animate-fadeIn">
              <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                <span>✍️ Submit Test Grievance (To Verify Live Flow)</span>
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Target Authority</label>
                    <select
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="DEAN">Dean of Academics & Student Welfare</option>
                      <option value="HOD">Head of Department (HOD)</option>
                      <option value="DIRECTOR">College Director / Principal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief problem summary..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Grievance Description</label>
                  <textarea
                    rows={3}
                    required
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder="Details of complaint..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Send Grievance to Queue'}
                </button>
              </form>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: `All (${adminMessages.length})` },
                { id: 'PENDING', label: `Pending (${pendingCount})` },
                { id: 'SAFETY', label: `Safety Alert (${safetyCount})` },
                { id: 'FORWARDED', label: 'Forwarded' },
                { id: 'REPLIED', label: 'Replied' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAdminFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    adminFilter === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <input
                type="text"
                placeholder="Search student, subject..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
            </div>
          </div>

          {/* Incidents List */}
          {filteredAdminMessages.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
              <div className="text-4xl mb-3">📬</div>
              <h3 className="text-base font-bold text-slate-200">No Grievances Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {adminSearch ? 'No messages match your search filter.' : 'All incoming student grievances have been attended to! When students submit, they will appear here in real time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdminMessages.map((msg) => {
                const studentName = msg.student_name || msg.sender_name || 'Anonymous Student';
                const studentEmail = msg.student_email || msg.sender_email || '';
                const studentCrn = msg.sender_crn || msg.student_batch || '';
                const studentYear = msg.student_year ? `Year ${msg.student_year}` : '';

                return (
                  <div 
                    key={msg.id} 
                    className="p-5 md:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 shadow-xl space-y-4 backdrop-blur-xl"
                  >
                    {/* Top Row: Meta, Target, Safety */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Target: {msg.recipient_role}
                        </span>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          msg.status === 'REPLIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : msg.status === 'FORWARDED_ANONYMOUSLY'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {msg.status === 'FORWARDED_ANONYMOUSLY' ? 'FORWARDED' : msg.status}
                        </span>

                        {msg.ai_safety_flag ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 shadow-md shadow-red-600/30 animate-pulse">
                            <span>⚠️</span>
                            <span>URGENT: {msg.ai_safety_category || 'SAFETY CONCERN'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
                            🛡️ Gemma 4: Standard Grievance
                          </span>
                        )}
                      </div>

                      {/* Student Identification (Confidential Admin View) */}
                      <div className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-left sm:text-right">
                        <div className="text-xs font-bold text-amber-300 flex items-center sm:justify-end gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-black">
                            Student Eyes Only
                          </span>
                          <span>{studentName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {studentEmail} {studentCrn ? `• ${studentCrn}` : ''} {studentYear ? `• ${studentYear}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Subject & Body */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300 text-sm">Subject: {msg.subject}</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {msg.content_text}
                      </div>
                    </div>

                    {/* Previous Forward or Reply history */}
                    {msg.forwarded_to_name && (
                      <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 flex items-center justify-between">
                        <span className="font-medium">
                          ✓ Forwarded Anonymously to <strong className="text-white">{msg.forwarded_to_name}</strong>
                        </span>
                        {msg.forwarded_at && (
                          <span className="text-[10px] text-blue-400 font-mono">
                            {new Date(msg.forwarded_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    {msg.admin_response_text && (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="text-emerald-400">✓</span>
                            <span>Official Admin Response Sent to Student:</span>
                          </span>
                          {msg.replied_at && (
                            <span className="text-[10px] text-emerald-400 font-mono font-normal">
                              {new Date(msg.replied_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed pl-4">
                          "{msg.admin_response_text}"
                        </p>
                      </div>
                    )}

                    {/* Action Controls */}
                    <div className="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-t border-slate-800/60">
                      {/* Forward Action */}
                      <div className="flex items-center gap-2">
                        <select
                          value={forwardTargets[msg.id] || 'Dean of Academics & Student Welfare'}
                          onChange={(e) => setForwardTargets({ ...forwardTargets, [msg.id]: e.target.value })}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Dean of Academics & Student Welfare">Dean of Academics & Student Welfare</option>
                          <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                          <option value="College Director / Principal">College Director / Principal</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleForwardProblem(msg.id)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 whitespace-nowrap transition-all"
                        >
                          Forward Anonymously
                        </button>
                      </div>

                      {/* Direct Official Reply */}
                      <div className="flex items-center gap-2 flex-1 md:max-w-md">
                        <input
                          type="text"
                          placeholder="Type official reply to student..."
                          value={replyTexts[msg.id] || ''}
                          onChange={(e) => setReplyTexts({ ...replyTexts, [msg.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleReplyProblem(msg.id);
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs flex-1 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleReplyProblem(msg.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 whitespace-nowrap transition-all"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ===================== STUDENT VIEW ===================== */
        <div className="space-y-6">
          {/* Header & Confidentiality Guarantee */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-600/40 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                100% Confidential Channel
              </span>
              <span className="text-xs text-amber-400 font-semibold">• Direct Institutional Escalation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Problem Box
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Submit confidential concerns, hostel mesh complaints, ragging alerts, harassment reports, or lab equipment malfunctions directly to college administration at <span className="text-amber-400 font-semibold">Allenhouse Institute of Technology</span>.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
                <span className="text-amber-400 text-base">🔒</span>
                <span>Identity strictly hidden from students and faculty</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
                <span className="text-blue-400 text-base">🛡️</span>
                <span>Forwarded to Dean/HOD with 100% anonymized payload</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
                <span className="text-emerald-400 text-base">💬</span>
                <span>Official responses route strictly via this portal</span>
              </div>
            </div>
          </div>

          {/* Student Submission Form */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <h3 className="font-bold text-white text-base md:text-lg mb-4 flex items-center gap-2">
              <span>✍️ Submit Confidential Grievance</span>
            </h3>

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-semibold">
                {successMsg}
              </div>
            )}
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pick Recipient Authority</label>
                  <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="DEAN">Dean of Academics & Student Welfare</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="DIRECTOR">College Director / Principal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of concern..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confidential Message Body</label>
                <textarea
                  rows={4}
                  required
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="State the facts, dates, location, or equipment details clearly..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400">
                <strong className="text-amber-400">PII-Free AI Safety Check:</strong> Google Gemma 4 automatically scans this text for urgent safety alerts without transmitting your name or email. Urgent safety items rise to the top of the administrative queue.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? 'Transmitting Securely...' : 'Submit Confidential Incident Message'}
              </button>
            </form>
          </div>

          {/* Student's Submissions & Official Replies */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                <span>📋 My Submissions & Platform Replies ({myMessages.length})</span>
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Auto-Refreshes</span>
              </div>
            </div>

            {myMessages.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-3xl mb-2">📬</div>
                <p className="text-xs text-slate-400">You have not submitted any messages to Problem Box yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myMessages.map((m) => (
                  <div key={m.id} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-amber-400">Addressed To: {m.recipient_role}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        m.status === 'REPLIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : m.status === 'FORWARDED_ANONYMOUSLY'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {m.status === 'REPLIED' ? '✓ REPLIED BY ADMIN' : m.status === 'FORWARDED_ANONYMOUSLY' ? 'ESCALATED ANONYMOUSLY' : 'IN REVIEW'}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{m.subject}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{m.content_text}</p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Submitted: {new Date(m.created_at).toLocaleString()}
                    </div>

                    {/* Official Response */}
                    {m.admin_response_text ? (
                      <div className="mt-3 p-4 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-xs text-emerald-200 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>Official Administration Response:</span>
                          </span>
                          {m.replied_at && (
                            <span className="text-[10px] text-emerald-400 font-mono font-normal">
                              ({new Date(m.replied_at).toLocaleString()})
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed text-slate-200 mt-1 pl-3 border-l-2 border-emerald-500">
                          {m.admin_response_text}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-amber-400/80 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>Under confidential administrative review. Official reply will appear here.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
