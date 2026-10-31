import os
import sys
import time
import socket
import threading
import webbrowser
import subprocess

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure backend directory is in python search path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Change working directory to backend
os.chdir(backend_dir)

def free_port(port=8000):
    """
    Kills any orphaned/stale processes holding the target port.
    Prevents '[Errno 10048] address already in use' when re-opening or restarting.
    """
    if sys.platform == "win32":
        try:
            cmd = f'netstat -ano | findstr :{port}'
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            current_pid = os.getpid()
            for line in proc.stdout.splitlines():
                if "LISTENING" in line:
                    parts = line.strip().split()
                    if parts:
                        pid = int(parts[-1])
                        if pid != current_pid and pid != 0:
                            subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                            print(f"  * Cleaned stale process PID {pid} on port {port}")
        except Exception:
            pass

def get_lan_ip():
    """Detects local network IP address for multi-device access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.0)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def open_browser_delayed(url, delay=1.5):
    """Opens default browser after server initializes."""
    def _open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
        except Exception:
            pass
    t = threading.Thread(target=_open, daemon=True)
    t.start()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    # 1. Cleanly release port 8000 if occupied by previous session
    free_port(port)

    lan_ip = get_lan_ip()

    print("==================================================================")
    print("  * Campus Hub - Allenhouse Institute of Technology")
    print("  * Chief Administrator: UTKARSH KUSHWAHA")
    print("------------------------------------------------------------------")
    print(f"  * Local Access (This Laptop):     http://localhost:{port}")
    if lan_ip != "127.0.0.1":
        print(f"  * Same Wi-Fi / Hotspot Access:   http://{lan_ip}:{port}")
        print("    (Share the URL above with anyone on your Wi-Fi or Hotspot)")
    print("  * Press Ctrl+C to stop the server.")
    print("==================================================================")

    # 2. Automatically launch browser if interactive
    if os.getenv("AUTO_OPEN_BROWSER", "true").lower() != "false":
        open_browser_delayed(f"http://localhost:{port}")

    # 3. Start Uvicorn cleanly without crashing on background sessions
    import uvicorn
    reload_env = os.getenv("UVICORN_RELOAD", "false").lower() in ("true", "1")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload_env)
