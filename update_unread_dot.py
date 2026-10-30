import os

# 1. Update Navbar.jsx
navbar_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\components\Navbar.jsx"
with open(navbar_path, "r", encoding="utf-8") as f:
    nav = f.read()

nav = nav.replace(
    "export default function Navbar({ user, activePage, setActivePage, onLogout }) {",
    "export default function Navbar({ user, activePage, setActivePage, onLogout, hasUnreadMessages }) {"
)

old_chat_pill = """            {/* Instagram Style Chat Nav Pill */}
            <button
              onClick={() => setActivePage('chat')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activePage === 'chat'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>💬 Campus DMs</span>
            </button>"""

new_chat_pill = """            {/* Instagram Style Chat Nav Pill with Unread Dot */}
            <button
              onClick={() => setActivePage('chat')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
                activePage === 'chat'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>💬 Campus DMs</span>
              {hasUnreadMessages && (
                <span className="relative flex h-2.5 w-2.5 ml-0.5" title="New Message Received!">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-md shadow-rose-500/50"></span>
                </span>
              )}
            </button>"""

nav = nav.replace(old_chat_pill, new_chat_pill)
with open(navbar_path, "w", encoding="utf-8") as f:
    f.write(nav)
print("Navbar.jsx updated with notification dot!")

# 2. Update App.jsx
app_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\App.jsx"
with open(app_path, "r", encoding="utf-8") as f:
    app_code = f.read()

# Add hasUnreadMessages state
if "hasUnreadMessages" not in app_code:
    app_code = app_code.replace(
        "const [liveAlert, setLiveAlert] = useState(null);",
        "const [liveAlert, setLiveAlert] = useState(null);\n  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);"
    )

# Clear unread when clicking chat
app_code = app_code.replace(
    "activePage === 'chat' && (\n          <CampusChatPage user={user} />",
    "activePage === 'chat' && (\n          <CampusChatPage user={user} onClearUnread={() => setHasUnreadMessages(false)} />"
)

# Add periodic unread inbox polling in App.jsx
unread_poll = """  // Unread chat polling & notification dot
  useEffect(() => {
    if (!user || user.status !== 'APPROVED') return;

    const checkUnread = async () => {
      try {
        const { api } = await import('./services/api');
        const inbox = await api.getChatInbox();
        if (Array.isArray(inbox)) {
          const hasUnread = inbox.some((t) => t.unread_count > 0);
          if (hasUnread && activePage !== 'chat') {
            setHasUnreadMessages(true);
          }
        }
      } catch (err) {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, [user, activePage]);
"""

if "Unread chat polling & notification dot" not in app_code:
    app_code = app_code.replace(
        "return () => {\n      if (socket) socket.close();\n    };\n  }, [user]);",
        "return () => {\n      if (socket) socket.close();\n    };\n  }, [user]);\n\n" + unread_poll
    )

# Pass hasUnreadMessages to Navbar
app_code = app_code.replace(
    "setActivePage={setActivePage}\n        onLogout={handleLogout}\n      />",
    "setActivePage={(page) => {\n          if (page === 'chat') setHasUnreadMessages(false);\n          setActivePage(page);\n        }}\n        onLogout={handleLogout}\n        hasUnreadMessages={hasUnreadMessages}\n      />"
)

# Add dot to Mobile Bottom Nav
old_mobile_chat = """        <button
          onClick={() => setActivePage('chat')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activePage === 'chat' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>"""

new_mobile_chat = """        <button
          onClick={() => {
            setHasUnreadMessages(false);
            setActivePage('chat');
          }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative ${
            activePage === 'chat' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm shadow-rose-500"></span>
              </span>
            )}
          </div>
          Chat
        </button>"""

app_code = app_code.replace(old_mobile_chat, new_mobile_chat)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(app_code)
print("App.jsx updated with unread message tracking and dot badge!")
