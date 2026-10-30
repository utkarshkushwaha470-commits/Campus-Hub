import os
import sys

# Find root dir and run the main run.py
cur_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(cur_dir)
main_run = os.path.join(root_dir, "run.py")

if os.path.exists(main_run):
    # Execute root run.py
    with open(main_run, "r", encoding="utf-8") as f:
        code = f.read()
    exec(compile(code, main_run, "exec"), {"__name__": "__main__", "__file__": main_run})
else:
    # Fallback to local execution
    import socket
    import subprocess
    import webbrowser
    import uvicorn

    if cur_dir not in sys.path:
        sys.path.insert(0, cur_dir)
    os.chdir(cur_dir)

    # Free port 8000
    try:
        proc = subprocess.run('netstat -ano | findstr :8000', shell=True, capture_output=True, text=True)
        for line in proc.stdout.splitlines():
            if "LISTENING" in line:
                pid = int(line.strip().split()[-1])
                if pid != os.getpid() and pid != 0:
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
    except Exception:
        pass

    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
