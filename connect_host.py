import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import webbrowser
import subprocess

def get_saved_live_url():
    paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "LIVE_SERVER_URL.txt"),
        os.path.join(os.path.expanduser("~"), "Desktop", "LIVE_SERVER_URL.txt"),
        os.path.join(os.path.expanduser("~"), "Desktop", "Campus-Hub-Project", "LIVE_SERVER_URL.txt")
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    url = f.read().strip()
                    if url and ("http://" in url or "https://" in url):
                        return url
            except Exception:
                pass
    return None

def main():
    if os.name == 'nt':
        os.system("color 0B")
    print("=" * 80)
    print("   Campus Hub - Allenhouse Institute of Technology")
    print("   Connect to Chief Administrator UTKARSH KUSHWAHA's Live Server")
    print("=" * 80)
    print()
    print("   This script connects your local Campus Hub client to the central server")
    print("   running on Chief Administrator Utkarsh Kushwaha's laptop.")
    print()
    print("   All student/faculty logins, doubt discussions, Problem Box grievances,")
    print("   and AskUp messages will sync directly to Utkarsh's database in real time.")
    print("=" * 80)
    print()

    saved_url = get_saved_live_url()
    if saved_url:
        print(f"[*] Detected Utkarsh's Active Live Server:")
        print(f"    👉 {saved_url}")
        print()
        prompt_text = f"Press Enter to connect to this server, or paste a new URL: "
    else:
        print("Enter Chief Administrator Utkarsh Kushwaha's live link.")
        print("Examples:")
        print("  - Cloudflare Public Link: https://example.trycloudflare.com")
        print("  - Local Wi-Fi / Hotspot:  http://192.168.31.46:8000")
        print()
        prompt_text = "Enter Server Link: "

    user_input = input(prompt_text).strip()
    if not user_input:
        target_url = saved_url if saved_url else "http://localhost:8000"
    else:
        target_url = user_input

    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    clean_url = target_url.rstrip("/")

    # Update frontend/.env
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    if os.path.exists(frontend_dir):
        env_file = os.path.join(frontend_dir, ".env")
        try:
            with open(env_file, "w", encoding="utf-8") as f:
                f.write(f"VITE_API_BASE_URL={clean_url}\n")
            print(f"[OK] Configured frontend/.env -> VITE_API_BASE_URL={clean_url}")
        except Exception as e:
            print(f"Note: Could not write .env: {e}")

    print()
    print("=" * 80)
    print(f"🎉 CONNECTED! Routing all Campus Hub requests to Utkarsh Kushwaha's Server:")
    print(f"   👉 {clean_url}")
    print("=" * 80)
    print()

    # Open web browser directly to the server or with ?server parameter
    open_url = clean_url
    print(f"Opening Campus Hub in your browser now: {open_url}")
    try:
        webbrowser.open(open_url)
    except Exception:
        pass

    print()
    print("All done! Any actions you perform in the browser will sync to Utkarsh's laptop.")
    print("Press Enter to close this window.")
    input()

if __name__ == "__main__":
    main()
