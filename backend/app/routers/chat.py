import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.database import get_db
from app.models.user import User, UserRole, AccountStatus
from app.models.chat import Thread, Message, ThreadType
from app.models.moderation import UserBlock
from app.services.auth_service import get_current_verified_user, require_roles
from app.services.storage_service import storage_service
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/chat", tags=["Instagram-Style Campus Chat & DMs"])

admin_only = require_roles([UserRole.ADMIN])

@router.get("/inbox")
async def get_user_inbox(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Instagram-style inbox: lists all direct message threads for current user,
    with peer profile details, last message snippet, timestamp, and unread status.
    """
    threads = db.query(Thread).filter(
        or_(Thread.student_id == current_user.id, Thread.senior_id == current_user.id)
    ).order_by(Thread.updated_at.desc()).all()

    inbox = []
    for t in threads:
        peer_id = t.senior_id if t.student_id == current_user.id else t.student_id
        peer = db.query(User).filter(User.id == peer_id).first()

        last_msg = db.query(Message).filter(Message.thread_id == t.id).order_by(Message.created_at.desc()).first()
        unread_count = db.query(Message).filter(
            Message.thread_id == t.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()

        inbox.append({
            "thread_id": t.id,
            "thread_type": t.thread_type,
            "peer": {
                "id": peer.id if peer else peer_id,
                "full_name": peer.full_name if peer else "Campus Member",
                "email": peer.email if peer else "",
                "role": peer.role if peer else "STUDENT",
                "locked_year": peer.locked_year if peer else None,
                "batch": peer.batch if peer else "",
                "avatar_char": peer.full_name[:1].upper() if peer and peer.full_name else "U"
            },
            "last_message": last_msg.content_text if last_msg else "Started conversation",
            "last_message_has_attachment": bool(last_msg.attachment_url) if last_msg else False,
            "last_message_time": last_msg.created_at.isoformat() if last_msg else t.created_at.isoformat(),
            "unread_count": unread_count
        })

    return inbox

@router.get("/users/search")
async def search_campus_users(
    q: Optional[str] = "",
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Search campus directory to start an Instagram-style DM."""
    query = db.query(User).filter(
        User.id != current_user.id,
        User.status == AccountStatus.APPROVED
    )
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.batch.ilike(search_pattern)
            )
        )

    users = query.limit(20).all()

    return [{
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "locked_year": u.locked_year,
        "batch": u.batch,
        "points": u.points,
        "level": u.level,
        "avatar_char": u.full_name[:1].upper() if u.full_name else "U"
    } for u in users]

@router.post("/start")
async def start_or_get_chat_thread(
    recipient_id: str = Form(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Starts or opens an existing Instagram-style 1-on-1 direct message thread."""
    if recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a direct message thread with yourself.")

    recipient = db.query(User).filter(User.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found in campus directory.")

    # Check Block Rule
    is_blocked = db.query(UserBlock).filter(
        or_(
            and_(UserBlock.blocker_id == current_user.id, UserBlock.blocked_user_id == recipient_id),
            and_(UserBlock.blocker_id == recipient_id, UserBlock.blocked_user_id == current_user.id)
        )
    ).first()
    if is_blocked:
        raise HTTPException(status_code=403, detail="Communication is blocked between these accounts.")

    # Check for existing thread
    existing = db.query(Thread).filter(
        or_(
            and_(Thread.student_id == current_user.id, Thread.senior_id == recipient_id),
            and_(Thread.student_id == recipient_id, Thread.senior_id == current_user.id)
        )
    ).first()

    if existing:
        return {"thread_id": existing.id, "created_new": False}

    # Create new thread
    new_thread = Thread(
        thread_type=ThreadType.DIRECT_MESSAGE,
        student_id=current_user.id,
        senior_id=recipient_id,
        last_message_text="Started direct conversation",
        last_message_at=datetime.utcnow()
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)

    return {"thread_id": new_thread.id, "created_new": True}

@router.get("/threads/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Returns messages inside a thread.
    - Regular users must be a participant in the thread.
    - ADMIN has SUPER-ACCESS and can view any student thread for safety/monitoring.
    """
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found.")

    is_admin = current_user.role == UserRole.ADMIN
    is_participant = current_user.id in [thread.student_id, thread.senior_id]

    if not is_participant and not is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this private conversation.")

    # Mark incoming messages as read
    if is_participant:
        db.query(Message).filter(
            Message.thread_id == thread_id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).update({"is_read": True})
        db.commit()

    # Get participant details
    p1 = db.query(User).filter(User.id == thread.student_id).first()
    p2 = db.query(User).filter(User.id == thread.senior_id).first()
    other_user = p2 if current_user.id == thread.student_id else p1

    messages = db.query(Message).filter(Message.thread_id == thread_id).order_by(Message.created_at.asc()).all()

    return {
        "thread_id": thread.id,
        "is_admin_view": is_admin and not is_participant,
        "participants": {
            "user1": {"id": p1.id, "name": p1.full_name, "role": p1.role, "year": p1.locked_year} if p1 else None,
            "user2": {"id": p2.id, "name": p2.full_name, "role": p2.role, "year": p2.locked_year} if p2 else None
        },
        "peer": {
            "id": other_user.id if other_user else None,
            "full_name": other_user.full_name if other_user else "Campus Member",
            "role": other_user.role if other_user else "STUDENT",
            "locked_year": other_user.locked_year if other_user else None,
            "batch": other_user.batch if other_user else "",
            "avatar_char": other_user.full_name[:1].upper() if other_user and other_user.full_name else "U"
        },
        "messages": [{
            "id": m.id,
            "thread_id": m.thread_id,
            "sender_id": m.sender_id,
            "sender_name": (db.query(User.full_name).filter(User.id == m.sender_id).scalar()) or "User",
            "is_me": m.sender_id == current_user.id,
            "content_text": m.content_text,
            "attachment_url": m.attachment_url,
            "is_read": m.is_read,
            "reactions": json.loads(m.reactions or "{}"),
            "created_at": m.created_at.isoformat()
        } for m in messages]
    }

@router.post("/threads/{thread_id}/messages")
async def send_chat_message(
    thread_id: str,
    content_text: str = Form(""),
    attachment: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Sends an Instagram-style direct message (supports text and/or photos).
    Broadcasts in real-time to thread and pushes notification to recipient.
    """
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found.")

    is_admin = current_user.role == UserRole.ADMIN
    is_participant = current_user.id in [thread.student_id, thread.senior_id]

    if not is_participant and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to post in this thread.")

    recipient_id = thread.senior_id if current_user.id == thread.student_id else thread.student_id

    # Check Block Rule
    if not is_admin:
        is_blocked = db.query(UserBlock).filter(
            or_(
                and_(UserBlock.blocker_id == current_user.id, UserBlock.blocked_user_id == recipient_id),
                and_(UserBlock.blocker_id == recipient_id, UserBlock.blocked_user_id == current_user.id)
            )
        ).first()
        if is_blocked:
            raise HTTPException(status_code=403, detail="Communication blocked between these accounts.")

    attach_url = None
    if attachment:
        bytes_data = await attachment.read()
        attach_url = await storage_service.save_public_upload(bytes_data, attachment.filename)

    if not content_text.strip() and not attach_url:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    msg = Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        content_text=content_text.strip() if content_text else "📷 Photo",
        attachment_url=attach_url,
        is_read=False,
        reactions="{}"
    )
    db.add(msg)

    thread.last_message_text = msg.content_text
    thread.last_message_at = datetime.utcnow()
    thread.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(msg)

    # Real-time WebSocket push
    payload = {
        "id": msg.id,
        "thread_id": thread_id,
        "sender_id": current_user.id,
        "sender_name": current_user.full_name,
        "content_text": msg.content_text,
        "attachment_url": msg.attachment_url,
        "is_read": False,
        "reactions": {},
        "created_at": msg.created_at.isoformat()
    }
    await ws_manager.broadcast_to_thread(thread_id, {"type": "NEW_MESSAGE", "message": payload})
    await ws_manager.send_to_user(recipient_id, {"type": "CHAT_MESSAGE", "message": payload})

    return payload

@router.post("/messages/{message_id}/react")
async def react_to_message(
    message_id: str,
    emoji: str = Form(...),  # e.g. ❤️, 😂, 👍, 🔥, 😮
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Instagram-style double-tap / emoji reaction to messages.
    Toggles reaction on and off and broadcasts live update.
    """
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    reactions = json.loads(msg.reactions or "{}")
    user_id = current_user.id

    if emoji not in reactions:
        reactions[emoji] = []

    if user_id in reactions[emoji]:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(user_id)

    msg.reactions = json.dumps(reactions)
    db.commit()

    # Broadcast reaction update
    update_payload = {
        "message_id": msg.id,
        "thread_id": msg.thread_id,
        "reactions": reactions
    }
    await ws_manager.broadcast_to_thread(msg.thread_id, {"type": "REACTION_UPDATE", "data": update_payload})

    return {"message_id": msg.id, "reactions": reactions}

# ==============================================================================
# ADMIN SUPER-ACCESS: MONITOR ALL CAMPUS CHATS
# ==============================================================================

@router.get("/admin/all-threads")
async def admin_get_all_campus_threads(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    ADMIN SUPER-ACCESS:
    Admin has full visibility into all ongoing campus conversations for safety,
    harassment monitoring, and institutional accountability.
    """
    all_threads = db.query(Thread).order_by(Thread.updated_at.desc()).all()

    results = []
    for t in all_threads:
        p1 = db.query(User).filter(User.id == t.student_id).first()
        p2 = db.query(User).filter(User.id == t.senior_id).first()
        msg_count = db.query(Message).filter(Message.thread_id == t.id).count()
        last_msg = db.query(Message).filter(Message.thread_id == t.id).order_by(Message.created_at.desc()).first()

        results.append({
            "thread_id": t.id,
            "thread_type": t.thread_type,
            "participant_1": {
                "id": p1.id if p1 else t.student_id,
                "name": p1.full_name if p1 else "Unknown",
                "email": p1.email if p1 else "",
                "role": p1.role if p1 else "STUDENT",
                "year": p1.locked_year if p1 else None,
                "batch": p1.batch if p1 else ""
            },
            "participant_2": {
                "id": p2.id if p2 else t.senior_id,
                "name": p2.full_name if p2 else "Unknown",
                "email": p2.email if p2 else "",
                "role": p2.role if p2 else "STUDENT",
                "year": p2.locked_year if p2 else None,
                "batch": p2.batch if p2 else ""
            },
            "message_count": msg_count,
            "last_message": last_msg.content_text if last_msg else "No messages",
            "last_message_at": last_msg.created_at.isoformat() if last_msg else t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat()
        })

    return results

@router.delete("/admin/messages/{message_id}")
async def admin_delete_message(
    message_id: str,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Admin can remove any abusive or inappropriate message across campus."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    thread_id = msg.thread_id
    msg.content_text = "[This message was removed by campus administration for policy violation]"
    msg.attachment_url = None
    db.commit()

    await ws_manager.broadcast_to_thread(thread_id, {
        "type": "MESSAGE_MODERATED",
        "message_id": message_id,
        "notice": msg.content_text
    })

    return {"message": "Message successfully moderated and redacted."}
