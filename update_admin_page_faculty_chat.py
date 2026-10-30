import os
import re

page_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\pages\AdminVerificationPage.jsx"
with open(page_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. State for Chief Admin <-> Faculty Chat
faculty_chat_state = """  // Chief Admin Direct Chat with Faculty State
  const [facultyChatsList, setFacultyChatsList] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [activeFacultyThread, setActiveFacultyThread] = useState(null);
  const [chiefReplyText, setChiefReplyText] = useState('');
  const [facultyChatLoading, setFacultyChatLoading] = useState(false);
  const [sendingChiefReply, setSendingChiefReply] = useState(false);
"""

if "facultyChatsList" not in code:
    code = code.replace(
        "  // Faculty Appointment State (Chief Admin Exclusive)",
        faculty_chat_state + "\n  // Faculty Appointment State (Chief Admin Exclusive)"
    )

# 2. Add functions to load faculty chats and send reply
faculty_chat_funcs = """  const loadFacultyChats = async () => {
    try {
      const data = await api.getFacultyChatsForChief();
      setFacultyChatsList(data);
      if (data.length > 0 && !selectedFacultyId) {
        openFacultyThread(data[0].faculty_id);
      }
    } catch (err) {
      console.error('Error loading faculty chats:', err);
    }
  };

  const openFacultyThread = async (facId) => {
    setSelectedFacultyId(facId);
    setFacultyChatLoading(true);
    try {
      const thread = await api.getFacultyChatThread(facId);
      setActiveFacultyThread(thread);
    } catch (err) {
      console.error('Error loading faculty thread:', err);
    } finally {
      setFacultyChatLoading(false);
    }
  };

  const handleSendChiefReply = async (e) => {
    e.preventDefault();
    if (!chiefReplyText.trim() || !selectedFacultyId || sendingChiefReply) return;
    setSendingChiefReply(true);
    try {
      await api.replyToFaculty(selectedFacultyId, { message: chiefReplyText.trim() });
      setChiefReplyText('');
      await openFacultyThread(selectedFacultyId);
      await loadFacultyChats();
    } catch (err) {
      alert(err.message || 'Failed to send reply to Faculty member.');
    } finally {
      setSendingChiefReply(false);
    }
  };
"""

if "loadFacultyChats" not in code:
    code = code.replace("  const handleAppointFaculty = async (e) => {", faculty_chat_funcs + "\n  const handleAppointFaculty = async (e) => {")

# 3. Rename button from "Appoint Faculty Directly" to "Appoint New Admit"
# And REMOVE "Appoint New Administrator" button!
old_buttons = """              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowFacultyModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>🎓</span>
                  <span>Appoint Faculty Directly</span>
                </button>
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>👑</span>
                  <span>Appoint New Administrator</span>
                </button>
              </div>"""

new_buttons = """              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowFacultyModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>🎓</span>
                  <span>Appoint New Admit</span>
                </button>
              </div>"""

code = code.replace(old_buttons, new_buttons)

# 4. Add "Direct Chat with Faculty" tab button next to tabs
tab_button = """          {isChiefAdmin && (
            <button
              onClick={() => { setActiveTab('faculty-chat'); loadFacultyChats(); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'faculty-chat'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/40'
              }`}
            >
              <span>💬 Direct Chat with Faculty</span>
            </button>
          )}"""

if "Direct Chat with Faculty" not in code:
    code = code.replace(
        "          <button\n            onClick={() => setActiveTab('audit')}",
        tab_button + "\n          <button\n            onClick={() => setActiveTab('audit')}"
    )

# 5. Add "faculty-chat" tab content
faculty_chat_view = """      {/* ================= TAB: DIRECT CHAT WITH FACULTY (CHIEF ADMIN EXCLUSIVE) ================= */}
      {activeTab === 'faculty-chat' && isChiefAdmin && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/50 p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-sm">
                Chief Administrator Exclusive
              </span>
              <span className="text-xs text-purple-300 font-semibold">• Direct Faculty Line</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <span>💬 Direct Chat with Faculty</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time consultation and academic messages sent directly by college faculty members to Chief Administrator <strong>UTKARSH KUSHWAHA</strong>. You can review and reply directly to any professor or department mentor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden h-[540px]">
            {/* Faculty List (Left Col) */}
            <div className="border-r border-slate-800 flex flex-col bg-slate-950/40">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Faculty Members</span>
                <button onClick={loadFacultyChats} className="text-xs text-purple-400 hover:text-purple-300 font-semibold">🔄 Refresh</button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {facultyChatsList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No faculty accounts found in the institution yet.
                  </div>
                ) : (
                  facultyChatsList.map((f) => (
                    <div
                      key={f.faculty_id}
                      onClick={() => openFacultyThread(f.faculty_id)}
                      className={`p-3.5 cursor-pointer transition-all ${
                        selectedFacultyId === f.faculty_id
                          ? 'bg-purple-950/50 border-l-4 border-purple-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{f.faculty_name}</span>
                        {f.unread_count > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                            {f.unread_count} new
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-purple-300 font-medium truncate">{f.department || 'Faculty Member'}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-1">
                        {f.last_message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Conversation Thread (Right 2 Cols) */}
            <div className="md:col-span-2 flex flex-col h-full bg-slate-950/70">
              {!activeFacultyThread ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-3xl mb-2">💬</span>
                  <div className="text-sm font-bold text-slate-300">Select a Faculty Member</div>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Choose any faculty member on the left to read their direct messages and reply.
                  </p>
                </div>
              ) : (
                <>
                  {/* Thread Header */}
                  <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white">{activeFacultyThread.faculty.full_name}</div>
                      <div className="text-[11px] text-purple-300 font-medium">{activeFacultyThread.faculty.department} • {activeFacultyThread.faculty.email}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                      Verified Faculty
                    </span>
                  </div>

                  {/* Messages Bubble View */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {facultyChatLoading ? (
                      <div className="text-xs text-slate-500 text-center py-8">Loading messages...</div>
                    ) : activeFacultyThread.messages.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-12">
                        No messages sent by this faculty member yet. Send a message below to start the consultation.
                      </div>
                    ) : (
                      activeFacultyThread.messages.map((m) => {
                        const isChief = m.is_chief;
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isChief ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5 px-1">
                              <span className="text-[10px] font-bold text-slate-400">
                                {isChief ? '👑 You (Chief Admin)' : m.sender_name}
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div
                              className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow ${
                                isChief
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-semibold rounded-tr-none'
                                  : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                              }`}
                            >
                              {m.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chief Admin Reply Box */}
                  <form onSubmit={handleSendChiefReply} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={chiefReplyText}
                      onChange={(e) => setChiefReplyText(e.target.value)}
                      placeholder={`Reply directly to ${activeFacultyThread.faculty.full_name}...`}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!chiefReplyText.trim() || sendingChiefReply}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
                    >
                      {sendingChiefReply ? 'Sending...' : 'Reply to Faculty ➔'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
"""

if "TAB: DIRECT CHAT WITH FACULTY" not in code:
    code = code.replace(
        "{/* ================= TAB: SETTINGS & PROOF PHRASE ================= */}",
        faculty_chat_view + "\n      {/* ================= TAB: SETTINGS & PROOF PHRASE ================= */}"
    )

# 6. Update Appoint Faculty Modal title and labels to "Appoint New Admit"
code = code.replace("Appoint Faculty Member Directly", "Appoint New Admit")
code = code.replace("Appoint & Activate Faculty", "Appoint & Activate New Admit")
code = code.replace("Faculty Legal Name", "Full Legal Name")

# 7. Remove Appoint New Administrator Modal completely
admin_modal_regex = r"\{\/\* ================= MODAL: APPOINT NEW ADMINISTRATOR.*?\{\/\* ================= MODAL: CREATE CAMPUS GROUP"
code = re.sub(admin_modal_regex, "{/* ================= MODAL: CREATE CAMPUS GROUP", code, flags=re.DOTALL)

with open(page_path, "w", encoding="utf-8") as f:
    f.write(code)

print("AdminVerificationPage.jsx updated successfully!")
