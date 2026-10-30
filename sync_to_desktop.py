import os
import shutil

src_dir = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect"
dest_dirs = [
    r"C:\Users\sssss\Desktop\Campus-Hub-Project",
    r"C:\Users\sssss\Desktop\Brogrammers-Allenhouse-Project"
]

def ignore_patterns(dir_path, names):
    ignored = set()
    for name in names:
        if name in ['venv', 'node_modules', '__pycache__', '.pytest_cache', '.git', '.vite', '.vscode', 'python']:
            ignored.add(name)
        elif name.endswith(('.pyc', '.pyo')):
            ignored.add(name)
    return ignored

for dest in dest_dirs:
    os.makedirs(dest, exist_ok=True)
    # Copy backend, frontend, run.py, README.md, requirements.txt, .gitignore, start_campusconnect.bat
    shutil.copytree(src_dir, dest, ignore=ignore_patterns, dirs_exist_ok=True)
    print(f"Synced files to: {dest}")

print("Copy completed successfully!")
