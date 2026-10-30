import os
import re

page_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\pages\AdminVerificationPage.jsx"
with open(page_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Dispatch States
dispatch_states = """  // Faculty Dispatches State (Chief Admin Inbox & Faculty Sent View)
  const [dispatchesList, setDispatchesList] = useState([]);
  const [unreadDispatchesCount, setUnreadDispatchesCount] = useState(0);
  const [dispatchesLoading, setDispatchesLoading] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [dispatchReplyText, setDispatchReplyText] = useState('');
  const [replyingDispatch, setReplyingDispatch] = useState(false);
  const [mySentDispatchesList, setMySentDispatchesList] = useState([]);
"""

if "dispatchesList" not in code:
    code = code.replace(
        "  // Chief Admin Direct Chat with Faculty State",
        dispatch_states + "\n  // Chief Admin Direct Chat with Faculty State"
    )

# 2. Add Dispatch Handlers
dispatch_funcs = """  const loadDispatches = async () => {
    setDispatchesLoading(true);
    try {
      const data = await api.getFacultyDispatches();
      setDispatchesList(data.dispatches || []);
      setUnreadDispatchesCount(data.unread_count || 0);
    } catch (err) {
      console.error('Error loading dispatches:', err);
    } finally {
      setDispatchesLoading(false);
    }
  };

  const loadMySentDispatches = async () => {
    try {
      const data = await api.getMySentDispatches();
      setMySentDispatchesList(data || []);
    } catch (err) {
      console.error('Error loading my sent dispatches:', err);
    }
  };

  const handleReplyDispatch = async (dispatchId) => {
    if (!dispatchReplyText.trim() || replyingDispatch) return;
    setReplyingDispatch(true);
    try {
      const res = await api.replyToFacultyDispatch(dispatchId, { reply: dispatchReplyText.trim() });
      showStatus(res.message);
      setDispatchReplyText('');
      setActiveReplyId(null);
      await loadDispatches();
    } catch (err) {
      alert(err.message || 'Failed to dispatch official response.');
    } finally {
      setReplyingDispatch(false);
    }
  };

  const handleMarkDispatchRead = async (dispatchId) => {
    try {
      await api.markDispatchRead(dispatchId);
      loadDispatches();
    } catch (err) {}
  };
"""

if "loadDispatches" not in code:
    code = code.replace("  const loadFacultyChats = async () => {", dispatch_funcs + "\n  const loadFacultyChats = async () => {")

# 3. In handleSendChiefMessage, call loadMySentDispatches after sending
code = code.replace(
    "setChiefSentDispatches([\n        {\n          id: Date.now(),",
    "loadMySentDispatches();\n      setChiefSentDispatches([\n        {\n          id: Date.now(),"
)

# 4. Add Tab button in Chief Admin Navigation
# Next to "Administrator Deck" and "Admins Work Oversight"
dispatch_tab_btn = """              <button
                onClick={() => { setActiveTab('dispatches'); loadDispatches(); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
                  activeTab === 'dispatches'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-lg font-black'
                    : 'text-amber-300 hover:text-white hover:bg-amber-950/40 border border-amber-500/40'
                }`}
              >
                <span>📥</span>
                <span>Faculty Priority Dispatches</span>
                {unreadDispatchesCount > 0 && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500"></span>
                  </span>
                )}
                {unreadDispatchesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black ml-0.5">
                    {unreadDispatchesCount} New
                  </span>
                )}
              </button>"""

if "Faculty Priority Dispatches" not in code:
    code = code.replace(
        "<span>Admins Work Oversight</span>\n              </button>",
        "<span>Admins Work Oversight</span>\n              </button>\n" + dispatch_tab_btn
    )

# 5. Add Tab View: "dispatches" for Chief Administrator
dispatch_view = """      {/* ================= TAB: FACULTY PRIORITY DISPATCHES (CHIEF ADMIN INBOX) ================= */}
      {activeTab === 'dispatches' && isChiefAdmin && (
        <div className="space-y-5">
          {/* Executive Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 border border-amber-500/60 p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                  Priority Inbox
                </span>
                <span className="text-xs text-amber-300 font-bold">• Chief Administrator Authority</span>
              </div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>📥 Faculty & Staff Priority Dispatches</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Direct dispatches, academic escalations, and urgent incident reports transmitted by college faculty and sub-administrators to Chief Administrator <strong>UTKARSH KUSHWAHA</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Dispatches</div>
                <div className="text-base font-black text-white">{dispatchesList.length}</div>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-center">
                <div className="text-[10px] uppercase font-bold text-amber-300">Pending Review</div>
                <div className="text-base font-black text-amber-400">{unreadDispatchesCount}</div>
              </div>
              <button
                onClick={loadDispatches}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Refresh Dispatches"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Dispatches Feed */}
          {dispatchesLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              Loading priority dispatches...
            </div>
          ) : dispatchesList.length === 0 ? (
            <div className="p-16 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-4xl">📭</span>
              <h4 className="text-sm font-bold text-slate-200">No Dispatches in Chief Admin Inbox</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When faculty members send urgent dispatches or reports through their portal, they will instantly appear here for your executive review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dispatchesList.map((d) => {
                const isUnread = !d.is_read;
                const isReplied = Boolean(d.chief_reply);

                return (
                  <div
                    key={d.id}
                    className={`rounded-2xl border transition-all p-5 shadow-lg ${
                      isUnread
                        ? 'bg-slate-900 border-amber-500/60 shadow-amber-500/5 ring-1 ring-amber-500/30'
                        : 'bg-slate-900/80 border-slate-800/80'
                    }`}
                  >
                    {/* Top Row: Sender Info & Badges */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-sm shadow">
                          {d.sender_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{d.sender_name}</span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-purple-300 border border-purple-600/30">
                              {d.sender_department || d.sender_role}
                            </span>
                            {isUnread && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black animate-pulse">
                                NEW DISPATCH
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{d.sender_email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <span className="text-[11px] text-slate-500">
                          {new Date(d.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isReplied ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            ✓ Answered
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                            Awaiting Response
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Subject & Message Body */}
                    <div className="py-3.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Subject:</span>
                        <h4 className="text-sm font-bold text-white">{d.subject}</h4>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {d.message}
                      </div>
                    </div>

                    {/* Chief Administrator's Existing Reply (if already replied) */}
                    {isReplied && (
                      <div className="mt-2 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-950 border border-amber-500/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5">
                            <span>👑 Official Response from Chief Administrator Utkarsh Kushwaha</span>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {d.replied_at && new Date(d.replied_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed pl-1">
                          "{d.chief_reply}"
                        </p>
                      </div>
                    )}

                    {/* Action Bar & Reply Drawer */}
                    <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <button
                            onClick={() => handleMarkDispatchRead(d.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                          >
                            Mark Reviewed
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (activeReplyId === d.id) {
                              setActiveReplyId(null);
                            } else {
                              setActiveReplyId(d.id);
                              setDispatchReplyText(d.chief_reply || '');
                            }
                          }}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                        >
                          <span>✉️</span>
                          <span>{isReplied ? 'Update Response' : 'Reply to Faculty'}</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-500">
                        Dispatch ID: <code className="text-slate-400">{d.id.substring(0, 8)}</code>
                      </span>
                    </div>

                    {/* Inline Reply Input Box */}
                    {activeReplyId === d.id && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-amber-500/50 space-y-2.5 animate-fadeIn">
                        <label className="block text-xs font-bold text-amber-300">
                          Official Reply from Chief Administrator Utkarsh Kushwaha:
                        </label>
                        <textarea
                          rows={3}
                          value={dispatchReplyText}
                          onChange={(e) => setDispatchReplyText(e.target.value)}
                          placeholder={`Write official reply or instructions directly to ${d.sender_name}...`}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!dispatchReplyText.trim() || replyingDispatch}
                            onClick={() => handleReplyDispatch(d.id)}
                            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
                          >
                            {replyingDispatch ? 'Sending...' : 'Send Official Response ➔'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
"""

if "TAB: FACULTY PRIORITY DISPATCHES" not in code:
    code = code.replace(
        "{/* ================= TAB: SETTINGS & PROOF PHRASE ================= */}",
        dispatch_view + "\n      {/* ================= TAB: SETTINGS & PROOF PHRASE ================= */}"
    )

# 6. Update the Sub-Admin / Faculty Dispatch form to display sent dispatches with Chief Admin's official replies
old_sent_history = """          {chiefSentDispatches.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300">Sent Dispatches to Chief Admin</h4>
              {chiefSentDispatches.map((d) => (
                <div key={d.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">{d.subject}</span>
                    <span className="text-[10px] text-slate-500">{d.time}</span>
                  </div>
                  <p className="text-slate-400">{d.message}</p>
                  <div className="text-[10px] text-emerald-400 font-semibold">✓ Delivered to Utkarsh Kushwaha inbox</div>
                </div>
              ))}
            </div>
          )}"""

new_sent_history = """          {/* Sent Dispatches & Chief Administrator Official Responses */}
          <div className="space-y-3 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>📋</span>
                <span>My Sent Dispatches & Official Chief Admin Responses</span>
              </h4>
              <button
                type="button"
                onClick={loadMySentDispatches}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
              >
                🔄 Refresh Responses
              </button>
            </div>

            {mySentDispatchesList.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-500 text-center">
                Your sent dispatches and Chief Admin replies will be listed here.
              </div>
            ) : (
              <div className="space-y-3">
                {mySentDispatchesList.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="font-bold text-purple-300 text-xs">{d.subject}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(d.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed pl-1">{d.message}</p>

                    {d.chief_reply ? (
                      <div className="mt-2 p-3 rounded-xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/50 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5">
                            <span>👑 Official Response from Chief Administrator Utkarsh Kushwaha:</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {d.replied_at && new Date(d.replied_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-amber-100 font-medium pl-1">
                          "{d.chief_reply}"
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                        <span>✓</span>
                        <span>Delivered to Chief Administrator Utkarsh Kushwaha • Awaiting Executive Review</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>"""

code = code.replace(old_sent_history, new_sent_history)

# Also call loadMySentDispatches on mount or when switching to chief-chat tab
if "loadMySentDispatches();" not in code:
    code = code.replace(
        "setActiveTab('chief-chat');",
        "setActiveTab('chief-chat'); loadMySentDispatches();"
    )

with open(page_path, "w", encoding="utf-8") as f:
    f.write(code)

print("AdminVerificationPage.jsx updated with Faculty Priority Dispatches for Chief Admin!")
