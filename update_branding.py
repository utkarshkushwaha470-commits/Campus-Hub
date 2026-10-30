import os
import re

scratch_dir = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect"

# 1. run.py
run_py = os.path.join(scratch_dir, "run.py")
if os.path.exists(run_py):
    with open(run_py, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("Brogrammers PWA Server", "Campus Hub PWA Server")
    c = c.replace("Brogrammers Server", "Campus Hub Server")
    with open(run_py, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated run.py")

# 2. frontend/index.html
index_html = os.path.join(scratch_dir, "frontend", "index.html")
if os.path.exists(index_html):
    with open(index_html, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("<title>Brogrammers - Allenhouse Institute of Technology</title>", "<title>Campus Hub - Allenhouse Institute of Technology</title>")
    c = c.replace("Brogrammers", "Campus Hub")
    with open(index_html, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated frontend/index.html")

# 3. frontend/src/components/Navbar.jsx
navbar_jsx = os.path.join(scratch_dir, "frontend", "src", "components", "Navbar.jsx")
if os.path.exists(navbar_jsx):
    with open(navbar_jsx, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("Brogrammers", "Campus Hub")
    with open(navbar_jsx, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated Navbar.jsx")

# 4. frontend/src/pages/LoginPage.jsx
login_jsx = os.path.join(scratch_dir, "frontend", "src", "pages", "LoginPage.jsx")
if os.path.exists(login_jsx):
    with open(login_jsx, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace('<h1 className="text-2xl font-bold text-white tracking-tight">Brogrammers</h1>',
                  '<h1 className="text-2xl font-bold text-white tracking-tight">Campus Hub</h1>')
    c = c.replace("'Sign In to Brogrammers'", "'Sign In to Campus Hub'")
    c = c.replace('"Sign In to Brogrammers"', '"Sign In to Campus Hub"')
    with open(login_jsx, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated LoginPage.jsx")

# 5. frontend/src/pages/SignUpPage.jsx
signup_jsx = os.path.join(scratch_dir, "frontend", "src", "pages", "SignUpPage.jsx")
if os.path.exists(signup_jsx):
    with open(signup_jsx, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("Join Brogrammers", "Join Campus Hub")
    with open(signup_jsx, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated SignUpPage.jsx")

# 6. frontend/src/pages/PremiumSectionPage.jsx
prem_jsx = os.path.join(scratch_dir, "frontend", "src", "pages", "PremiumSectionPage.jsx")
if os.path.exists(prem_jsx):
    with open(prem_jsx, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("Brogrammers Premium Section", "Campus Hub Premium Section")
    with open(prem_jsx, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated PremiumSectionPage.jsx")

# 7. frontend/src/App.jsx
app_jsx = os.path.join(scratch_dir, "frontend", "src", "App.jsx")
if os.path.exists(app_jsx):
    with open(app_jsx, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("Brogrammers", "Campus Hub")
    with open(app_jsx, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated App.jsx")

# 8. frontend/public/manifest.json
manifest = os.path.join(scratch_dir, "frontend", "public", "manifest.json")
if os.path.exists(manifest):
    with open(manifest, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace('"name": "Brogrammers"', '"name": "Campus Hub"')
    c = c.replace('"short_name": "Brogrammers"', '"short_name": "Campus Hub"')
    with open(manifest, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated manifest.json")

print("Branding update finished successfully!")
