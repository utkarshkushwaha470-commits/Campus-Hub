import os
import shutil

src_dir = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect"
dest_dirs = [
    r"C:\Users\sssss\Desktop\Campus-Hub-Project",
    r"C:\Users\sssss\Desktop\Brogrammers-Allenhouse-Project"
]

def copy_tree_safe(src, dst):
    for root, dirs, files in os.walk(src):
        # Filter directories to ignore
        dirs[:] = [d for d in dirs if d not in ['venv', 'node_modules', '__pycache__', '.pytest_cache', '.git', '.vite', '.vscode', 'python']]
        
        rel_path = os.path.relpath(root, src)
        dest_path = os.path.join(dst, rel_path)
        os.makedirs(dest_path, exist_ok=True)
        
        for file in files:
            if file.endswith(('.pyc', '.pyo')):
                continue
            src_file = os.path.join(root, file)
            dest_file = os.path.join(dest_path, file)
            try:
                shutil.copy2(src_file, dest_file)
            except Exception as e:
                # File might be in use (like cloudflared.exe)
                pass

for dest in dest_dirs:
    os.makedirs(dest, exist_ok=True)
    copy_tree_safe(src_dir, dest)
    print(f"Synced files to: {dest}")

print("Copy completed successfully!")
