import os
import sys
import re
import subprocess
import threading
import webbrowser
import time

def copy_to_clipboard(text):
    try:
        # Windows PowerShell clipboard command
        cmd = f"Set-Clipboard -Value '{text}'"
        subprocess.run(["powershell", "-NoProfile", "-Command", cmd], check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        return True
    except Exception:
        return False

def main():
    os.system("color 0A" if os.name == 'nt' else "")
    print("=" * 80)
    print("   Campus Hub - Allenhouse Institute of Technology")
    print("   Chief Administrator: UTKARSH KUSHWAHA")
    print("   1-Click Worldwide Public Link Generator (Cloudflare Tunnel)")
    print("=" * 80)
    print()
    print("Connecting your local Campus Hub server (Port 8000) to the global internet...")
    print("Please wait 3-5 seconds while secure Cloudflare tunnel is established...")
    print()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    cloudflared_path = os.path.join(base_dir, "cloudflared.exe")
    desktop_cloudflared = os.path.join(os.path.expanduser("~"), "Desktop", "cloudflared.exe")

    if os.path.exists(cloudflared_path):
        binary = cloudflared_path
        cmd = [binary, "tunnel", "--url", "http://127.0.0.1:8000"]
    elif os.path.exists(desktop_cloudflared):
        binary = desktop_cloudflared
        cmd = [binary, "tunnel", "--url", "http://127.0.0.1:8000"]
    else:
        cmd = ["npx", "--yes", "cloudflared", "tunnel", "--url", "http://127.0.0.1:8000"]

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
    except Exception as e:
        print(f"Error launching cloudflared: {e}")
        input("Press Enter to exit...")
        return

    tunnel_url = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    for line in iter(proc.stdout.readline, ''):
        if not line:
            break

        # Check for trycloudflare URL
        match = url_pattern.search(line)
        if match and not tunnel_url:
            tunnel_url = match.group(0)
            copied = copy_to_clipboard(tunnel_url)

            # Banner display
            print("\n" + "=" * 80)
            print("🎉 SUCCESS! YOUR LIVE WORLDWIDE PUBLIC LINK IS READY:")
            print()
            print(f"   👉  {tunnel_url}")
            print()
            if copied:
                print("   ✅ AUTOMATICALLY COPIED TO YOUR CLIPBOARD! (Press Ctrl + V to paste)")
            else:
                print("   👉 Copy the link above and share it on WhatsApp, Telegram, or Discord!")
            print("=" * 80)
            print()
            print("📱 WHAT HAPPENS WHEN ANYONE CLICKS THIS LINK ANYWHERE IN THE WORLD:")
            print("   1. They can open it on their mobile phone or laptop (no setup needed).")
            print("   2. They can Sign Up / Sign In with their college account.")
            print("   3. When they submit a Problem in the Problem Box -> It appears directly on your screen!")
            print("   4. When they chat or send requests -> It connects directly to your laptop in real time!")
            print()
            print("⚠️  KEEP THIS WINDOW OPEN to keep your website online worldwide.")
            print("    (To stop sharing, simply close this window)")
            print("=" * 80)
            print()

            # Open automatically in browser
            try:
                webbrowser.open(tunnel_url)
            except Exception:
                pass

        # Print minimal heartbeat/status if URL not found yet
        if not tunnel_url:
            if "Requesting new quick Tunnel" in line or "Created" in line:
                print("   Connecting to Cloudflare edge nodes...")
        else:
            # Show connection activity
            if "Registered tunnel connection" in line:
                print(f"[{time.strftime('%H:%M:%S')}] Tunnel connection active and ready.")
            elif "HTTP" in line and ("200" in line or "POST" in line or "GET" in line):
                print(f"[{time.strftime('%H:%M:%S')}] Incoming request: {line.strip()[:80]}")

    proc.wait()

if __name__ == "__main__":
    main()
