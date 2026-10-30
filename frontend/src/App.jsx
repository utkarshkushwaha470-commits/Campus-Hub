import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import VerificationWaitingPage from './pages/VerificationWaitingPage';
import DashboardPage from './pages/DashboardPage';
import YearSectionPage from './pages/YearSectionPage';
import PremiumSectionPage from './pages/PremiumSectionPage';
import ProblemBoxPage from './pages/ProblemBoxPage';
import AdminVerificationPage from './pages/AdminVerificationPage';
import LeaderboardPage from './pages/LeaderboardPage';
import CampusChatPage from './pages/CampusChatPage';
import CampusGroupsPage from './pages/CampusGroupsPage';
import SettingsPage from './pages/SettingsPage';
import FacultyChiefChatPage from './pages/FacultyChiefChatPage';
import ChiefFacultyChatPage from './pages/ChiefFacultyChatPage';
import { api, getCurrentUser, removeAuthToken, removeCurrentUser } from './services/api';

// Web Audio API Synthesizer Chime (Zero External Dependencies, WhatsApp/Telegram feel)
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant high melodic notification double-beep (F#5 -> B5)
    osc.frequency.setValueAtTime(739.99, ctx.currentTime);
    osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio autoplay restrictions before user gesture
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [activePage, setActivePage] = useState('dashboard');
  
  // Notification states
  const [liveAlert, setLiveAlert] = useState(null);
  const [popupToast, setPopupToast] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [problemPendingCount, setProblemPendingCount] = useState(0);
  const [navBadges, setNavBadges] = useState({
    dashboard: 0,
    campus_dm: 0,
    year_sections: 0,
    groups: 0,
    problem_box: 0,
    leaderboard: 0,
    admin_portal: 0,
    faculty_direct_chat: 0
  });
  
  // Track previous counts to detect fresh incoming messages
  const prevChatCountRef = useRef(0);
  const prevProblemCountRef = useRef(0);
  const prevRepliedCountRef = useRef(0);

  const isAdmin = user?.role === 'ADMIN' || Boolean(user?.is_chief_admin) || user?.email?.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com';

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  // Real-time WebSocket connection for live notifications
  useEffect(() => {
    if (!user || user.status !== 'APPROVED') return;
    if (window.location.host.includes('vercel.app')) return; // Vercel serverless uses the resilient polling poller

    let socket;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live/${user.id}`;
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'NOTIFICATION') {
            setLiveAlert(msg.data);
            playNotificationChime();
            setTimeout(() => setLiveAlert(null), 6000);
          } else if (msg.type === 'PROBLEM_BOX_REPLY') {
            playNotificationChime();
            setPopupToast({
              id: Date.now(),
              icon: '📬',
              title: 'Official Problem Box Reply!',
              subtitle: `Response to "${msg.subject}": ${msg.response_text?.slice(0, 60)}...`,
              targetPage: 'problem-box'
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (err) {
      console.log('WebSocket connect skipped in dev environment:', err);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [user]);

  // Periodic polling for unread messages & problem box alerts
  useEffect(() => {
    if (!user || user.status !== 'APPROVED') return;

    const checkIncomingUpdates = async () => {
      try {
        // Real-time synchronization across all devices
        const badges = await api.getNavBadges();
        if (badges) {
          setNavBadges(badges);
          const totalUnread = badges.campus_dm || 0;
          setUnreadChatCount(totalUnread);
          setHasUnreadMessages(totalUnread > 0);

          if (totalUnread > prevChatCountRef.current && prevChatCountRef.current !== 0) {
            playNotificationChime();
            setPopupToast({
              id: Date.now(),
              icon: '💬',
              title: 'New Campus DM!',
              subtitle: 'You received a new direct message',
              targetPage: 'chat'
            });
          }
          prevChatCountRef.current = totalUnread;

          if (isAdmin) {
            const pending = badges.problem_box || 0;
            setProblemPendingCount(pending);
            if (pending > prevProblemCountRef.current && prevProblemCountRef.current !== 0) {
              playNotificationChime();
              setPopupToast({
                id: Date.now(),
                icon: '📬',
                title: 'New Problem Box Incident!',
                subtitle: 'A student submitted a confidential report',
                targetPage: 'problem-box'
              });
            }
            prevProblemCountRef.current = pending;
          } else {
            const repliedCount = badges.problem_box || 0;
            if (repliedCount > prevRepliedCountRef.current && prevRepliedCountRef.current !== 0) {
              playNotificationChime();
              setPopupToast({
                id: Date.now(),
                icon: '📬',
                title: 'Admin Replied to Problem Box!',
                subtitle: 'Your grievance has received an administrative response',
                targetPage: 'problem-box'
              });
            }
            prevRepliedCountRef.current = repliedCount;
          }
        }

        // 1. Campus Chat DMs Unread Check
        const inbox = await api.getChatInbox();
        if (Array.isArray(inbox)) {
          const totalUnread = inbox.reduce((sum, item) => sum + (item.unread_count || 0), 0);
          setUnreadChatCount(totalUnread);
          setHasUnreadMessages(totalUnread > 0);

          // If new unread message arrived from someone
          if (totalUnread > prevChatCountRef.current && prevChatCountRef.current !== 0) {
            playNotificationChime();
            const unreadThread = inbox.find(t => t.unread_count > 0);
            if (unreadThread) {
              setPopupToast({
                id: Date.now(),
                icon: '💬',
                title: `New Message from ${unreadThread.peer?.full_name || 'Classmate'}`,
                subtitle: unreadThread.last_message || 'Sent an attachment',
                targetPage: 'chat'
              });
            }
          }
          prevChatCountRef.current = totalUnread;
        }

        // 2. Problem Box Grievances Check
        if (isAdmin) {
          const queue = await api.getProblemBoxAdminQueue();
          if (Array.isArray(queue)) {
            const pending = queue.filter(m => m.status === 'SUBMITTED').length;
            setProblemPendingCount(pending);

            if (pending > prevProblemCountRef.current && prevProblemCountRef.current !== 0) {
              playNotificationChime();
              const latestMsg = queue.find(m => m.status === 'SUBMITTED');
              setPopupToast({
                id: Date.now(),
                icon: '📬',
                title: `New Problem Box Incident!`,
                subtitle: `${latestMsg?.student_name || 'Student'}: ${latestMsg?.subject || 'Concern reported'}`,
                targetPage: 'problem-box'
              });
            }
            prevProblemCountRef.current = pending;
          }
        } else {
          // Student: Check if any submitted message has newly been replied to
          const myMsgs = await api.getMyProblemMessages();
          if (Array.isArray(myMsgs)) {
            const repliedCount = myMsgs.filter(m => m.status === 'REPLIED').length;
            if (repliedCount > prevRepliedCountRef.current && prevRepliedCountRef.current !== 0) {
              playNotificationChime();
              const latestReplied = myMsgs.find(m => m.status === 'REPLIED');
              setPopupToast({
                id: Date.now(),
                icon: '📬',
                title: `Admin Replied to Problem Box!`,
                subtitle: `Subject: ${latestReplied?.subject}`,
                targetPage: 'problem-box'
              });
            }
            prevRepliedCountRef.current = repliedCount;
          }
        }
      } catch (err) {}
    };

    checkIncomingUpdates();
    const interval = setInterval(checkIncomingUpdates, 4000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Auto-dismiss popup toast after 6 seconds
  useEffect(() => {
    if (!popupToast) return;
    const timer = setTimeout(() => {
      setPopupToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [popupToast]);

  const handleLogout = () => {
    removeAuthToken();
    removeCurrentUser();
    setUser(null);
    setAuthView('login');
    setActivePage('dashboard');
  };

  // 1. Not Logged In View
  if (!user) {
    if (authView === 'signup') {
      return (
        <SignUpPage
          onSignUpSuccess={(newUser) => setUser(newUser)}
          onGoToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
        onGoToSignUp={() => setAuthView('signup')}
      />
    );
  }

  // 2. Pending or Rejected Status View
  if (user.status === 'PENDING' || user.status === 'REJECTED') {
    return (
      <VerificationWaitingPage
        user={user}
        onRefreshUser={(updated) => setUser(updated)}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Verified Approved User Experience
  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* ================= TELEGRAM / WHATSAPP STYLE POPUP TOAST ================= */}
      {popupToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-3xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl shadow-indigo-950/80 backdrop-blur-2xl animate-fadeIn flex items-start gap-3.5 ring-1 ring-white/10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-indigo-600/30">
            {popupToast.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{popupToast.title}</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Now</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {popupToast.subtitle}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => {
                  if (popupToast.targetPage) setActivePage(popupToast.targetPage);
                  setPopupToast(null);
                }}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[10px] font-bold shadow-md shadow-indigo-600/25 transition-all"
              >
                View Now ➔
              </button>
              <button
                onClick={() => setPopupToast(null)}
                className="px-2 py-1 rounded-xl text-slate-400 hover:text-white text-[10px] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button 
            onClick={() => setPopupToast(null)} 
            className="text-slate-500 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Broadcast Alert Push */}
      {liveAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-2xl border border-blue-400 animate-bounce">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Campus Broadcast Alert</div>
              <h4 className="font-bold text-sm">{liveAlert.title}</h4>
              <p className="text-xs text-blue-100 mt-1">{liveAlert.body}</p>
            </div>
            <button onClick={() => setLiveAlert(null)} className="text-blue-200 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Persistent Prototype Demo Mode Banner */}
      {user.is_demo && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-2 text-xs flex items-center justify-between shadow-xl sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span>
              <strong>PROTOTYPE DEMO MODE</strong>: Viewing as <strong>{user.full_name}</strong>. Interactive preview only — live data cannot be modified.
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded-lg bg-slate-950 text-amber-300 hover:text-white text-[11px] font-black transition border border-amber-400/40 shadow-sm whitespace-nowrap"
          >
            Exit Demo ➔
          </button>
        </div>
      )}

      {/* Responsive Navbar */}
      <Navbar
        user={user}
        activePage={activePage}
        setActivePage={(page) => {
          if (page === 'chat') setHasUnreadMessages(false);
          setActivePage(page);
        }}
        onLogout={handleLogout}
        hasUnreadMessages={hasUnreadMessages}
        navBadges={navBadges}
      />

      {/* Main Routed Area */}
      <main className="flex-1 pb-16">
        {activePage === 'dashboard' && (
          <DashboardPage user={user} onNavigate={(page) => setActivePage(page)} navBadges={navBadges} />
        )}
        {activePage === 'chat' && (
          <CampusChatPage user={user} onClearUnread={() => setHasUnreadMessages(false)} />
        )}
        {activePage === 'groups' && (
          <CampusGroupsPage user={user} />
        )}
        {activePage === 'year-sections' && (
          <YearSectionPage user={user} />
        )}
        {activePage === 'premium-section' && (
          <PremiumSectionPage user={user} />
        )}
        {activePage === 'problem-box' && (
          <ProblemBoxPage user={user} />
        )}
        {activePage === 'leaderboard' && (
          <LeaderboardPage user={user} />
        )}
        {activePage === 'admin-portal' && user.role === 'ADMIN' && (
          <AdminVerificationPage user={user} onUserUpdated={(updated) => setUser(updated)} />
        )}
        {activePage === 'chief-faculty-chat' && (user.is_chief_admin || (user.email && user.email.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com')) && (
          <ChiefFacultyChatPage user={user} />
        )}
        {activePage === 'chief-chat' && user.role !== 'STUDENT' && !(user.is_chief_admin || (user.email && user.email.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com')) && (
          <FacultyChiefChatPage user={user} />
        )}
        {activePage === 'settings' && (
          <SettingsPage user={user} onUserUpdated={(updated) => setUser(updated)} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Instagram / Telegram PWA Experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 flex justify-around py-2.5 px-1 shadow-2xl">
        <button
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>

        <button
          onClick={() => {
            setHasUnreadMessages(false);
            setActivePage('chat');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative ${
            activePage === 'chat' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500"></span>
              </span>
            )}
          </div>
          Chat
        </button>

        <button
          onClick={() => setActivePage('year-sections')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'year-sections' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sections
        </button>

        <button
          onClick={() => setActivePage('problem-box')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative ${
            activePage === 'problem-box' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
            </svg>
            {isAdmin && problemPendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm shadow-rose-500"></span>
              </span>
            )}
          </div>
          Problem Box
        </button>

        <button
          onClick={() => setActivePage('leaderboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'leaderboard' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ranks
        </button>

        {user.role === 'ADMIN' && (
          <button
            onClick={() => setActivePage('admin-portal')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
              activePage === 'admin-portal' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </button>
        )}
      </div>
    </div>
  );
}
