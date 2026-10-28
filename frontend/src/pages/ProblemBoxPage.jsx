import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ProblemBoxPage({ user }) {
  const [recipient, setRecipient] = useState('DEAN');
  const [subject, setSubject] = useState('');
  const [contentText, setContentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMyMessages();
  }, []);

  const loadMyMessages = async () => {
    try {
      const msgs = await api.getMyProblemMessages();
      setMyMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.submitProblemBox(recipient, subject, contentText);
      setSuccessMsg('Your confidential message has been securely submitted to college administration.');
      setSubject('');
      setContentText('');
      loadMyMessages();
    } catch (err) {
      setError(err.message || 'Failed to submit problem box message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Confidentiality Guarantee */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-800/40 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-900 text-amber-200 border border-amber-700/50">
            Confidential Channel
          </span>
          <span className="text-xs text-amber-400 font-semibold">• Direct Institutional Escalation</span>
        </div>
        <h2 className="text-xl font-bold text-white">Problem Box</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Submit confidential concerns, ragging alerts, harassment reports, or infrastructure malfunctions directly to college authorities (Dean, HOD, Director).
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <span className="text-amber-400 font-bold">🔒</span>
            <span>Identity strictly concealed from peers and non-admins</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <span className="text-blue-400 font-bold">🛡</span>
            <span>Forwarded to Dean/HOD with 100% anonymized payload</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">💬</span>
            <span>Official responses route strictly via this portal</span>
          </div>
        </div>
      </div>

      {/* Write Message Form */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h3 className="font-bold text-white text-base mb-4">Submit Confidential Message</h3>

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pick Recipient Authority</label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
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
                placeholder="Brief summary of concern..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confidential Message Body</label>
            <textarea
              rows={4}
              required
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="State the facts, dates, location, or equipment details clearly..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <strong>PII-Free AI Safety Check:</strong> Google Gemma 4 automatically scans this text for urgent safety alerts without transmitting your name or email. Urgent safety items rise to the top of the administrative queue.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Transmitting Securely...' : 'Submit Confidential Incident Message'}
          </button>
        </form>
      </div>

      {/* Student's Submissions & Official Replies */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <h3 className="font-bold text-white text-base mb-4">My Submissions & Platform Replies ({myMessages.length})</h3>

        {myMessages.length === 0 ? (
          <p className="text-xs text-slate-500 italic">You have not submitted any messages to Problem Box.</p>
        ) : (
          <div className="space-y-3">
            {myMessages.map((m) => (
              <div key={m.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-amber-400">Addressed To: {m.recipient_role}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                    Status: {m.status}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">{m.subject}</h4>
                <p className="text-xs text-slate-300 mt-1">{m.content_text}</p>

                {/* Admin Platform Response */}
                {m.admin_response_text ? (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200">
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      <span>✓ Official Administration Response:</span>
                      <span className="text-[10px] text-emerald-400 font-normal">
                        ({new Date(m.replied_at).toLocaleString()})
                      </span>
                    </div>
                    <p className="leading-relaxed">{m.admin_response_text}</p>
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] text-slate-500 italic">
                    Waiting for administrative review or authority resolution...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
