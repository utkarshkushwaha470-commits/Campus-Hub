import React from 'react';

export default function ProfileCard({ user }) {
  if (!user) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-slate-800 p-6 shadow-xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Profile Info */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-600/30">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{user.full_name}</h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                {user.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700/50">
                CRN: <strong className="text-white">{user.crn_or_roll_number}</strong>
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700/50">
                Batch: <strong className="text-white">{user.batch}</strong>
              </span>
              {user.locked_year ? (
                <span className="text-xs bg-blue-900/40 text-blue-300 px-2.5 py-0.5 rounded-md font-bold border border-blue-700/50 flex items-center gap-1">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked Year {user.locked_year}
                </span>
              ) : (
                <span className="text-xs bg-purple-900/40 text-purple-300 px-2.5 py-0.5 rounded-md font-bold border border-purple-700/50">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gamification Stats: Points & Level */}
        <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="text-center px-3 border-r border-slate-800">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Karma Points</div>
            <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
              <span>{user.points || 0}</span>
              <span className="text-sm">★</span>
            </div>
          </div>
          <div className="text-center px-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Helper Level</div>
            <div className="text-2xl font-black text-blue-400">
              Lvl {user.level || 1}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
