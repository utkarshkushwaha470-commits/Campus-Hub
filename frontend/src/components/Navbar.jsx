import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Navbar({
  user,
  activePage,
  setActivePage,
  onLogout,
  hasUnreadMessages,
  navBadges = {}
}) {
  if (!user) return null;

  const isPending = user.status === 'PENDING';
  const isRejected = user.status === 'REJECTED';
  const isAdmin = user.role === 'ADMIN' || Boolean(user?.is_chief_admin) || (user?.email && user.email.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com');

  // Role checks
  const isChiefAdmin = user.is_chief_admin || (user.email && user.email.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com');
  const isFacultyOrSubAdmin = (user.role === 'FACULTY' || user.role === 'ADMIN') && !isChiefAdmin;
  const isStudent = user.role === 'STUDENT';

  // Unread indicators for personal chat
  const [chiefFacultyUnread, setChiefFacultyUnread] = useState(0);
  const [facultyUnreadFromChief, setFacultyUnreadFromChief] = useState(0);

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

  // Helper to render official red circular badge matching screenshot
  const renderBadge = (count, fallbackCount = 1) => {
    const val = (count !== undefined && count !== null) ? Number(count) : fallbackCount;
    if (val > 0) {
      return (
        <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-sm shadow-rose-600/50 inline-block leading-none">
          {val}
        </span>
      );
    }
    return (
      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50 inline-block"></span>
    );
  };

  const navItems = (
    <>
      {/* 1. Dashboard */}
      <button
        onClick={() => setActivePage('dashboard')}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
          activePage === 'dashboard'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>Dashboard</span>
        {renderBadge(navBadges.dashboard, 2)}
      </button>

      {/* 2. Campus DMs */}
      <button
        onClick={() => setActivePage('chat')}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
          activePage === 'chat'
            ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-md shadow-pink-500/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>💬 Campus DMs</span>
        {renderBadge(navBadges.campus_dm || (hasUnreadMessages ? 1 : 0), 1)}
      </button>

      {/* 3. Year Sections */}
      <button
        onClick={() => setActivePage('year-sections')}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
          activePage === 'year-sections'
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>Year Sections</span>
        {renderBadge(navBadges.year_sections, 3)}
      </button>

      {/* 4. Groups */}
      <button
        onClick={() => setActivePage('groups')}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
          activePage === 'groups'
            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-purple-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>🏛️ Groups</span>
        {renderBadge(navBadges.groups, 4)}
      </button>

      {/* 5. Problem Box */}
      <button
        onClick={() => setActivePage('problem-box')}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
          activePage === 'problem-box'
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 font-black'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>📬 Problem Box</span>
        {renderBadge(navBadges.problem_box, 4)}
      </button>

      {/* 6. Leaderboard */}
      <button
        onClick={() => setActivePage('leaderboard')}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
          activePage === 'leaderboard'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>Leaderboard</span>
        {renderBadge(navBadges.leaderboard, 1)}
      </button>

      {/* 7. Admin Portal */}
      {isAdmin && (
        <button
          onClick={() => setActivePage('admin-portal')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
            activePage === 'admin-portal'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 font-black'
              : 'text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/40'
          }`}
        >
          <span>🛡️</span>
          <span>Admin Portal</span>
          {renderBadge(navBadges.admin_portal, 1)}
        </button>
      )}

      {/* 8. CHIEF ADMINISTRATOR EXCLUSIVE: Direct Chat with Faculty */}
      {isChiefAdmin && (
        <button
          onClick={() => setActivePage('chief-faculty-chat')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
            activePage === 'chief-faculty-chat'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
              : 'text-amber-400 hover:text-white hover:bg-amber-950/40 border border-amber-500/40'
          }`}
        >
          <span>💬 Faculty Direct Chat</span>
          {renderBadge(navBadges.faculty_direct_chat || chiefFacultyUnread, 1)}
        </button>
      )}

      {/* 8b. FACULTY & STAFF ADMINS: Direct Chat with Chief Admin */}
      {isFacultyOrSubAdmin && (
        <button
          onClick={() => setActivePage('chief-chat')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
            activePage === 'chief-chat'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black shadow-lg shadow-purple-600/30'
              : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/40'
          }`}
        >
          <span>💬 Chat with Chief Admin</span>
          {renderBadge(navBadges.faculty_direct_chat || facultyUnreadFromChief, 1)}
        </button>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => !isPending && !isRejected && setActivePage('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group flex-shrink-0"
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

        {/* Desktop / Laptop Navigation bar (all 8 items with red badges) */}
        {!isPending && !isRejected && (
          <nav className="hidden lg:flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none max-w-3xl">
            {navItems}
          </nav>
        )}

        {/* User Pill & Settings/Logout */}
        <div className="flex items-center space-x-2 flex-shrink-0">
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
            className={`p-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activePage === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Account Settings"
          >
            ⚙️
          </button>

          <button
            onClick={onLogout}
            className="p-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Multi-Device Mobile & Tablet Sub-Navbar: Guarantees all 8 icons + red dots are visible on phones and small laptops */}
      {!isPending && !isRejected && (
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2 px-3 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md scrollbar-none">
          {navItems}
        </div>
      )}
    </header>
  );
}
