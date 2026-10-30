import React, { useState, useEffect } from 'react';
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
import { getCurrentUser, removeAuthToken, removeCurrentUser } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [activePage, setActivePage] = useState('dashboard');
  const [liveAlert, setLiveAlert] = useState(null);

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  // Real-time WebSocket connection for live campus notifications
  useEffect(() => {
    if (!user || user.status !== 'APPROVED') return;

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
            setTimeout(() => setLiveAlert(null), 6000);
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

  // 2. Pending or Rejected Status View: User CANNOT access anything except waiting screen
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Alert for Instant Real-Time WebSocket Push */}
      {liveAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-blue-600 text-white p-4 rounded-2xl shadow-2xl border border-blue-400 animate-bounce">
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
        setActivePage={setActivePage}
        onLogout={handleLogout}
      />

      {/* Main Routed Area */}
      <main className="flex-1 pb-16">
        {activePage === 'dashboard' && (
          <DashboardPage user={user} onNavigate={(page) => setActivePage(page)} />
        )}
        {activePage === 'chat' && (
          <CampusChatPage user={user} />
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
        {activePage === 'settings' && (
          <SettingsPage user={user} onUserUpdated={(updated) => setUser(updated)} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Instagram PWA Experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex justify-around py-2.5 px-1">
        <button
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'dashboard' ? 'text-blue-500' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>

        <button
          onClick={() => setActivePage('chat')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'chat' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>

        <button
          onClick={() => setActivePage('year-sections')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'year-sections' ? 'text-blue-500' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sections
        </button>

        <button
          onClick={() => setActivePage('problem-box')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'problem-box' ? 'text-amber-500' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
          </svg>
          Problem Box
        </button>

        <button
          onClick={() => setActivePage('leaderboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'leaderboard' ? 'text-emerald-500' : 'text-slate-400'
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
