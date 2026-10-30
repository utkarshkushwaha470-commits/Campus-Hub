import os
import re

admin_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\backend\app\routers\admin.py"
with open(admin_path, "r", encoding="utf-8") as f:
    code = f.read()

# Make sure FacultyDispatch is imported
if "FacultyDispatch" not in code:
    code = code.replace(
        "from app.models.admin_audit_log import AdminAuditLog, AuditActionType",
        "from app.models.admin_audit_log import AdminAuditLog, AuditActionType, FacultyDispatch"
    )

new_dispatch_endpoints = '''
# ============================================================================
# FACULTY PRIORITY DISPATCHES (CHIEF ADMINISTRATOR EXECUTIVE INBOX)
# ============================================================================

class ReplyDispatchReq(BaseModel):
    reply: str

@router.post("/chief-message")
async def send_direct_message_to_chief(
    req: DirectChiefChatMessage,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Direct Priority Dispatch Channel: Faculty & sub-administrators send urgent
    dispatches, academic escalations, and incident reports to Chief Administrator Utkarsh Kushwaha.
    Students are strictly forbidden from this channel.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only verified Faculty and Administrators can send dispatches to Chief Administrator."
        )

    clean_subj = req.subject.strip()
    clean_msg = req.message.strip()
    if not clean_subj or not clean_msg:
        raise HTTPException(status_code=400, detail="Subject and message content are required.")

    dispatch = FacultyDispatch(
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_email=current_user.email,
        sender_role=current_user.role,
        sender_department=current_user.batch or "Institutional Staff",
        subject=clean_subj,
        message=clean_msg,
        is_read=False
    )
    db.add(dispatch)
    db.commit()
    db.refresh(dispatch)

    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        audit_service.log_action(
            db=db,
            admin_id=current_user.id,
            action_type=AuditActionType.FORWARD_PROBLEM_BOX,
            target_entity="CHIEF_ADMIN_DISPATCH",
            target_id=dispatch.id,
            ip_address=client_ip,
            details={
                "from_name": current_user.full_name,
                "from_email": current_user.email,
                "subject": clean_subj
            }
        )
    except Exception:
        pass

    return {
        "message": "Urgent administrative dispatch received by Chief Administrator UTKARSH KUSHWAHA.",
        "dispatch_id": dispatch.id,
        "timestamp": dispatch.created_at.isoformat()
    }

@router.get("/faculty-dispatches")
async def get_all_faculty_dispatches(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: View all priority dispatches sent by Faculty & Sub-Admins.
    Only Utkarsh Kushwaha possesses executive clearance to inspect this inbox.
    """
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can access Faculty Dispatches."
        )

    dispatches = db.query(FacultyDispatch).order_by(FacultyDispatch.created_at.desc()).all()
    unread_count = sum(1 for d in dispatches if not d.is_read)

    return {
        "unread_count": unread_count,
        "total_count": len(dispatches),
        "dispatches": [
            {
                "id": d.id,
                "sender_id": d.sender_id,
                "sender_name": d.sender_name,
                "sender_email": d.sender_email,
                "sender_role": d.sender_role,
                "sender_department": d.sender_department,
                "subject": d.subject,
                "message": d.message,
                "is_read": d.is_read,
                "chief_reply": d.chief_reply,
                "replied_at": d.replied_at.isoformat() if d.replied_at else None,
                "created_at": d.created_at.isoformat()
            }
            for d in dispatches
        ]
    }

@router.post("/reply-dispatch/{dispatch_id}")
async def reply_to_faculty_dispatch(
    dispatch_id: str,
    req: ReplyDispatchReq,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Officially reply to a Faculty priority dispatch.
    """
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can reply to dispatches."
        )

    clean_reply = req.reply.strip()
    if not clean_reply:
        raise HTTPException(status_code=400, detail="Reply text cannot be empty.")

    dispatch = db.query(FacultyDispatch).filter(FacultyDispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch record not found.")

    dispatch.chief_reply = clean_reply
    dispatch.replied_at = datetime.utcnow()
    dispatch.is_read = True
    db.commit()
    db.refresh(dispatch)

    return {
        "message": f"Official reply successfully dispatched to {dispatch.sender_name}.",
        "dispatch": {
            "id": dispatch.id,
            "chief_reply": dispatch.chief_reply,
            "replied_at": dispatch.replied_at.isoformat(),
            "is_read": dispatch.is_read
        }
    }

@router.post("/mark-dispatch-read/{dispatch_id}")
async def mark_dispatch_as_read(
    dispatch_id: str,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Chief Administrator marks a dispatch as reviewed/read."""
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(status_code=403, detail="Access Denied.")

    dispatch = db.query(FacultyDispatch).filter(FacultyDispatch.id == dispatch_id).first()
    if dispatch:
        dispatch.is_read = True
        db.commit()
    return {"message": "Dispatch marked as read."}

@router.get("/my-sent-dispatches")
async def get_my_sent_dispatches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sender retrieves all dispatches they sent to Chief Administrator with live replies."""
    dispatches = db.query(FacultyDispatch).filter(
        FacultyDispatch.sender_id == current_user.id
    ).order_by(FacultyDispatch.created_at.desc()).all()

    return [
        {
            "id": d.id,
            "subject": d.subject,
            "message": d.message,
            "chief_reply": d.chief_reply,
            "replied_at": d.replied_at.isoformat() if d.replied_at else None,
            "created_at": d.created_at.isoformat(),
            "is_read": d.is_read
        }
        for d in dispatches
    ]
'''

# Replace existing @router.post("/chief-message") block
pattern = r"@router\.post\(\"/chief-message\"\)\s*async def send_direct_message_to_chief\(.*?return \{\s*\"message\": f\"Urgent administrative dispatch received by Chief Administrator UTKARSH KUSHWAHA\.\",\s*\"timestamp\": datetime\.utcnow\(\)\s*\}"
code = re.sub(pattern, new_dispatch_endpoints.strip(), code, flags=re.DOTALL)

with open(admin_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Updated admin.py with Faculty Priority Dispatch endpoints!")
