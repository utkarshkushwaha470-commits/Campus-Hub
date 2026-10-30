import os
import sys
import webbrowser

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.chdir(backend_dir)

if __name__ == "__main__":
    import uvicorn
    print("==================================================================")
    print("  * Brogrammers PWA Server")
    print("  * College: Apex Institute of Technology")
    print("  * URL: http://localhost:8000")
    print("  * Press Ctrl+C to stop the server.")
    print("==================================================================")
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
