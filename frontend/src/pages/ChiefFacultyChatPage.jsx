import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function ChiefFacultyChatPage({ user }) {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Poll faculty list every 3 seconds for new incoming messages from faculty
  useEffect(() => {
    loadFacultyList();
    const interval = setInterval(loadFacultyList, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll active thread every 3 seconds when a faculty is selected
  useEffect(() => {
    if (!selectedFaculty) return;
    loadThread(selectedFaculty.faculty_id, false);
    const interval = setInterval(() => {
      loadThread(selectedFaculty.faculty_id, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedFaculty?.faculty_id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadFacultyList = async () => {
    try {
      const data = await api.getFacultyChatsForChief();
      setFacultyList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading faculty chat list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadThread = async (facultyId, showLoader = true) => {
    if (showLoader) setLoadingThread(true);
    try {
      const res = await api.getFacultyChatThread(facultyId);
      if (res && res.messages) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('Error loading chat thread:', err);
    } finally {
      if (showLoader) setLoadingThread(false);
    }
  };

  const handleSelectFaculty = (f) => {
    setSelectedFaculty(f);
    loadThread(f.faculty_id, true);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || !selectedFaculty) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await api.replyToFaculty(selectedFaculty.faculty_id, { message: textToSend });
      await loadThread(selectedFaculty.faculty_id, false);
      await loadFacultyList();
    } catch (err) {
      alert(err.message || 'Failed to send message to faculty member.');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleQuickChip = (text) => {
    setInputText(text);
  };

  const filteredFaculty = facultyList.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.faculty_name && f.faculty_name.toLowerCase().includes(q)) ||
      (f.faculty_email && f.faculty_email.toLowerCase().includes(q)) ||
      (f.department && f.department.toLowerCase().includes(q))
    );
  });

  const totalUnread = facultyList.reduce((acc, f) => acc + (f.unread_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Executive Command Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/70 border border-amber-500/40 p-6 shadow-2xl mb-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md">
                👑 Chief Administrator Supreme Command
              </span>
              <span className="text-xs text-amber-300 font-bold">• Allenhouse Institute of Technology</span>
            </div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <span>Direct Faculty & Staff 1-on-1 Personal Chat</span>
              {totalUnread > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black animate-pulse shadow-md">
                  {totalUnread} Unread Message{totalUnread > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Confidential, direct personal consultation console for <strong>UTKARSH KUSHWAHA</strong> with faculty members and staff administrators. Discuss academic matters, department requisitions, and priority institutional directives.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              👑
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-400">Chief Executive Authority</div>
              <div className="text-xs font-black text-white">UTKARSH KUSHWAHA</div>
              <div className="text-[11px] text-slate-400 font-mono">utkarshkushwaha470@gmail.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px]">
        {/* Left Panel: Faculty Directory & Message Inbox (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          {/* Search & Header Bar */}
          <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/90">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span>👥 Faculty & Staff Directory</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {facultyList.length}
                </span>
              </h3>
              <button
                onClick={loadFacultyList}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                title="Refresh list"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search faculty name, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs outline-none focus:border-amber-500 transition"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
            </div>
          </div>

          {/* Faculty List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading faculty directory...</div>
            ) : filteredFaculty.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                {searchQuery ? 'No faculty found matching search.' : 'No faculty members registered yet.'}
              </div>
            ) : (
              filteredFaculty.map((f) => {
                const isSelected = selectedFaculty?.faculty_id === f.faculty_id;
                const hasUnread = (f.unread_count || 0) > 0;

                return (
                  <div
                    key={f.faculty_id}
                    onClick={() => handleSelectFaculty(f)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-950/60 to-purple-950/40 border border-amber-500/50 shadow-md'
                        : 'hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    {/* Faculty Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {f.faculty_name ? f.faculty_name.charAt(0).toUpperCase() : 'F'}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-sm shadow-rose-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Faculty Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-white truncate">{f.faculty_name}</h4>
                        {f.last_message_at && (
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {new Date(f.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-purple-300 font-medium truncate mb-1">
                        {f.department || 'Allenhouse Faculty'}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-400 truncate max-w-[190px]">
                          {f.last_message || 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black shrink-0">
                            {f.unread_count} New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Active 1-on-1 Personal Chat (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          {selectedFaculty ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                    {selectedFaculty.faculty_name ? selectedFaculty.faculty_name.charAt(0).toUpperCase() : 'F'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white">{selectedFaculty.faculty_name}</h3>
                      <span className="px-2 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50 text-[10px] font-bold">
                        {selectedFaculty.department || 'Faculty'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ✉️ {selectedFaculty.faculty_email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Direct Personal Line Active
                  </span>
                </div>
              </div>

              {/* Messages Thread Container */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/50">
                {loadingThread ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Loading conversation thread...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                      💬
                    </div>
                    <h4 className="text-sm font-bold text-slate-200">
                      No direct messages with {selectedFaculty.faculty_name} yet
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Send a personal directive, inquiry, or meeting request to begin this 1-on-1 executive dialogue.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isChief = m.is_chief || m.sender_role === 'CHIEF_ADMIN';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isChief ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className={`text-[10px] font-black ${isChief ? 'text-amber-400' : 'text-purple-300'}`}>
                            {isChief ? '👑 You (Chief Administrator Utkarsh Kushwaha)' : `🎓 ${m.sender_name || selectedFaculty.faculty_name}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                            isChief
                              ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-slate-950 font-bold rounded-tr-none shadow-amber-600/10'
                              : 'bg-slate-800/90 border border-slate-700 text-slate-100 font-medium rounded-tl-none shadow-slate-900/50'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-slate-500 font-bold whitespace-nowrap">Quick Responses:</span>
                {[
                  'Clearance Approved ✓',
                  'Please schedule a meeting in my office.',
                  'Submit the department dossier for executive review.',
                  'Approved and entered into official college records.'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickChip(chip)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/60 hover:text-amber-300 text-slate-400 text-[10px] font-medium whitespace-nowrap transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Write personal reply or instructions to ${selectedFaculty.faculty_name}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {sending ? 'Delivering...' : 'Send Message ➔'}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20">
                👑
              </div>
              <div>
                <h3 className="text-base font-black text-white">Direct Faculty 1-on-1 Consultation Center</h3>
                <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                  Select a Faculty Member or Staff Administrator from the list on the left to start or continue your private 1-on-1 conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
