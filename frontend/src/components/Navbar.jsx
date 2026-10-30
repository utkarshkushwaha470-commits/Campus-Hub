import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Navbar({ user, activePage, setActivePage, onLogout, hasUnreadMessages }) {
  if (!user) return null;

  const isPending = user.status === 'PENDING';
  const isRejected = user.status === 'REJECTED';
  const isAdmin = user.role === 'ADMIN';

  // Role checks
  const isChiefAdmin = user.is_chief_admin || (user.email && user.email.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com');
  const isFacultyOrSubAdmin = (user.role === 'FACULTY' || user.role === 'ADMIN') && !isChiefAdmin;
  const isStudent = user.role === 'STUDENT';

  // Unread indicators for personal chat
  const [chiefFacultyUnread, setChiefFacultyUnread] = useState(0);
  const [facultyUnreadFromChief, setFacultyUnreadFromChief] = useState(0);
  const [problemPendingCount, setProblemPendingCount] = useState(0);

  useEffect(() => {
    if (isPending || isRejected || isStudent) return;

    const checkPersonalChatUnread = async () => {
      try {
        if (isChiefAdmin) {
          const res = await api.getFacultyChatsUnreadCount();
          setChiefFacultyUnread(res?.unread_count || 0);
        } else if (isFacultyOrSubAdmin) {
          const res = await api.getFacultyUnreadFromChief();
          setFacultyUnreadFromChief(res?.unread_count || 0);
        }
      } catch (err) {}
    };

    checkPersonalChatUnread();
    const interval = setInterval(checkPersonalChatUnread, 4000);
    return () => clearInterval(interval);
  }, [user, isChiefAdmin, isFacultyOrSubAdmin, isPending, isRejected, isStudent]);

  useEffect(() => {
    if (isPending || isRejected || !isAdmin) return;

    const checkProblemBoxCount = async () => {
      try {
        const queue = await api.getProblemBoxAdminQueue();
        if (Array.isArray(queue)) {
          setProblemPendingCount(queue.filter(m => m.status === 'SUBMITTED').length);
        }
      } catch (err) {}
    };

    checkProblemBoxCount();
    const interval = setInterval(checkProblemBoxCount, 4000);
    return () => clearInterval(interval);
  }, [isAdmin, isPending, isRejected]);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => !isPending && !isRejected && setActivePage('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/40 group-hover:scale-105 transition-all duration-300">
            <span className="text-white font-black text-lg tracking-tight">C</span>
          </div>
          <div>
            <div className="font-extrabold text-white text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>Campus Hub</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PWA</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Allenhouse Institute of Technology</div>
          </div>
        </div>

        {/* Navigation items (if verified) */}
        {!isPending && !isRejected && (
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activePage === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Dashboard
            </button>

            {/* Instagram Style Chat Nav Pill with Unread Dot */}
            <button
              onClick={() => setActivePage('chat')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative ${
                activePage === 'chat'
                  ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-md shadow-pink-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>💬 Campus DMs</span>
              {hasUnreadMessages && (
                <span className="relative flex h-2.5 w-2.5 ml-0.5" title="New Message Received!">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-md shadow-rose-500/50"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActivePage('year-sections')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activePage === 'year-sections'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Year Sections
            </button>

            <button
              onClick={() => setActivePage('groups')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activePage === 'groups'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🏛️ Groups
            </button>

            <button
              onClick={() => setActivePage('problem-box')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative ${
                activePage === 'problem-box'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📬 Problem Box</span>
              {isAdmin && problemPendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse">
                  {problemPendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActivePage('leaderboard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activePage === 'leaderboard'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Leaderboard
            </button>

            {isAdmin && (
              <button
                onClick={() => setActivePage('admin-portal')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activePage === 'admin-portal'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                    : 'text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/40'
                }`}
              >
                <span>🛡️</span>
                <span>Admin Portal</span>
              </button>
            )}

            {/* CHIEF ADMINISTRATOR EXCLUSIVE: Direct Chat with Faculty */}
            {isChiefAdmin && (
              <button
                onClick={() => setActivePage('chief-faculty-chat')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative ${
                  activePage === 'chief-faculty-chat'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                    : 'text-amber-400 hover:text-white hover:bg-amber-950/40 border border-amber-500/40'
                }`}
              >
                <span>💬 Faculty Direct Chat</span>
                {chiefFacultyUnread > 0 && (
                  <span className="relative flex h-2 w-2 ml-0.5" title="New Message from Faculty!">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500"></span>
                  </span>
                )}
                {chiefFacultyUnread > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                    {chiefFacultyUnread}
                  </span>
                )}
              </button>
            )}

            {/* FACULTY & STAFF ADMINS: Direct Chat with Chief Admin */}
            {isFacultyOrSubAdmin && (
              <button
                onClick={() => setActivePage('chief-chat')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative ${
                  activePage === 'chief-chat'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black shadow-lg shadow-purple-600/30'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/40'
                }`}
              >
                <span>💬 Chat with Chief Admin</span>
                {facultyUnreadFromChief > 0 && (
                  <span className="relative flex h-2 w-2 ml-0.5" title="New Reply from Chief Admin!">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500"></span>
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActivePage('settings')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activePage === 'settings'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              ⚙️ Settings
            </button>
          </nav>
        )}

        {/* User Pill & Logout */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex flex-col text-right cursor-pointer" onClick={() => setActivePage('settings')}>
            <span className="text-xs font-bold text-slate-200 hover:text-indigo-400 transition-colors">{user.full_name}</span>
            <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400">
              <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">{user.role}</span>
              {user.locked_year ? (
                <span className="text-slate-300">Year {user.locked_year}</span>
              ) : (
                <span className="text-slate-400">{user.batch}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setActivePage('settings')}
            className={`p-2 text-xs font-medium rounded-xl transition-all ${
              activePage === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Account Settings"
          >
            ⚙️
          </button>

          <button
            onClick={onLogout}
            className="p-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-all"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
