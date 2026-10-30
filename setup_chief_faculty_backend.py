import os

scratch_dir = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect"

# 1. Update backend/app/models/__init__.py
init_path = os.path.join(scratch_dir, "backend", "app", "models", "__init__.py")
with open(init_path, "r", encoding="utf-8") as f:
    c = f.read()

if "ChiefFacultyMessage" not in c:
    c = c.replace(
        "from app.models.chat import Thread, Message, ThreadType",
        "from app.models.chat import Thread, Message, ThreadType, ChiefFacultyMessage"
    )
    c = c.replace(
        '"ThreadType",',
        '"ThreadType",\n    "ChiefFacultyMessage",'
    )
    with open(init_path, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated models/__init__.py")

# 2. Add endpoints in backend/app/routers/admin.py
admin_path = os.path.join(scratch_dir, "backend", "app", "routers", "admin.py")
with open(admin_path, "r", encoding="utf-8") as f:
    admin_code = f.read()

# Add ChiefFacultyMessage import if needed
if "ChiefFacultyMessage" not in admin_code:
    admin_code = admin_code.replace(
        "from app.models.group import CampusGroup",
        "from app.models.group import CampusGroup\nfrom app.models.chat import ChiefFacultyMessage"
    )

new_routes = '''
# ============================================================================
# CHIEF ADMINISTRATOR <-> FACULTY DIRECT CHAT SYSTEM
# ============================================================================

class FacultyToChiefMessageRequest(BaseModel):
    message: str

class ChiefToFacultyReplyRequest(BaseModel):
    message: str

@router.post("/faculty/send-to-chief")
async def faculty_send_to_chief(
    req: FacultyToChiefMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Direct communication channel for Faculty members to chat with Chief Administrator Utkarsh Kushwaha.
    Students are strictly forbidden from this executive channel.
    """
    if current_user.role != UserRole.FACULTY and not getattr(current_user, "is_chief_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only verified Faculty members can use Direct Chat with Chief Administrator."
        )

    msg_text = req.message.strip()
    if not msg_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    msg = ChiefFacultyMessage(
        faculty_id=current_user.id,
        sender_id=current_user.id,
        sender_role="FACULTY",
        sender_name=current_user.full_name,
        message=msg_text,
        is_read=False
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "message": "Message sent directly to Chief Administrator UTKARSH KUSHWAHA.",
        "data": {
            "id": msg.id,
            "sender_name": msg.sender_name,
            "sender_role": msg.sender_role,
            "message": msg.message,
            "created_at": msg.created_at.isoformat()
        }
    }

@router.get("/faculty/my-chief-conversation")
async def faculty_get_my_chief_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Faculty retrieves their entire direct conversation with Chief Admin."""
    if current_user.role != UserRole.FACULTY and not getattr(current_user, "is_chief_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only verified Faculty members can view Chief Administrator chat."
        )

    messages = db.query(ChiefFacultyMessage).filter(
        ChiefFacultyMessage.faculty_id == current_user.id
    ).order_by(ChiefFacultyMessage.created_at.asc()).all()

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "sender_name": m.sender_name,
            "message": m.message,
            "is_me": m.sender_id == current_user.id,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]

@router.get("/faculty-chats")
async def list_faculty_chats_for_chief(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: View all active conversations with Faculty members.
    """
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can access Direct Chat with Faculty."
        )

    # Get all faculty members
    faculties = db.query(User).filter(User.role == UserRole.FACULTY).all()
    results = []

    for f in faculties:
        last_msg = db.query(ChiefFacultyMessage).filter(
            ChiefFacultyMessage.faculty_id == f.id
        ).order_by(ChiefFacultyMessage.created_at.desc()).first()

        unread_count = db.query(ChiefFacultyMessage).filter(
            ChiefFacultyMessage.faculty_id == f.id,
            ChiefFacultyMessage.sender_role == "FACULTY",
            ChiefFacultyMessage.is_read == False
        ).count()

        results.append({
            "faculty_id": f.id,
            "faculty_name": f.full_name,
            "faculty_email": f.email,
            "department": f.batch,
            "last_message": last_msg.message if last_msg else "No messages yet",
            "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread_count,
            "has_conversation": last_msg is not None
        })

    # Sort with faculty who messaged recently on top
    results.sort(key=lambda x: (x["unread_count"] > 0, x["last_message_at"] or ""), reverse=True)
    return results

@router.get("/faculty-chat-thread/{faculty_id}")
async def get_faculty_chat_thread(
    faculty_id: str,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Chief Administrator retrieves full conversation thread with a specific faculty member."""
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can view Faculty chats."
        )

    faculty = db.query(User).filter(User.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    # Mark all incoming messages from this faculty as read
    db.query(ChiefFacultyMessage).filter(
        ChiefFacultyMessage.faculty_id == faculty_id,
        ChiefFacultyMessage.sender_role == "FACULTY",
        ChiefFacultyMessage.is_read == False
    ).update({"is_read": True})
    db.commit()

    messages = db.query(ChiefFacultyMessage).filter(
        ChiefFacultyMessage.faculty_id == faculty_id
    ).order_by(ChiefFacultyMessage.created_at.asc()).all()

    return {
        "faculty": {
            "id": faculty.id,
            "full_name": faculty.full_name,
            "email": faculty.email,
            "department": faculty.batch
        },
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "sender_name": m.sender_name,
                "message": m.message,
                "is_chief": m.sender_role == "CHIEF_ADMIN",
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }

@router.post("/reply-faculty/{faculty_id}")
async def reply_to_faculty(
    faculty_id: str,
    req: ChiefToFacultyReplyRequest,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Chief Administrator sends a direct reply message to a Faculty member."""
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can reply to Faculty."
        )

    clean_text = req.message.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Reply message cannot be empty.")

    faculty = db.query(User).filter(User.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    reply = ChiefFacultyMessage(
        faculty_id=faculty_id,
        sender_id=current_admin.id,
        sender_role="CHIEF_ADMIN",
        sender_name="UTKARSH KUSHWAHA (Chief Admin)",
        message=clean_text,
        is_read=True
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)

    return {
        "message": f"Reply successfully sent to {faculty.full_name}.",
        "data": {
            "id": reply.id,
            "sender_name": reply.sender_name,
            "sender_role": reply.sender_role,
            "message": reply.message,
            "created_at": reply.created_at.isoformat()
        }
    }
'''

if "/faculty/send-to-chief" not in admin_code:
    from pydantic import BaseModel
    admin_code += "\n" + new_routes
    with open(admin_path, "w", encoding="utf-8") as f:
        f.write(admin_code)
    print("Added Chief-Faculty endpoints to admin.py")
else:
    print("Chief-Faculty endpoints already in admin.py")

print("Backend setup complete!")
