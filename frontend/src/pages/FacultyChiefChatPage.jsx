import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function FacultyChiefChatPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Poll conversation every 3 seconds for real-time live chatting
  useEffect(() => {
    loadConversation();
    const interval = setInterval(loadConversation, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    try {
      const data = await api.facultyGetChiefConversation();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading conversation with Chief Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await api.facultySendToChief({ message: textToSend });
      await loadConversation();
    } catch (err) {
      alert(err.message || 'Failed to send message to Chief Administrator.');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleQuickChip = (text) => {
    setInputText(text);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Executive Direct Channel Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 p-6 shadow-2xl mb-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-md">
                🎓 Faculty & Staff Direct Channel
              </span>
              <span className="text-xs text-purple-300 font-semibold">• Allenhouse Institute of Technology</span>
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              <span>💬 Direct Chat with Chief Administrator</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Official 1-on-1 personal channel with <strong>UTKARSH KUSHWAHA</strong> (Chief Administrator). Use this private space for important college work, departmental approvals, and confidential faculty consultations.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-950/50 border border-purple-500/40">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow-md">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-300">Signed In As</div>
              <div className="text-xs font-black text-white">{user.full_name}</div>
              <div className="text-[11px] text-purple-400 font-medium">
                {user.role === 'ADMIN' ? 'Staff Administrator' : (user.batch || 'Verified Faculty')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window Container */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col h-[560px] overflow-hidden">
        {/* Top Info Bar */}
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
              👑
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>UTKARSH KUSHWAHA</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase">
                  Chief Admin
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Chief Executive Authority • Allenhouse Institute of Technology</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online Direct Line
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/60">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Loading secure messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-3xl">
                👑
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                1-on-1 Direct Channel Open with Chief Admin
              </h4>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                No previous messages found. Type your personal message or work inquiry below to send it directly to Chief Administrator Utkarsh Kushwaha.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.is_me || m.sender_role === 'FACULTY' || m.sender_id === user.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-[10px] font-bold ${isMe ? 'text-purple-300' : 'text-amber-400'}`}>
                      {isMe ? 'You' : '👑 UTKARSH KUSHWAHA (Chief Admin)'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-tr-none shadow-purple-600/15'
                        : 'bg-gradient-to-r from-slate-800 via-slate-850 to-slate-900 border border-amber-500/40 text-amber-100 font-medium rounded-tl-none shadow-slate-900/50'
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

        {/* Quick Suggestion Chips for Faculty */}
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-bold whitespace-nowrap">Suggested Topics:</span>
          {[
            'Requesting approval for department academic schedule.',
            'Disciplinary incident report for your executive review.',
            'Urgent student clearance approval required.',
            'Requesting brief executive consultation meeting.'
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickChip(chip)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/60 hover:text-purple-300 text-slate-400 text-[10px] font-medium whitespace-nowrap transition"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your personal message to Chief Administrator Utkarsh Kushwaha..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs outline-none focus:border-purple-500 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 disabled:opacity-50 flex items-center gap-2 transition"
          >
            {sending ? 'Sending...' : 'Send to Chief Admin ➔'}
          </button>
        </form>
      </div>
    </div>
  );
}
