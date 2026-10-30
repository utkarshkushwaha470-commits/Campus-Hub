import os
import sys
import socket
import webbrowser

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

def get_lan_ip():
    """Detects local network IP address for multi-device access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    import uvicorn
    lan_ip = get_lan_ip()
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    print("==================================================================")
    print("  * Campus Hub - Allenhouse Institute of Technology")
    print("  * Chief Administrator: UTKARSH KUSHWAHA")
    print("------------------------------------------------------------------")
    print(f"  * Local Access (This Laptop):    http://localhost:{port}")
    if lan_ip != "127.0.0.1":
        print(f"  * Other Laptops / Mobile Phones:  http://{lan_ip}:{port}")
        print("    (Share the URL above with anyone on the same Wi-Fi/Network)")
    print("  * Press Ctrl+C to stop the server.")
    print("==================================================================")
    
    try:
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass

    # Listen on 0.0.0.0 to accept connections from other laptops and phones
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
