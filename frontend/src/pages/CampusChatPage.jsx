import React, { useState, useEffect, useRef } from 'react';
import { api, getWsBase } from '../services/api';

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
  const [locating, setLocating] = useState(false);
  const [animatingHeartMsgId, setAnimatingHeartMsgId] = useState(null);

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
    const poller = setInterval(() => {
      loadInbox();
    }, 2500);
    return () => clearInterval(poller);
  }, [adminViewAll]);

  // Connect WebSocket to active thread
  useEffect(() => {
    if (!activeThreadId) return;

    loadThreadMessages(activeThreadId);

    const pollInterval = setInterval(() => {
      loadThreadMessages(activeThreadId);
      loadInbox();
    }, 2000);

    const wsUrl = `${getWsBase()}/ws/chat/${activeThreadId}`;
    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_MESSAGE') {
            setThreadData((prev) => {
              if (!prev) return prev;
              if (prev.messages && prev.messages.some((m) => m.id === payload.message.id)) return prev;
              return {
                ...prev,
                messages: [...(prev.messages || []), {
                  ...payload.message,
                  is_me: payload.message.sender_id === user.id
                }]
              };
            });
            scrollToBottom();
            loadInbox();
          } else if (payload.type === 'REACTION_UPDATE') {
            setThreadData((prev) => {
              if (!prev || !prev.messages) return prev;
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
    } catch (e) {
      console.warn('WebSocket connection fallback to polling:', e);
    }

    return () => {
      if (ws) ws.close();
      clearInterval(pollInterval);
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
      setInbox(data || []);
      if (!activeThreadId && data && data.length > 0) {
        setActiveThreadId(data[0].thread_id);
      }
    } catch (err) {
      console.error('Error loading inbox:', err);
    }
  };

  const loadAdminThreads = async () => {
    try {
      const data = await api.getAdminAllChatThreads();
      setAdminThreads(data || []);
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

  const handleShareLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    if (!activeThreadId) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        const locMsg = `📍 Live Location: ${mapsLink} (GPS accuracy ~${accuracy}m)`;

        try {
          const fd = new FormData();
          fd.append('content_text', locMsg);
          await api.sendChatMessage(activeThreadId, fd);
          loadThreadMessages(activeThreadId);
          loadInbox();
        } catch (err) {
          alert(err.message || 'Failed to share location');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        alert('Could not retrieve GPS location. Please allow browser location access.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
      loadThreadMessages(activeThreadId);
      loadInbox();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendHeart = async () => {
    if (!activeThreadId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('content_text', '❤️');
      await api.sendChatMessage(activeThreadId, fd);
      scrollToBottom();
      loadThreadMessages(activeThreadId);
      loadInbox();
    } catch (err) {
      console.error('Failed to send heart:', err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await api.reactToMessage(messageId, emoji);
      loadThreadMessages(activeThreadId);
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // Instagram-style double tap to like
  const handleDoubleClickMessage = (m) => {
    setAnimatingHeartMsgId(m.id);
    handleToggleReaction(m.id, '❤️');
    setTimeout(() => {
      setAnimatingHeartMsgId(null);
    }, 900);
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
      setSearchResults(results || []);
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

  const filteredInbox = (inbox || []).filter((item) =>
    (item.peer?.full_name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (item.last_message || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      {/* Top Banner: Ask_Up Instagram Experience */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-md shadow-pink-500/20 inline-flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 22l10-3 10 3L12 2zm0 3.8L18.8 18l-6.8-2-6.8 2L12 5.8z" />
                </svg>
              </span>
              <span>Ask_Up</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-black shadow-sm">
                Instagram Direct
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time peer chat with students & faculty • Double-tap to heart ❤️ • Photos & live location
          </p>
        </div>

        {/* Admin Mode Switch (If Admin) */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-amber-800/60 shadow-md">
            <span className="text-[11px] font-bold text-amber-400 px-2 flex items-center gap-1">
              <span>👑 Super-Admin:</span>
            </span>
            <button
              onClick={() => {
                setAdminViewAll(false);
                setActiveThreadId(null);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                !adminViewAll ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Ask_Up DMs
            </button>
            <button
              onClick={() => {
                setAdminViewAll(true);
                setActiveThreadId(null);
                loadAdminThreads();
              }}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                adminViewAll ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Campus Chats ({adminThreads.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Instagram Layout: Sidebar + Active Chat Stream */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl h-[78vh] flex flex-col md:flex-row">
        
        {/* ==================================================================== */}
        {/* LEFT COLUMN: CONVERSATION LIST / INBOX */}
        {/* ==================================================================== */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-[#262626] flex flex-col bg-[#141414] ${
          activeThreadId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Top Bar with Profile & New Message Icon */}
          <div className="p-4 border-b border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center border border-black">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              </div>
              <span className="font-black text-white text-sm tracking-tight">
                {adminViewAll ? 'All Campus Threads' : user.full_name}
              </span>
              <span className="text-[10px] text-blue-400 font-bold bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-900/60">
                {user.role}
              </span>
            </div>
            {!adminViewAll && (
              <button
                onClick={() => {
                  setShowNewChatModal(true);
                  handleSearchUsers('');
                }}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                title="New Direct Message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="p-3 border-b border-[#262626]">
            <div className="relative">
              <input
                type="text"
                placeholder={adminViewAll ? "Search campus conversations..." : "Search Ask_Up messages..."}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[#242424] border border-transparent text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e1e]">
            {adminViewAll ? (
              adminThreads.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No active student chats found.</div>
              ) : (
                adminThreads.map((at) => (
                  <div
                    key={at.thread_id}
                    onClick={() => setActiveThreadId(at.thread_id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                      activeThreadId === at.thread_id
                        ? 'bg-amber-950/40 border-l-4 border-amber-500'
                        : 'hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md flex-shrink-0">
                      👥
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-white truncate">
                          {at.participant_1?.name || 'User 1'} ↔ {at.participant_2?.name || 'User 2'}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {at.message_count} msgs
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {at.last_message}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        <span>{at.participant_1?.role} (Yr {at.participant_1?.year || '-'})</span>
                        <span>•</span>
                        <span>{at.participant_2?.role} (Yr {at.participant_2?.year || '-'})</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredInbox.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#202020] text-pink-400 flex items-center justify-center mb-2">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 22l10-3 10 3L12 2zm0 3.8L18.8 18l-6.8-2-6.8 2L12 5.8z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-300 font-bold">No direct messages yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">Say hello to college peers or faculty</p>
                  <button
                    onClick={() => {
                      setShowNewChatModal(true);
                      handleSearchUsers('');
                    }}
                    className="mt-3 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-black text-xs shadow-md"
                  >
                    Start a New Chat
                  </button>
                </div>
              ) : (
                filteredInbox.map((item) => (
                  <div
                    key={item.thread_id}
                    onClick={() => setActiveThreadId(item.thread_id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-center gap-3 ${
                      activeThreadId === item.thread_id
                        ? 'bg-[#222222] border-l-4 border-pink-500'
                        : item.unread_count > 0
                        ? 'bg-pink-950/20 hover:bg-[#1e1e1e]'
                        : 'hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {/* Peer Avatar with Instagram Story Ring */}
                    <div className="relative flex-shrink-0">
                      <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                        <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-sm border-2 border-black">
                          {item.peer?.avatar_char || item.peer?.full_name?.charAt(0) || '👤'}
                        </div>
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate flex items-center gap-1 ${
                          item.unread_count > 0 ? 'font-black text-white' : 'font-bold text-slate-200'
                        }`}>
                          {item.peer?.full_name || 'Campus Peer'}
                          <span className="text-blue-400 text-[10px]" title="Verified Student">✓</span>
                          {item.peer?.locked_year && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              • Yr {item.peer.locked_year}
                            </span>
                          )}
                        </span>
                        {item.unread_count > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-[#833ab4] to-[#fd1d1d] text-white text-[10px] font-black min-w-[18px] text-center shadow-md">
                            {item.unread_count}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${
                        item.unread_count > 0 ? 'text-pink-300 font-bold' : 'text-slate-400'
                      }`}>
                        {item.last_message_has_attachment ? '📷 Photo' : (item.last_message || 'Started conversation')}
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
        <div className={`flex-1 flex flex-col bg-[#0e0e0e] ${
          !activeThreadId ? 'hidden md:flex' : 'flex'
        }`}>
          {!activeThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4 shadow-xl">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 22l10-3 10 3L12 2zm0 3.8L18.8 18l-6.8-2-6.8 2L12 5.8z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white">Your Ask_Up Messages</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Send private Instagram-style messages, academic questions, and live locations to any peer or faculty member.
              </p>
              <button
                onClick={() => {
                  setShowNewChatModal(true);
                  handleSearchUsers('');
                }}
                className="mt-5 px-5 py-2 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-black text-xs shadow-lg shadow-pink-500/20 hover:scale-105 transition-all"
              >
                Send Message
              </button>
            </div>
          ) : (
            <>
              {/* Instagram Direct Header */}
              <div className="p-3.5 px-5 border-b border-[#262626] bg-[#141414] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveThreadId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    ←
                  </button>

                  <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-sm border-2 border-black">
                      {threadData?.peer?.avatar_char || threadData?.peer?.full_name?.charAt(0) || '👤'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-white text-sm">
                        {threadData?.is_admin_view
                          ? `${threadData?.participants?.user1?.name || 'User 1'} ↔ ${threadData?.participants?.user2?.name || 'User 2'}`
                          : (threadData?.peer?.full_name || 'Loading user...')}
                      </h4>
                      <span className="text-blue-400 text-xs font-bold" title="Verified">✓</span>
                      {threadData?.is_admin_view && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-extrabold border border-amber-800 ml-1">
                          👑 AUDIT VIEW
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active now</span>
                      {threadData?.peer?.role && (
                        <span className="text-slate-400 font-normal">
                          • {threadData.peer.role} {threadData.peer.locked_year ? `(Yr ${threadData.peer.locked_year})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instagram Header Action Icons */}
                <div className="flex items-center gap-3 text-slate-300">
                  <button className="p-2 rounded-full hover:bg-slate-800 transition-colors" title="Audio Call">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-800 transition-colors" title="Video Call">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-800 transition-colors" title="Thread Info">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                {loading ? (
                  <div className="text-center py-8 text-xs text-slate-500">Loading Ask_Up messages...</div>
                ) : (!threadData?.messages || threadData.messages.length === 0) ? (
                  <div className="text-center py-16 text-xs text-slate-500 italic">
                    No messages yet in this Ask_Up thread. Say hi or ask an academic question!
                  </div>
                ) : (
                  threadData.messages.map((m) => {
                    const isMine = m.is_me;
                    const isHeartAnimating = animatingHeartMsgId === m.id;
                    const hasHeartReaction = m.reactions && m.reactions['❤️'] && m.reactions['❤️'].length > 0;

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

                        <div
                          className="relative max-w-[75%] cursor-pointer select-none"
                          onDoubleClick={() => handleDoubleClickMessage(m)}
                        >
                          {/* Floating Heart Burst Animation on Double Click */}
                          {isHeartAnimating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-ping">
                              <span className="text-4xl">❤️</span>
                            </div>
                          )}

                          {/* Image Attachment (Instagram Style) */}
                          {m.attachment_url && (
                            <div className="mb-1 rounded-2xl overflow-hidden border border-slate-700 bg-black">
                              <img
                                src={m.attachment_url}
                                alt="Attachment"
                                className="max-h-60 object-contain rounded-2xl"
                              />
                            </div>
                          )}

                          {/* Instagram Message Bubble */}
                          <div
                            className={`px-4 py-2.5 text-xs leading-relaxed break-words shadow-md transition-all ${
                              isMine
                                ? 'bg-gradient-to-tr from-[#7928CA] via-[#B800FF] to-[#FF0080] text-white rounded-[22px] rounded-br-[4px]'
                                : 'bg-[#262626] border border-[#333333] text-white rounded-[22px] rounded-bl-[4px]'
                            }`}
                          >
                            {m.content_text && m.content_text.includes('maps.google.com') ? (
                              <div className="space-y-2 py-0.5">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                                  <span className="text-sm">📍</span>
                                  <span>Live Campus Location</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-black/70 border border-emerald-500/40 text-slate-200">
                                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mb-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>Real-Time GPS Coordinates</span>
                                  </div>
                                  <a
                                    href={m.content_text.match(/https:\/\/maps\.google\.com[^\s\)]+/)?.[0] || 'https://maps.google.com'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
                                  >
                                    <span>Open in Google Maps ➔</span>
                                  </a>
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {m.content_text.replace(/https:\/\/maps\.google\.com[^\s\)]+/, '').trim()}
                                </div>
                              </div>
                            ) : (
                              <div>{m.content_text}</div>
                            )}
                          </div>

                          {/* Heart Reaction Badge (Instagram Style at corner of bubble) */}
                          {hasHeartReaction && (
                            <div className={`absolute -bottom-2 ${isMine ? '-left-1' : '-right-1'} bg-[#1a1a1a] border border-[#333] rounded-full px-1.5 py-0.2 text-[10px] shadow-lg flex items-center gap-0.5 z-10`}>
                              <span>❤️</span>
                              {m.reactions['❤️'].length > 1 && (
                                <span className="font-bold text-[9px] text-white">{m.reactions['❤️'].length}</span>
                              )}
                            </div>
                          )}

                          {/* Hover Emoji Reaction Bar (Instagram Style) */}
                          <div className={`hidden group-hover:flex items-center gap-1 absolute -top-8 ${
                            isMine ? 'right-0' : 'left-0'
                          } bg-[#181818] border border-[#333] rounded-full px-2 py-0.5 shadow-xl z-20`}>
                            {EMOJI_LIST.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleReaction(m.id, emoji);
                                }}
                                className="hover:scale-125 transition-transform text-xs p-0.5"
                              >
                                {emoji}
                              </button>
                            ))}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdminDeleteMessage(m.id);
                                }}
                                title="Admin: Moderate Message"
                                className="text-rose-400 hover:text-rose-300 text-[10px] font-bold ml-1 pl-1 border-l border-slate-700"
                              >
                                ✕ Redact
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] text-slate-500 mt-1 px-1">
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
                <div className="p-2 bg-[#1a1a1a] border-t border-[#262626] flex items-center justify-between">
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

              {/* Instagram Direct Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#262626] bg-[#141414] flex items-center gap-2">
                {/* Pill-shaped container */}
                <div className="flex-1 flex items-center bg-[#202020] border border-[#2e2e2e] rounded-full px-3 py-1 gap-2 focus-within:border-pink-500 transition-all">
                  
                  {/* Photo Attachment Picker (Instagram Camera) */}
                  <label className="cursor-pointer p-1.5 rounded-full text-slate-400 hover:text-pink-400 transition-all flex-shrink-0" title="Attach Photo">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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

                  {/* Share Live Location Button */}
                  <button
                    type="button"
                    onClick={handleShareLiveLocation}
                    disabled={locating || !activeThreadId}
                    className="p-1.5 rounded-full text-slate-400 hover:text-emerald-400 transition-all flex-shrink-0"
                    title="Share Live Location"
                  >
                    {locating ? (
                      <span className="w-4 h-4 flex items-center justify-center animate-spin text-xs">⏳</span>
                    ) : (
                      <span className="text-sm">📍</span>
                    )}
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    placeholder="Message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-400 focus:outline-none"
                  />

                  {/* Voice Note Placeholder Icon */}
                  <button
                    type="button"
                    onClick={() => alert('Audio voice notes are enabled in Ask_Up!')}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-200 transition-all flex-shrink-0"
                    title="Voice Note"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                {/* Instagram Quick Heart or Send Button */}
                {!inputText.trim() && !attachFile ? (
                  <button
                    type="button"
                    onClick={handleSendHeart}
                    disabled={sending || !activeThreadId}
                    className="p-2 text-rose-500 hover:scale-125 transition-transform flex-shrink-0"
                    title="Send Heart"
                  >
                    <svg className="w-6 h-6 fill-rose-500 hover:fill-rose-400" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-black text-xs hover:opacity-90 transition-all shadow-md shadow-pink-500/20 flex-shrink-0"
                  >
                    Send
                  </button>
                )}
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
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-3 mb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>New Ask_Up Message</span>
              </h3>
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
                placeholder="Search students, faculty, or seniors..."
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full px-4 py-2 rounded-full bg-[#242424] border border-[#333] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {searching ? (
                <div className="text-center py-4 text-xs text-slate-500">Searching directory...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">No peers found. Try typing a name or CRN.</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="p-2.5 rounded-2xl hover:bg-[#252525] cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-[#383838]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs border border-black">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          {u.full_name}
                          <span className="text-blue-400 text-[10px]">✓</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {u.role} {u.locked_year ? `• Year ${u.locked_year}` : ''} • {u.batch || 'Allenhouse'}
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-full bg-gradient-to-r from-[#833ab4] to-[#fd1d1d] text-white font-black text-[11px] shadow-sm">
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
