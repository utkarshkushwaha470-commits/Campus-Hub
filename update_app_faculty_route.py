import os

path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\App.jsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add import
if "FacultyChiefChatPage" not in code:
    code = code.replace(
        "import SettingsPage from './pages/SettingsPage';",
        "import SettingsPage from './pages/SettingsPage';\nimport FacultyChiefChatPage from './pages/FacultyChiefChatPage';"
    )

# 2. Add route
if "FacultyChiefChatPage user={user}" not in code:
    code = code.replace(
        "{activePage === 'settings' && (",
        "{activePage === 'chief-chat' && user.role === 'FACULTY' && (\n          <FacultyChiefChatPage user={user} />\n        )}\n        {activePage === 'settings' && ("
    )

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("App.jsx updated with FacultyChiefChatPage route!")
