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
    print("   and purpose group chats will sync directly to Utkarsh's database in real time.")
    print("=" * 80)
    print()

    print("Enter the Chief Administrator's live public link or local IP address.")
    print("Examples:")
    print("  - Cloudflare Public Link: https://something-random.trycloudflare.com")
    print("  - Local Wi-Fi / Hotspot:  http://192.168.31.46:8000")
    print()
    
    server_input = input("Enter Server Link [or press Enter to open live web portal]: ").strip()
    
    if not server_input:
        server_input = "https://campus-hub-kappa.vercel.app"
    
    if not server_input.startswith("http://") and not server_input.startswith("https://"):
        server_input = "https://" + server_input

    clean_url = server_input.rstrip("/")
    
    # Save to frontend/.env for local npm run dev
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
    print(f"CONNECTING! Routing all Campus Hub requests to:")
    print(f"   👉 {clean_url}")
    print("=" * 80)
    print()
    print("Opening Campus Hub in your browser now...")
    try:
        webbrowser.open(clean_url)
    except Exception:
        pass
    print("Done! Press Enter to close this window.")
    input()

if __name__ == "__main__":
    main()
