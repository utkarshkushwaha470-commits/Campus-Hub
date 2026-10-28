import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminVerificationPage({ user }) {
  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'problem-box' | 'notifications' | 'audit'
  
  // ID Verification Queue State
  const [verifications, setVerifications] = useState([]);
  const [verifFilter, setVerifFilter] = useState('PENDING');
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [overrideYears, setOverrideYears] = useState({});
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);

  // Problem Box Queue State
  const [problemMessages, setProblemMessages] = useState([]);
  const [forwardTargets, setForwardTargets] = useState({});
  const [replyTexts, setReplyTexts] = useState({});

  // Broadcast Alert State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTargetType, setNotifTargetType] = useState('ALL');
  const [notifTargetYear, setNotifTargetYear] = useState(1);
  const [notifTargetBatch, setNotifTargetBatch] = useState('2026-2030');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (activeTab === 'verifications') loadVerifications();
    else if (activeTab === 'problem-box') loadProblemBoxQueue();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, verifFilter]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const data = await api.listAdminVerifications(verifFilter);
      setVerifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProblemBoxQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getProblemBoxAdminQueue();
      setProblemMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await api.getAdminAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (verifId, action) => {
    try {
      const reason = rejectionReasons[verifId] || '';
      const year = overrideYears[verifId] || null;
      const res = await api.reviewVerification(verifId, action, reason, year);
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(null), 3000);
      loadVerifications();
    } catch (err) {
      alert(err.message || 'Verification action error');
    }
  };

  const handleForwardProblem = async (msgId) => {
    const target = forwardTargets[msgId] || 'Dean of Academics';
    try {
      const res = await api.forwardProblemBox(msgId, target);
      setStatusMsg(`✓ Anonymized content dispatched to ${target}. Student identity concealed.`);
      setTimeout(() => setStatusMsg(null), 3500);
      loadProblemBoxQueue();
    } catch (err) {
      alert(err.message || 'Forward error');
    }
  };

  const handleReplyProblem = async (msgId) => {
    const text = replyTexts[msgId] || '';
    if (!text.trim()) {
      alert('Please enter a reply message.');
      return;
    }
    try {
      await api.replyProblemBox(msgId, text);
      setStatusMsg('✓ Official administrative reply delivered to student via platform.');
      setTimeout(() => setStatusMsg(null), 3500);
      loadProblemBoxQueue();
    } catch (err) {
      alert(err.message || 'Reply error');
    }
  };

  const handlePublishNotification = async (e) => {
    e.preventDefault();
    try {
      await api.publishNotification({
        title: notifTitle,
        body: notifBody,
        target_type: notifTargetType,
        target_year: notifTargetType === 'YEAR' ? Number(notifTargetYear) : null,
        target_batch: notifTargetType === 'BATCH' ? notifTargetBatch : null
      });
      setStatusMsg('✓ Notification broadcasted in real time via WebSocket to target campus audience.');
      setNotifTitle('');
      setNotifBody('');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      alert(err.message || 'Failed to publish alert');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/40">
              Administrative Control Deck
            </span>
            <span className="text-xs text-slate-400 font-semibold">• 2FA Authenticated</span>
          </div>
          <h2 className="text-xl font-bold text-white">College Admin Management Portal</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review student IDs with Gemma 4 OCR assist • Problem Box resolution • Real-time alerts • Audit logs
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'verifications' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            ID Queue
          </button>
          <button
            onClick={() => setActiveTab('problem-box')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'problem-box' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Problem Box
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'notifications' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Publish Alerts
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/60 text-amber-300 text-xs shadow-lg">
          {statusMsg}
        </div>
      )}

      {/* TAB 1: ID VERIFICATION QUEUE */}
      {activeTab === 'verifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Student ID Verification Queue</h3>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setVerifFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    verifFilter === st ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading ID queue...</div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No verification records in {verifFilter} status.
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map((v) => (
                <div key={v.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{v.student_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Email: {v.student_email}</span>
                        <span>•</span>
                        <span>CRN: <strong className="text-slate-200">{v.claimed_crn}</strong></span>
                        <span>•</span>
                        <span>Batch: <strong className="text-slate-200">{v.claimed_batch}</strong></span>
                      </div>
                    </div>

                    {/* Gemma 4 Advisory Hint Pill */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        v.ocr_hint_status === 'MATCH'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
                      }`}>
                        Gemma 4 OCR Hint: {v.ocr_hint_status} ({Math.round((v.ocr_match_confidence || 0) * 100)}% conf)
                      </span>
                    </div>
                  </div>

                  {/* AI Pre-Check Details Box */}
                  <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>OCR Extracted Name: <strong className="text-white">{v.ocr_extracted_name || 'N/A'}</strong></div>
                    <div>OCR Extracted Batch: <strong className="text-white">{v.ocr_extracted_batch || 'N/A'}</strong></div>
                    <div>OCR Detected Year: <strong className="text-white">Year {v.ocr_extracted_year || 1}</strong></div>
                  </div>

                  {/* Photo Viewer & Decision Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoModal(`/api/admin/verifications/${v.id}/photo`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Inspect Decrypted ID Photo
                    </button>

                    {v.status === 'PENDING' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={overrideYears[v.id] || v.ocr_extracted_year || 1}
                          onChange={(e) => setOverrideYears({ ...overrideYears, [v.id]: Number(e.target.value) })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
                        >
                          <option value={1}>Lock Year 1</option>
                          <option value={2}>Lock Year 2</option>
                          <option value={3}>Lock Year 3</option>
                          <option value={4}>Lock Year 4</option>
                        </select>

                        <button
                          onClick={() => handleReview(v.id, 'APPROVE')}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Approve & Lock Year
                        </button>

                        <input
                          type="text"
                          placeholder="Rejection reason..."
                          value={rejectionReasons[v.id] || ''}
                          onChange={(e) => setRejectionReasons({ ...rejectionReasons, [v.id]: e.target.value })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs w-44"
                        />

                        <button
                          onClick={() => handleReview(v.id, 'REJECT')}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROBLEM BOX ADMIN QUEUE */}
      {activeTab === 'problem-box' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Confidential Problem Box Review Queue</h3>
            <span className="text-xs text-amber-400 font-semibold">• Only Admin Sees Sender Details</span>
          </div>

          {problemMessages.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">No problem submissions pending review.</p>
          ) : (
            <div className="space-y-4">
              {problemMessages.map((pm) => (
                <div key={pm.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{pm.subject}</span>
                        {pm.ai_safety_flag && (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-extrabold animate-pulse">
                            🚨 URGENT SAFETY ALERT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Addressed to: <strong className="text-amber-400">{pm.recipient_role}</strong> • Status: {pm.status}
                      </p>
                    </div>

                    {/* Sender Identity (Only Admin Eyes) */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-right text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Sender Identity (Admin Confidential)</div>
                      <div className="font-bold text-slate-200">{pm.student_name}</div>
                      <div className="text-[11px] text-slate-400">{pm.student_email} • {pm.student_batch}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {pm.content_text}
                  </p>

                  {/* Decision Actions: Forward Anonymously OR Reply Directly */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                    {/* Option 1: Forward with no name */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-blue-300">Option 1: Forward Anonymously to Authority</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Dean Dr. S. Rao"
                          value={forwardTargets[pm.id] || ''}
                          onChange={(e) => setForwardTargets({ ...forwardTargets, [pm.id]: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        />
                        <button
                          onClick={() => handleForwardProblem(pm.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                        >
                          Forward (No Name)
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Payload is stripped of student name, email, and CRN for full anonymity.
                      </p>
                    </div>

                    {/* Option 2: Reply directly */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-emerald-300">Option 2: Direct Official Reply</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter administrative response..."
                          value={replyTexts[pm.id] || ''}
                          onChange={(e) => setReplyTexts({ ...replyTexts, [pm.id]: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        />
                        <button
                          onClick={() => handleReplyProblem(pm.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Send Reply
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Delivered securely to the student strictly inside the platform.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PUBLISH BROADCAST NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl">
          <h3 className="font-bold text-white text-base mb-1">Publish Real-Time Campus Notification</h3>
          <p className="text-xs text-slate-400 mb-4">
            Broadcasts instantly to connected students via WebSocket and registers in their notification center.
          </p>

          <form onSubmit={handlePublishNotification} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alert Title</label>
              <input
                type="text"
                required
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g. Schedule for Campus Recruitment Drive"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alert Body</label>
              <textarea
                rows={3}
                required
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="Full details of notice or alert..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <select
                  value={notifTargetType}
                  onChange={(e) => setNotifTargetType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Campus (Whole College)</option>
                  <option value="YEAR">Specific Year (1 to 4)</option>
                  <option value="BATCH">Specific Batch</option>
                </select>
              </div>

              {notifTargetType === 'YEAR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Year</label>
                  <select
                    value={notifTargetYear}
                    onChange={(e) => setNotifTargetYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  >
                    <option value={1}>1st Year Students</option>
                    <option value={2}>2nd Year Students</option>
                    <option value={3}>3rd Year Students</option>
                    <option value={4}>4th Year Students</option>
                  </select>
                </div>
              )}

              {notifTargetType === 'BATCH' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Batch Code</label>
                  <input
                    type="text"
                    value={notifTargetBatch}
                    onChange={(e) => setNotifTargetBatch(e.target.value)}
                    placeholder="2026-2030"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
            >
              Publish & Broadcast in Real-Time
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Immutable Administrative Audit Log</h3>
          <p className="text-xs text-slate-400">
            Every administrative view, year promotion, problem box action, and approval is recorded for institutional accountability.
          </p>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-400">{log.action_type}</span>
                  <span className="text-slate-400 ml-2">Entity: {log.target_entity}</span>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">{log.details_json}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {new Date(log.created_at).toLocaleString()} • IP: {log.ip_address}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ID Photo Decryption Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full text-center">
            <h4 className="font-bold text-white text-sm mb-3">Decrypted College Student ID Card</h4>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 mb-4 flex items-center justify-center">
              <img
                src={selectedPhotoModal}
                alt="Decrypted ID"
                className="max-h-72 object-contain rounded"
              />
            </div>
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
