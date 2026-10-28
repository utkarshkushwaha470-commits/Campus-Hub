import json
from typing import Dict, List
from fastapi import WebSocket

class WebSocketConnectionManager:
    """
    Manages active WebSocket connections for:
    1. Real-time one-to-one query chat threads.
    2. Real-time campus-wide and targeted year notification broadcasts.
    """

    def __init__(self):
        # Maps user_id -> list of active WebSockets
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # Maps thread_id -> list of active WebSockets
        self.thread_rooms: Dict[str, List[WebSocket]] = {}

    async def connect_user(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    def disconnect_user(self, user_id: str, websocket: WebSocket):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def join_thread(self, thread_id: str, websocket: WebSocket):
        if thread_id not in self.thread_rooms:
            self.thread_rooms[thread_id] = []
        if websocket not in self.thread_rooms[thread_id]:
            self.thread_rooms[thread_id].append(websocket)

    def leave_thread(self, thread_id: str, websocket: WebSocket):
        if thread_id in self.thread_rooms:
            if websocket in self.thread_rooms[thread_id]:
                self.thread_rooms[thread_id].remove(websocket)
            if not self.thread_rooms[thread_id]:
                del self.thread_rooms[thread_id]

    async def broadcast_to_thread(self, thread_id: str, message: dict):
        if thread_id in self.thread_rooms:
            dead_sockets = []
            for ws in self.thread_rooms[thread_id]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead_sockets.append(ws)
            for ds in dead_sockets:
                self.leave_thread(thread_id, ds)

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            dead_sockets = []
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead_sockets.append(ws)
            for ds in dead_sockets:
                self.disconnect_user(user_id, ds)

    async def broadcast_notification(self, notification_data: dict, target_year: int = None):
        """Broadcasts notification payload across connected client sockets."""
        payload = json.dumps({"type": "NOTIFICATION", "data": notification_data})
        for user_id, sockets in list(self.user_connections.items()):
            for ws in list(sockets):
                try:
                    await ws.send_text(payload)
                except Exception:
                    self.disconnect_user(user_id, ws)

ws_manager = WebSocketConnectionManager()
