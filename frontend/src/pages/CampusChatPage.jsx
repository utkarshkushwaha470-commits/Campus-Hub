import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const EMOJI_LIST = ['❤️', '😂', '🔥', '👍', '😮', '👏'];

export default function CampusChatPage({ user }) {
  const isAdmin = user.role === 'ADMIN';

  // Navigation & view mode
  const [adminViewAll, setAdminViewAll] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [adminThreads, setAdminThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [threadData, setThreadData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Message input state
  const [inputText, setInputText] = useState('');
  const [attachFile, setAttachFile] = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [sending, setSending] = useState(false);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Filter in inbox
  const [filterQuery, setFilterQuery] = useState('');

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    loadInbox();
    if (isAdmin) {
      loadAdminThreads();
    }
  }, [adminViewAll]);

  // Connect WebSocket to active thread
  useEffect(() => {
    if (!activeThreadId) return;

    loadThreadMessages(activeThreadId);

    // WebSocket connection to thread room
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${activeThreadId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_MESSAGE') {
          setThreadData((prev) => {
            if (!prev) return prev;
            // Prevent duplicate message
            if (prev.messages.some((m) => m.id === payload.message.id)) return prev;
            return {
              ...prev,
              messages: [...prev.messages, {
                ...payload.message,
                is_me: payload.message.sender_id === user.id
              }]
            };
          });
          scrollToBottom();
          loadInbox();
        } else if (payload.type === 'REACTION_UPDATE') {
          setThreadData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === payload.data.message_id
                  ? { ...m, reactions: payload.data.reactions }
                  : m
              )
            };
          });
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    return () => {
      if (ws) ws.close();
    };
  }, [activeThreadId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadInbox = async () => {
    try {
      const data = await api.getChatInbox();
      setInbox(data);
    } catch (err) {
      console.error('Error loading inbox:', err);
    }
  };

  const loadAdminThreads = async () => {
    try {
      const data = await api.getAdminAllChatThreads();
      setAdminThreads(data);
    } catch (err) {
      console.error('Error loading admin threads:', err);
    }
  };

  const loadThreadMessages = async (threadId) => {
    setLoading(true);
    try {
      const data = await api.getThreadMessages(threadId);
      setThreadData(data);
      scrollToBottom();
    } catch (err) {
      console.error('Error loading thread:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachFile) return;
    if (!activeThreadId) return;

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('content_text', inputText);
      if (attachFile) fd.append('attachment', attachFile);

      await api.sendChatMessage(activeThreadId, fd);
      setInputText('');
      setAttachFile(null);
      setAttachPreview(null);
      scrollToBottom();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await api.reactToMessage(messageId, emoji);
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleAdminDeleteMessage = async (messageId) => {
    if (!window.confirm('Admin Action: Are you sure you want to moderate and redact this message?')) return;
    try {
      await api.adminDeleteChatMessage(messageId);
      loadThreadMessages(activeThreadId);
    } catch (err) {
      alert(err.message || 'Failed to redact message');
    }
  };

  const handleSearchUsers = async (val) => {
    setSearchQuery(val);
    setSearching(true);
    try {
      const results = await api.searchCampusUsers(val);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const res = await api.startChatThread(targetUser.id);
      setShowNewChatModal(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadInbox();
      setActiveThreadId(res.thread_id);
    } catch (err) {
      alert(err.message || 'Could not start chat');
    }
  };

  const filteredInbox = inbox.filter((item) =>
    item.peer.full_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    item.last_message.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Instagram-Style Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Campus Direct Messages</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold shadow-sm">
                Insta-Style
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time peer chat with students, seniors, & faculty • Image sharing & reactions
          </p>
        </div>

        {/* Admin Mode Switch (If Admin) */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-amber-800/60 shadow-md">
            <span className="text-[11px] font-bold text-amber-400 px-2 flex items-center gap-1">
              <span>👑 Admin Super-Access:</span>
            </span>
            <button
              onClick={() => {
                setAdminViewAll(false);
                setActiveThreadId(null);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                !adminViewAll ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              My DMs
            </button>
            <button
              onClick={() => {
                setAdminViewAll(true);
                setActiveThreadId(null);
                loadAdminThreads();
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                adminViewAll ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Campus Chats ({adminThreads.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Instagram Layout: Sidebar + Chat Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-[78vh] flex flex-col md:flex-row">
        
        {/* ==================================================================== */}
        {/* LEFT COLUMN: CONVERSATION LIST / INBOX */}
        {/* ==================================================================== */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-950/70 ${
          activeThreadId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Top Bar with Profile & New Message Icon */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">
                {adminViewAll ? 'All Conversations' : user.full_name}
              </span>
              <span className="text-[10px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded-full border border-blue-900">
                {user.role}
              </span>
            </div>
            {!adminViewAll && (
              <button
                onClick={() => {
                  setShowNewChatModal(true);
                  handleSearchUsers('');
                }}
                className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all"
                title="New Direct Message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <input
                type="text"
                placeholder={adminViewAll ? "Search campus conversations..." : "Search direct messages..."}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/80">
            {adminViewAll ? (
              // ADMIN SUPER-ACCESS: ALL CAMPUS THREADS
              adminThreads.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No active student chats found.</div>
              ) : (
                adminThreads.map((at) => (
                  <div
                    key={at.thread_id}
                    onClick={() => setActiveThreadId(at.thread_id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                      activeThreadId === at.thread_id
                        ? 'bg-amber-950/30 border-l-4 border-amber-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md flex-shrink-0">
                      👥
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-white truncate">
                          {at.participant_1.name} ↔ {at.participant_2.name}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {at.message_count} msgs
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {at.last_message}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        <span>{at.participant_1.role} (Yr {at.participant_1.year || '-'})</span>
                        <span>•</span>
                        <span>{at.participant_2.role} (Yr {at.participant_2.year || '-'})</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              // REGULAR USER INBOX
              filteredInbox.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-slate-500 flex items-center justify-center mb-2">
                    💬
                  </div>
                  <p className="text-xs text-slate-400 font-medium">No direct messages yet</p>
                  <button
                    onClick={() => {
                      setShowNewChatModal(true);
                      handleSearchUsers('');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Start a New Chat
                  </button>
                </div>
              ) : (
                filteredInbox.map((item) => (
                  <div
                    key={item.thread_id}
                    onClick={() => setActiveThreadId(item.thread_id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-center gap-3 border-b border-slate-800/40 ${
                      activeThreadId === item.thread_id
                        ? 'bg-indigo-950/50 border-l-4 border-indigo-500'
                        : item.unread_count > 0
                        ? 'bg-emerald-950/20 hover:bg-slate-800/60'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Peer Avatar with Gradient & WhatsApp/Telegram style Unread Indicator */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md transition-all ${
                        item.unread_count > 0
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 ring-2 ring-emerald-400/80 shadow-emerald-500/20'
                          : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                      }`}>
                        {item.peer.avatar_char}
                      </div>
                      {item.unread_count > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-sm shadow-emerald-500"></span>
                        </span>
                      ) : (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate flex items-center gap-1.5 ${
                          item.unread_count > 0 ? 'font-black text-white' : 'font-bold text-slate-200'
                        }`}>
                          {item.peer.full_name}
                          {item.peer.locked_year && (
                            <span className="text-[10px] text-blue-300 font-medium bg-blue-950 px-1 rounded">
                              Yr {item.peer.locked_year}
                            </span>
                          )}
                        </span>
                        {item.unread_count > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black min-w-[18px] text-center shadow-md shadow-emerald-500/30">
                              {item.unread_count}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${
                        item.unread_count > 0 ? 'text-emerald-300 font-bold' : 'text-slate-400'
                      }`}>
                        {item.last_message_has_attachment ? '📷 Photo' : item.last_message}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: ACTIVE INSTAGRAM CHAT STREAM */}
        {/* ==================================================================== */}
        <div className={`flex-1 flex flex-col bg-slate-900/60 ${
          !activeThreadId ? 'hidden md:flex' : 'flex'
        }`}>
          {!activeThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Your Campus Messages</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Send private messages, academic questions, and photo solutions to any peer or faculty member.
              </p>
              <button
                onClick={() => {
                  setShowNewChatModal(true);
                  handleSearchUsers('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
              >
                Send Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3.5 px-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveThreadId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    ←
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                    {threadData?.peer?.avatar_char || '👥'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-sm">
                        {threadData?.is_admin_view
                          ? `${threadData.participants.user1?.name} ↔ ${threadData.participants.user2?.name}`
                          : threadData?.peer?.full_name}
                      </h4>
                      {threadData?.is_admin_view && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-extrabold border border-amber-800">
                          👑 ADMIN MONITORING VIEW
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active on Campus</span>
                      {threadData?.peer?.role && (
                        <span className="text-slate-400 font-normal">
                          • {threadData.peer.role} {threadData.peer.locked_year ? `(Year ${threadData.peer.locked_year})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">End-to-End Campus Audited</span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-xs text-slate-500">Loading conversation...</div>
                ) : (!threadData?.messages || threadData.messages.length === 0) ? (
                  <div className="text-center py-16 text-xs text-slate-500 italic">
                    No messages yet. Say hi or ask an academic question!
                  </div>
                ) : (
                  threadData.messages.map((m) => {
                    const isMine = m.is_me;
                    return (
                      <div
                        key={m.id}
                        className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label (if admin view) */}
                        {threadData?.is_admin_view && (
                          <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                            {m.sender_name}
                          </span>
                        )}

                        <div className="relative max-w-[78%]">
                          {/* Image Attachment (Instagram Style) */}
                          {m.attachment_url && (
                            <div className="mb-1 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                              <img
                                src={m.attachment_url}
                                alt="Attachment"
                                className="max-h-60 object-contain rounded-2xl"
                              />
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                              isMine
                                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-sm'
                                : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700/60'
                            }`}
                          >
                            {m.content_text}
                          </div>

                          {/* Hover Emoji Reaction Bar (Instagram Style) */}
                          <div className={`hidden group-hover:flex items-center gap-1 absolute -top-8 ${
                            isMine ? 'right-0' : 'left-0'
                          } bg-slate-950 border border-slate-800 rounded-full px-2 py-0.5 shadow-xl z-10`}>
                            {EMOJI_LIST.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(m.id, emoji)}
                                className="hover:scale-125 transition-transform text-xs p-0.5"
                              >
                                {emoji}
                              </button>
                            ))}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteMessage(m.id)}
                                title="Admin: Redact Message"
                                className="text-rose-400 hover:text-rose-300 text-[10px] font-bold ml-1 pl-1 border-l border-slate-800"
                              >
                                ✕ Redact
                              </button>
                            )}
                          </div>

                          {/* Displayed Emoji Reactions */}
                          {m.reactions && Object.keys(m.reactions).length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(m.reactions).map(([emoji, userIds]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(m.id, emoji)}
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] border flex items-center gap-0.5 ${
                                    userIds.includes(user.id)
                                      ? 'bg-blue-950 border-blue-600 text-blue-200'
                                      : 'bg-slate-950 border-slate-800 text-slate-300'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold text-[9px]">{userIds.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] text-slate-500 mt-0.5 px-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Box */}
              {attachPreview && (
                <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={attachPreview} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-slate-700" />
                    <span className="text-xs text-slate-300">Photo attached ready to send</span>
                  </div>
                  <button
                    onClick={() => {
                      setAttachFile(null);
                      setAttachPreview(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Message Input Bar (Instagram Style) */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2">
                {/* Photo Attachment Picker */}
                <label className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-900 transition-all flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setAttachFile(file);
                        setAttachPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="Message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                {/* Quick Heart Reaction Button */}
                <button
                  type="button"
                  onClick={() => setInputText((prev) => prev + ' ❤️')}
                  className="p-2 text-rose-500 hover:scale-125 transition-transform"
                  title="Send heart"
                >
                  ❤️
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !attachFile)}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs disabled:opacity-40 transition-all shadow-md shadow-blue-500/20"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* NEW MESSAGE MODAL: DIRECTORY SEARCH */}
      {/* ==================================================================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-white text-base">New Direct Message</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search students, seniors, faculty..."
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {searching ? (
                <div className="text-center py-6 text-xs text-slate-500">Searching directory...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 italic">No matching students found.</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                        {u.avatar_char}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          {u.full_name}
                          {u.locked_year && (
                            <span className="text-[10px] text-blue-300 bg-blue-950 px-1.5 rounded">
                              Yr {u.locked_year}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.role} • Batch {u.batch}
                        </div>
                      </div>
                    </div>

                    <button className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px]">
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
