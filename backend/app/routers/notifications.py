from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationTargetType, UserNotificationRead
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.services.auth_service import get_current_verified_user, require_roles
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/notifications", tags=["College Notifications & Alerts"])

publisher_roles = require_roles([UserRole.ADMIN, UserRole.FACULTY])

@router.post("/", response_model=NotificationResponse)
async def publish_notification(
    req: NotificationCreate,
    current_user: User = Depends(publisher_roles),
    db: Session = Depends(get_db)
):
    """
    Publish Alert Flow:
    1. Only Admin or Faculty can create alerts.
    2. Select target audience: ALL, specific YEAR (1-4), or BATCH.
    3. Stored in database.
    4. Pushes instantly in real-time via WebSocket broadcast.
    """
    notif = Notification(
        sender_id=current_user.id,
        title=req.title.strip(),
        body=req.body.strip(),
        target_type=req.target_type.upper(),
        target_year=req.target_year,
        target_batch=req.target_batch.strip() if req.target_batch else None,
        is_broadcast=True
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Real-time WebSocket Push to connected campus users
    payload = {
        "id": notif.id,
        "title": notif.title,
        "body": notif.body,
        "target_type": notif.target_type,
        "target_year": notif.target_year,
        "target_batch": notif.target_batch,
        "sender_name": current_user.full_name,
        "created_at": notif.created_at.isoformat()
    }
    await ws_manager.broadcast_notification(payload, target_year=notif.target_year)

    return {
        "id": notif.id,
        "sender_id": notif.sender_id,
        "title": notif.title,
        "body": notif.body,
        "target_type": notif.target_type,
        "target_year": notif.target_year,
        "target_batch": notif.target_batch,
        "is_broadcast": notif.is_broadcast,
        "is_read": False,
        "created_at": notif.created_at
    }

@router.get("/")
async def list_notifications(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Returns notifications relevant to this user based on their locked year and batch.
    Includes read/unread indicator.
    """
    query = db.query(Notification).filter(
        (Notification.target_type == NotificationTargetType.ALL) |
        ((Notification.target_type == NotificationTargetType.YEAR) & (Notification.target_year == current_user.locked_year)) |
        ((Notification.target_type == NotificationTargetType.BATCH) & (Notification.target_batch == current_user.batch))
    ).order_by(Notification.created_at.desc())

    notifications = query.limit(50).all()

    read_ids = set(
        db.query(UserNotificationRead.notification_id).filter(
            UserNotificationRead.user_id == current_user.id
        ).all()
    )
    read_ids = {r[0] for r in read_ids}

    results = []
    for n in notifications:
        results.append({
            "id": n.id,
            "sender_id": n.sender_id,
            "title": n.title,
            "body": n.body,
            "target_type": n.target_type,
            "target_year": n.target_year,
            "target_batch": n.target_batch,
            "is_broadcast": n.is_broadcast,
            "is_read": n.id in read_ids,
            "created_at": n.created_at
        })

    return results

@router.post("/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    existing = db.query(UserNotificationRead).filter(
        UserNotificationRead.notification_id == notification_id,
        UserNotificationRead.user_id == current_user.id
    ).first()

    if not existing:
        read_entry = UserNotificationRead(
            notification_id=notification_id,
            user_id=current_user.id
        )
        db.add(read_entry)
        db.commit()

    return {"message": "Notification marked as read."}
