from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.chat import Thread, Message, ThreadType
from app.models.moderation import UserBlock
from app.services.auth_service import get_current_verified_user
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/chat", tags=["Real-time 1-to-1 Chat"])

@router.get("/threads")
async def list_user_threads(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Lists all active chat threads for the current student or senior."""
    threads = db.query(Thread).filter(
        (Thread.student_id == current_user.id) | (Thread.senior_id == current_user.id)
    ).order_by(Thread.updated_at.desc()).all()

    results = []
    for t in threads:
        other_user_id = t.senior_id if t.student_id == current_user.id else t.student_id
        other_user = db.query(User).filter(User.id == other_user_id).first()
        last_msg = db.query(Message).filter(Message.thread_id == t.id).order_by(Message.created_at.desc()).first()

        results.append({
            "thread_id": t.id,
            "query_id": t.query_id,
            "other_user": {
                "id": other_user.id if other_user else other_user_id,
                "full_name": other_user.full_name if other_user else "Campus Member",
                "role": other_user.role if other_user else "STUDENT",
                "year": other_user.locked_year if other_user else None
            },
            "last_message": last_msg.content_text if last_msg else "Thread started",
            "last_message_time": last_msg.created_at if last_msg else t.created_at
        })

    return results

@router.get("/threads/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found.")

    if current_user.id not in [thread.student_id, thread.senior_id]:
        raise HTTPException(status_code=403, detail="Access denied to private chat thread.")

    messages = db.query(Message).filter(Message.thread_id == thread_id).order_by(Message.created_at.asc()).all()

    return [{
        "id": m.id,
        "thread_id": m.thread_id,
        "sender_id": m.sender_id,
        "is_me": m.sender_id == current_user.id,
        "content_text": m.content_text,
        "attachment_url": m.attachment_url,
        "created_at": m.created_at
    } for m in messages]

@router.post("/threads/{thread_id}/messages")
async def send_chat_message(
    thread_id: str,
    content_text: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found.")

    recipient_id = thread.senior_id if current_user.id == thread.student_id else thread.student_id

    # Check Block Rule: Blocked users cannot message each other
    is_blocked = db.query(UserBlock).filter(
        ((UserBlock.blocker_id == current_user.id) & (UserBlock.blocked_user_id == recipient_id)) |
        ((UserBlock.blocker_id == recipient_id) & (UserBlock.blocked_user_id == current_user.id))
    ).first()

    if is_blocked:
        raise HTTPException(status_code=403, detail="Communication blocked. You cannot exchange messages with this user.")

    msg = Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        content_text=content_text.strip()
    )
    db.add(msg)
    thread.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Broadcast via WebSocket hub
    payload = {
        "id": msg.id,
        "thread_id": thread_id,
        "sender_id": current_user.id,
        "sender_name": current_user.full_name,
        "content_text": msg.content_text,
        "created_at": msg.created_at.isoformat()
    }
    await ws_manager.broadcast_to_thread(thread_id, payload)
    await ws_manager.send_to_user(recipient_id, {"type": "CHAT_MESSAGE", "message": payload})

    return payload
