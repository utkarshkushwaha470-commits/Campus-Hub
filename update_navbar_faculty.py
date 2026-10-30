import os

path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\components\Navbar.jsx"
with open(path, "r", encoding="utf-8") as f:
    nav = f.read()

faculty_nav_button = """            {/* Direct Chat with Chief Admin (Faculty Exclusive - Not available for Students) */}
            {user.role === 'FACULTY' && (
              <button
                onClick={() => setActivePage('chief-chat')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activePage === 'chief-chat'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm font-black'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/40'
                }`}
              >
                <span>👑 Chat with Chief Admin</span>
              </button>
            )}"""

if "Chat with Chief Admin" not in nav:
    nav = nav.replace(
        "            <button\n              onClick={() => setActivePage('settings')}",
        faculty_nav_button + "\n\n            <button\n              onClick={() => setActivePage('settings')}"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(nav)
    print("Navbar.jsx updated with Faculty Direct Chat button!")
else:
    print("Navbar already has Faculty Direct Chat button.")
