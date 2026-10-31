import os
import sys

# Ensure backend directory is in sys.path regardless of execution directory
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth, admin, dashboard, queries, chat, ratings,
    problem_box, notifications, moderation, groups
)
from app.services.websocket_manager import ws_manager
from app.services.database_sync_service import (
    trigger_async_database_sync,
    start_continuous_database_watcher,
    export_database_now
)

# Start real-time continuous database watcher so every change syncs instantly to File Explorer
start_continuous_database_watcher()

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Auto-seed essential chief admin and demo accounts
try:
    from seeds import run_seed
    run_seed()
except Exception as e:
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Responsive, mobile-first PWA for campus query resolution, peer ratings, and confidential problem box.",
    version="1.0.0"
)

import time
from starlette.requests import Request

# Live Incoming Request Logger & Real-Time File Explorer Synchronizer
@app.middleware("http")
async def log_incoming_traffic(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    cf_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for") or client_ip
    response = await call_next(request)
    path = request.url.path
    if not (path.startswith("/assets") or path.endswith(".js") or path.endswith(".css") or path.endswith(".png") or path.endswith(".svg") or path == "/favicon.ico"):
        print(f"[{time.strftime('%H:%M:%S')}] 📡 Live Request: {request.method} {path} -> {response.status_code} (Device/IP: {cf_ip})", flush=True)

    # Immediately synchronize database changes to File Explorer on any create/update/delete
    if request.method in ["POST", "PUT", "DELETE", "PATCH"] and response.status_code < 400:
        trigger_async_database_sync()

    return response

# CORS setup for React PWA frontend (supports localhost, LAN IPs, and worldwide tunnels)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(queries.router)
app.include_router(chat.router)
app.include_router(ratings.router)
app.include_router(problem_box.router)
app.include_router(notifications.router)
app.include_router(moderation.router)
app.include_router(groups.router)

# Mount local uploads directory
uploads_dir = os.path.join(settings.STORAGE_LOCAL_DIR, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/storage/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "college": settings.COLLEGE_NAME,
        "ai_engine": settings.GEMMA4_MODEL_NAME,
        "docs": "/docs"
    }

# Real-time WebSocket Endpoints
@app.websocket("/ws/chat/{thread_id}")
async def websocket_chat_endpoint(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    await ws_manager.join_thread(thread_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.broadcast_to_thread(thread_id, {"raw": data})
    except WebSocketDisconnect:
        ws_manager.leave_thread(thread_id, websocket)

@app.websocket("/ws/live/{user_id}")
async def websocket_user_feed(websocket: WebSocket, user_id: str):
    await ws_manager.connect_user(user_id, websocket)
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_user(user_id, websocket)

# Mount Frontend SPA Production Build (if compiled)
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API, WS, docs, or storage
        if full_path.startswith(("api", "ws", "docs", "openapi.json", "storage")):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        no_cache_headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path, headers=no_cache_headers)
        return FileResponse(
            os.path.join(frontend_dist, "index.html"),
            headers=no_cache_headers
        )

if __name__ == "__main__":
    import uvicorn
    import webbrowser
    print("==================================================")
    print("  Starting Campus Hub Server at http://localhost:8000")
    print("==================================================")
    webbrowser.open("http://localhost:8000")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
