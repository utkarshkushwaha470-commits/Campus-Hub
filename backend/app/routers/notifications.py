from typing import List, Optional

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from sqlalchemy import func



from app.database import get_db

from app.models.user import User, UserRole, AccountStatus

from app.models.chat import Thread, Message, ChiefFacultyMessage

from app.models.query import Query

from app.models.group import CampusGroup, GroupMember, GroupMessage

from app.models.problem_box import ProblemBoxMessage, ProblemStatus

from app.models.id_verification import IDVerification

from app.models.rating import PointsLedger

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



@router.get("/nav-badges")

async def get_nav_badges(

    current_user: User = Depends(get_current_verified_user),

    db: Session = Depends(get_db)

):

    """

    Returns real-time navigation notification badge counts and dots for all sections:

    - dashboard: unread campus broadcast alerts

    - campus_dm: unread direct chat messages

    - year_sections: count of open/unresolved questions in user's year (or all years if Admin/Faculty)

    - groups: active enrolled purpose groups

    - problem_box: pending grievances (for admin) or replied status (for student)

    - leaderboard: new points activity or active scholar ranking count

    - admin_portal: pending student ID card verifications (for admin)

    - faculty_direct_chat: direct unread messages between faculty and chief admin

    """

    # 1. Dashboard Alerts

    read_notif_ids = set(

        r[0] for r in db.query(UserNotificationRead.notification_id).filter(

            UserNotificationRead.user_id == current_user.id

        ).all()

    )

    user_notifs_query = db.query(Notification.id).filter(

        (Notification.target_type == NotificationTargetType.ALL) |

        ((Notification.target_type == NotificationTargetType.YEAR) & (Notification.target_year == current_user.locked_year)) |

        ((Notification.target_type == NotificationTargetType.BATCH) & (Notification.target_batch == current_user.batch))

    )

    all_notif_ids = set(n[0] for n in user_notifs_query.all())

    unread_dashboard = len(all_notif_ids - read_notif_ids)



    # 2. Campus DM

    threads = db.query(Thread.id).filter(

        (Thread.student_id == current_user.id) | (Thread.senior_id == current_user.id)

    ).all()

    thread_ids = [t[0] for t in threads]

    unread_chat = 0

    if thread_ids:

        unread_chat = db.query(func.count(Message.id)).filter(

            Message.thread_id.in_(thread_ids),

            Message.sender_id != current_user.id,

            Message.is_read == False

        ).scalar() or 0



    # 3. Year Sections (Doubts)

    if current_user.role in [UserRole.ADMIN, UserRole.FACULTY]:

        open_doubts = db.query(func.count(Query.id)).filter(Query.is_resolved == False).scalar() or 0

    else:

        target_yr = current_user.locked_year or 1

        open_doubts = db.query(func.count(Query.id)).filter(

            Query.target_year == target_yr,

            Query.is_resolved == False

        ).scalar() or 0



    # 4. Purpose Groups

    group_ids = [g[0] for g in db.query(CampusGroup.id).filter(CampusGroup.is_active == True).all()]

    unread_groups = len(group_ids)



    # 5. Problem Box: WhatsApp-style real-time count
    is_admin = (current_user.role == UserRole.ADMIN) or getattr(current_user, 'is_chief_admin', False) or (current_user.email.lower().strip() == 'utkarshkushwaha470@gmail.com')
    if is_admin:
        # Administrator monitors all submitted grievances
        problem_count = db.query(func.count(ProblemBoxMessage.id)).filter(
            ProblemBoxMessage.status == ProblemStatus.SUBMITTED
        ).scalar() or 0
    elif current_user.role == UserRole.FACULTY:
        # Faculty ONLY sees problems addressed to Faculty (NEVER Administrator-targeted problems)
        problem_count = db.query(func.count(ProblemBoxMessage.id)).filter(
            ProblemBoxMessage.recipient_role.in_(['FACULTY', 'DEAN', 'HOD']),
            ~ProblemBoxMessage.recipient_role.in_(['ADMINISTRATOR', 'ADMIN', 'DIRECTOR']),
            ProblemBoxMessage.status == ProblemStatus.SUBMITTED
        ).scalar() or 0
    else:
        # Student sees count of replies received
        problem_count = db.query(func.count(ProblemBoxMessage.id)).filter(
            ProblemBoxMessage.student_id == current_user.id,
            ProblemBoxMessage.status == ProblemStatus.REPLIED
        ).scalar() or 0
    # 6. Leaderboard (recent point updates)

    cutoff = datetime.utcnow() - timedelta(days=1)

    leaderboard_updates = db.query(func.count(PointsLedger.id)).filter(

        PointsLedger.created_at >= cutoff

    ).scalar() or 0



    # 7. Admin Portal (pending verification requests for admin)

    admin_portal_count = 0

    if current_user.role == UserRole.ADMIN:

        pending_students = db.query(func.count(IDVerification.id)).filter(

            IDVerification.status == "PENDING"

        ).scalar() or 0

        pending_admins = db.query(func.count(User.id)).filter(

            User.role == UserRole.ADMIN,

            User.status == AccountStatus.PENDING

        ).scalar() or 0

        admin_portal_count = pending_students + pending_admins



    # 8. Faculty Direct Chat with Chief Admin

    is_chief = (current_user.email.lower() == "utkarshkushwaha470@gmail.com") or getattr(current_user, "is_chief_admin", False)

    faculty_chat_count = 0

    if is_chief:

        faculty_chat_count = db.query(func.count(ChiefFacultyMessage.id)).filter(

            ChiefFacultyMessage.sender_role == "FACULTY",

            ChiefFacultyMessage.is_read == False

        ).scalar() or 0

    elif current_user.role in [UserRole.FACULTY, UserRole.ADMIN]:

        faculty_chat_count = db.query(func.count(ChiefFacultyMessage.id)).filter(

            ChiefFacultyMessage.faculty_id == current_user.id,

            ChiefFacultyMessage.sender_role == "CHIEF_ADMIN",

            ChiefFacultyMessage.is_read == False

        ).scalar() or 0



    # True WhatsApp-style unread counts (0 if seen or read)

    return {

        "dashboard": unread_dashboard,

        "campus_dms": unread_chat,

        "campus_dm": unread_chat,

        "askup": unread_chat,

        "year_sections": open_doubts,

        "groups": unread_groups,

        "problem_box": problem_count,

        "leaderboard": leaderboard_updates,

        "admin_portal": admin_portal_count,

        "faculty_direct_chat": faculty_chat_count

    }

