import React from 'react';

export default function Navbar({ user, activePage, setActivePage, onLogout }) {
  if (!user) return null;

  const isPending = user.status === 'PENDING';
  const isRejected = user.status === 'REJECTED';
  const isAdmin = user.role === 'ADMIN';
  const isFacultyOrAdmin = user.role === 'FACULTY' || user.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => !isPending && !isRejected && setActivePage('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-extrabold text-lg">C</span>
          </div>
          <div>
            <div className="font-extrabold text-slate-100 text-base leading-tight tracking-tight flex items-center gap-1.5">
              CampusConnect
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/50">PWA</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Apex Institute of Technology</div>
          </div>
        </div>

        {/* Navigation items (if verified) */}
        {!isPending && !isRejected && (
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePage === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActivePage('year-sections')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePage === 'year-sections'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Year Sections
            </button>
            <button
              onClick={() => setActivePage('problem-box')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePage === 'problem-box'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Problem Box
            </button>
            <button
              onClick={() => setActivePage('leaderboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePage === 'leaderboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Leaderboard
            </button>
            {isAdmin && (
              <button
                onClick={() => setActivePage('admin-portal')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activePage === 'admin-portal'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-800/40'
                }`}
              >
                Admin Queue
              </button>
            )}
          </nav>
        )}

        {/* User Pill & Logout */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200">{user.full_name}</span>
            <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400">
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-blue-400 font-semibold">{user.role}</span>
              {user.locked_year ? (
                <span className="text-slate-300">Year {user.locked_year}</span>
              ) : (
                <span className="text-slate-400">{user.batch}</span>
              )}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
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
