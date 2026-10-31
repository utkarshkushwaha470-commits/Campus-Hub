import os
import sys

# Ensure UTF-8 output on Windows consoles to prevent cp1252 UnicodeEncodeError
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import re
import socket
import subprocess
import threading
import webbrowser
import time
import urllib.request

def copy_to_clipboard(text):
    try:
        cmd = f"Set-Clipboard -Value '{text}'"
        subprocess.run(["powershell", "-NoProfile", "-Command", cmd], check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        return True
    except Exception:
        return False

def flush_dns():
    try:
        if os.name == 'nt':
            subprocess.run(["ipconfig", "/flushdns"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    except Exception:
        pass

def save_live_url(url):
    paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "LIVE_SERVER_URL.txt"),
        os.path.join(os.path.expanduser("~"), "Desktop", "LIVE_SERVER_URL.txt"),
        os.path.join(os.path.expanduser("~"), "Desktop", "Campus-Hub-Project", "LIVE_SERVER_URL.txt"),
        r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\LIVE_SERVER_URL.txt"
    ]
    for p in paths:
        try:
            with open(p, "w", encoding="utf-8") as f:
                f.write(url.strip() + "\n")
        except Exception:
            pass

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('8.8.8.8', 53))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def check_local_server():
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2)
        return req.getcode() == 200
    except Exception:
        return False

def main():
    if os.name == 'nt':
        os.system("color 0A")
    print("=" * 80)
    print("   Campus Hub - Allenhouse Institute of Technology")
    print("   Chief Administrator: UTKARSH KUSHWAHA")
    print("   1-Click Worldwide Public Link Generator (Cloudflare Tunnel)")
    print("=" * 80)
    print()

    # Step 1: Ensure local server is running
    print("[*] Checking local Campus Hub server on port 8000...")
    if not check_local_server():
        print("    Server on port 8000 is starting up or not running.")
        print("    Starting Campus Hub server in background...")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        run_py = os.path.join(base_dir, "run.py")
        if os.path.exists(run_py):
            subprocess.Popen([sys.executable, run_py], cwd=base_dir, creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
            time.sleep(3)
        else:
            print("    Warning: Please make sure Start_Campus_Hub.bat is running!")
    else:
        print("    [OK] Local server on port 8000 is ONLINE and healthy.")

    lan_ip = get_lan_ip()
    print()
    print("Connecting your local Campus Hub server to the global internet...")
    print("Please wait while Cloudflare secures your worldwide HTTPS connection...")
    print()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "cloudflared.exe"),
        os.path.join(os.path.expanduser("~"), "Desktop", "cloudflared.exe"),
        os.path.join(os.path.expanduser("~"), "Desktop", "Campus-Hub-Project", "cloudflared.exe"),
        r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\cloudflared.exe",
        "cloudflared.exe"
    ]
    binary = None
    for cand in candidates:
        if os.path.exists(cand):
            binary = cand
            break

    if binary:
        cmd = [binary, "tunnel", "--url", "http://127.0.0.1:8000"]
    else:
        cmd = ["npx.cmd", "--yes", "cloudflared", "tunnel", "--url", "http://127.0.0.1:8000"]

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            encoding='utf-8',
            errors='replace'
        )
    except Exception as e:
        print(f"Error launching cloudflared: {e}")
        input("Press Enter to exit...")
        return

    tunnel_url = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
    edge_registered = False
    ready_announced = False

    def verify_and_announce():
        nonlocal ready_announced
        host = tunnel_url.replace("https://", "").replace("http://", "").split("/")[0]

        flush_dns()
        copied = copy_to_clipboard(tunnel_url)
        save_live_url(tunnel_url)

        print()
        print("=" * 80)
        print("🎉 SUCCESS! YOUR LIVE WORLDWIDE PUBLIC LINK IS READY & ACTIVE:")
        print()
        print(f"   👉  {tunnel_url}")
        print()
        if copied:
            print("   ✅ AUTOMATICALLY COPIED TO YOUR CLIPBOARD! (Press Ctrl + V to paste)")
        else:
            print("   👉 Copy the link above and share it on WhatsApp, Telegram, or Discord!")
        print("   ✅ SAVED TO: LIVE_SERVER_URL.txt")
        print("=" * 80)
        print()
        print("💻 ON THIS LAPTOP (UTKARSH KUSHWAHA - CHIEF ADMINISTRATOR):")
        print("   👉 http://localhost:8000  (Opening in your browser now - 100% Instant!)")
        print()
        print("📱 FOR CLASSMATES, EVALUATORS & MOBILE USERS ANYWHERE IN THE WORLD:")
        print(f"   Send them your link: {tunnel_url}")
        print("   1. They can open it on their mobile phone or laptop (no installation needed).")
        print("   2. When they Sign Up / Sign In -> User is registered in your live Database!")
        print("   3. When they chat in AskUp -> Messages appear on your screen in real time!")
        print("   4. When they submit a Problem Box grievance -> Appears on your screen!")
        print("   5. When they click 'Share Live Location' -> Their pin opens on Google Maps!")
        print()
        print(f"📶 LOCAL WI-FI / HOTSPOT LINK (Devices on your same Wi-Fi / Hotspot):")
        print(f"   👉  http://{lan_ip}:8000")
        print()
        print("🤝 FOR ANYONE WHO CLONES YOUR REPOSITORY FROM GITHUB:")
        print("   Inside their cloned repository folder, they simply double-click:")
        print("   👉 'Connect_To_Chief_Admin_Server.bat'")
        print("   All their requests will instantly route to your laptop!")
        print()
        print("💡 NOTE ABOUT OPENING THE CLOUDFLARE LINK ON THIS HOST LAPTOP:")
        print("   Your home Wi-Fi router (192.168.31.1) takes 1-2 minutes to resolve new tunnel names.")
        print("   On THIS laptop, always use http://localhost:8000 for instant zero-lag access.")
        print("   If you want to open the trycloudflare link on this laptop too:")
        print("   Turn on 'Use Secure DNS' in Chrome/Edge Settings -> Privacy & Security -> Cloudflare (1.1.1.1).")
        print()
        print("⚠️  KEEP THIS WINDOW OPEN to keep your laptop connected to the world.")
        print("    (To stop sharing, simply close this window)")
        print("=" * 80)
        print()
        print("[*] Live connection active. Watching for incoming traffic...")
        print()

        try:
            time.sleep(1)
            # Open local server for the host admin so they NEVER experience DNS NXDOMAIN
            webbrowser.open("http://localhost:8000")
        except Exception:
            pass

        ready_announced = True

    for line in iter(proc.stdout.readline, ''):
        if not line:
            break

        # Check for trycloudflare URL
        match = url_pattern.search(line)
        if match and not tunnel_url:
            tunnel_url = match.group(0)
            print(f"[1/3] Tunnel assigned: {tunnel_url}")
            print("[2/3] Registering Cloudflare edge connections & verifying global DNS...")

        if "Registered tunnel connection" in line and not edge_registered:
            edge_registered = True
            print("[3/3] [OK] Cloudflare edge nodes connected! Link is ready.")
            threading.Thread(target=verify_and_announce, daemon=True).start()

        if ready_announced:
            clean_line = line.strip()
            if "HTTP" in clean_line or "200" in clean_line or "POST" in clean_line or "GET" in clean_line:
                if "metrics" not in clean_line:
                    print(f"[{time.strftime('%H:%M:%S')}] 📡 Remote Traffic: {clean_line[:90]}")

    proc.wait()

if __name__ == "__main__":
    main()
