import React, { useEffect, useState } from 'react';
import ProfileCard from '../components/ProfileCard';
import { api } from '../services/api';

export default function DashboardPage({ user, onNavigate, navBadges = {} }) {
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const sum = await api.getDashboardSummary();
      setSummary(sum);
      const notifs = await api.listNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasPremiumAccess = user.role === 'PG' || user.role === 'FACULTY' || user.role === 'ADMIN';
  const renderBadge = (count) => {
    if (!count || count <= 0) return null;
    return (
      <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-sm shadow-rose-600/50 inline-block leading-none">
        {count}
      </span>
    );
  };


  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Card */}
      <ProfileCard user={user} />

      {/* Admin Quick Access Command Banner */}
      {user.role === 'ADMIN' && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 border border-amber-500/50 p-6 shadow-xl shadow-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                Institutional Control
              </span>
              <span className="text-xs text-amber-300 font-bold">
                • {user.is_chief_admin ? 'Chief Administrator Utkarsh Kushwaha' : 'Institutional Administrator'}
              </span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <span>🛡️ Administrator Command Center</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Full administrative authority active for <strong>{user.full_name}</strong>. Manage student enrollments, create purpose groups, review problem box reports, and oversee college operations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {user.is_chief_admin && (
              <button
                onClick={() => onNavigate('chief-faculty-chat')}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2"
              >
                <span>💬 Faculty Direct Chat</span> {renderBadge(navBadges.faculty_direct_chat)}
              </button>
            )}
            <button
              onClick={() => onNavigate('admin-portal')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 flex-shrink-0"
            >
              <span>🛡️ Enter Admin Portal</span> {renderBadge(navBadges.admin_portal)}
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Faculty Quick Access Direct Chat Banner */}
      {user.role === 'FACULTY' && (
        <div className="rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/50 border border-purple-500/50 p-6 shadow-xl shadow-purple-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-sm">
                Faculty Executive Channel
              </span>
              <span className="text-xs text-purple-300 font-bold">• Allenhouse Institute of Technology</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <span>💬 Direct Chat with Chief Administrator</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Official personal line open with <strong>UTKARSH KUSHWAHA</strong>. Consult directly on academic approvals, department requirements, and executive clearances.
            </p>
          </div>
          <button
            onClick={() => onNavigate('chief-chat')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 flex-shrink-0"
          >
            <span>💬 Open Chief Admin Chat</span> {renderBadge(navBadges.faculty_direct_chat)}
            <span>➔</span>
          </button>
        </div>
      )}

      {/* Campus Spaces & Core Hubs */}
      <div>
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>Campus Spaces & Core Hubs</span>
          <span className="text-xs font-normal text-slate-400">• Role-Based Permissions Active</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Instagram-Style Ask_Up (NEW) */}
          <div 
            onClick={() => onNavigate('chat')}
            className="group cursor-pointer rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#833ab4]/10 border border-slate-800 hover:border-pink-500/60 p-5 transition-all shadow-lg hover:shadow-pink-500/20 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#833ab4]/30 via-[#fd1d1d]/30 to-[#fcb045]/30 text-pink-400 border border-pink-500/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 22l10-3 10 3L12 2zm0 3.8L18.8 18l-6.8-2-6.8 2L12 5.8z" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h4 className="font-bold text-white text-base">Ask_Up</h4>{renderBadge(navBadges.ask_up || navBadges.campus_dm)}</div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-sm">
                INSTA-DM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Instagram-style direct messaging with peers, live location, photo sharing, and double-tap heart reactions.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-pink-400 font-semibold">
              <span>Open Ask_Up</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 2. Year Sections */}
          <div 
            onClick={() => onNavigate('year-sections')}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-5 transition-all shadow-lg hover:shadow-blue-500/10 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h4 className="font-bold text-white text-base">Year Sections</h4>{renderBadge(navBadges.year_sections)}</div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300">1st - 4th</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Ask doubts in your locked year ({user.locked_year ? `Year ${user.locked_year}` : 'Student'}). Seniors answer to earn Karma points.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-semibold">
              <span>Enter Sections</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 3. Premium Section */}
          <div 
            onClick={() => {
              if (hasPremiumAccess) onNavigate('premium-section');
              else alert('Access Denied: The Premium Section is reserved exclusively for Postgrad (PG) students and Faculty.');
            }}
            className={`group rounded-2xl border p-5 transition-all shadow-lg relative overflow-hidden ${
              hasPremiumAccess 
                ? 'cursor-pointer bg-slate-900 border-slate-800 hover:border-purple-500/50 hover:shadow-purple-500/10'
                : 'cursor-not-allowed bg-slate-950/60 border-slate-900 opacity-70'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Premium Section</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300">
                {hasPremiumAccess ? 'UNLOCKED' : 'PG & FACULTY'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Research guidance, advanced colloquia, and graduate-level academic discussions.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold">
              <span className={hasPremiumAccess ? 'text-purple-400' : 'text-slate-500'}>
                {hasPremiumAccess ? 'Enter Forum' : 'Restricted to PG/Faculty'}
              </span>
              <span className={hasPremiumAccess ? 'group-hover:translate-x-1 transition-transform text-purple-400' : 'text-slate-600'}>
                {hasPremiumAccess ? '→' : '🔒'}
              </span>
            </div>
          </div>

          {/* 4. Problem Box */}
          <div 
            onClick={() => onNavigate('problem-box')}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 transition-all shadow-lg hover:shadow-amber-500/10 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h4 className="font-bold text-white text-base">Problem Box</h4>{renderBadge(navBadges.problem_box)}</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300">CONFIDENTIAL</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Confidential message to college Dean, HOD, or Director. Only the admin sees sender identity.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span>Write Message</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 5. Leaderboard */}
          <div 
            onClick={() => onNavigate('leaderboard')}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 transition-all shadow-lg hover:shadow-emerald-500/10 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h4 className="font-bold text-white text-base">Leaderboard</h4>{renderBadge(navBadges.leaderboard)}</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">RANKINGS</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Star ratings, verified karma points, and top mentors across all academic batches.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span>View Ranks</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 6. Campus Purpose Groups */}
          <div 
            onClick={() => onNavigate('groups')}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-5 transition-all shadow-lg hover:shadow-indigo-500/10 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-xl">🏛️</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h4 className="font-bold text-white text-base">Purpose Groups</h4>{renderBadge(navBadges.groups)}</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300">TASK FORCES</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Institutional task forces, placement prep, committees, and project teams formed by college authorities.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
              <span>View Groups & Directives</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* College Broadcast Alerts */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <h3 className="font-bold text-white text-base">Campus Alerts & Admin Notifications</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{notifications.length} alerts published</span>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No college alerts published currently.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div 
                key={n.id}
                className={`p-4 rounded-xl border transition-all ${
                  n.is_read ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-950 border-blue-900/60 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    {n.title}
                  </h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Target: {n.target_type} {n.target_year ? `Year ${n.target_year}` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.body}</p>
                <div className="mt-2 text-[10px] text-slate-500">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
