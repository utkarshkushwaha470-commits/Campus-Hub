from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.problem_box import ProblemBoxMessage, ProblemRecipientRole, ProblemStatus
from app.models.admin_audit_log import AuditActionType
from app.schemas.problem_box import (
    ProblemBoxCreate, ProblemBoxStudentResponse, ProblemBoxAdminResponse,
    ProblemBoxForwardRequest, ProblemBoxReplyRequest
)
from app.services.auth_service import get_current_verified_user, require_roles
from app.services.ai_service import ai_service
from app.services.audit_service import audit_service
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/problem-box", tags=["Confidential Problem Box"])

def check_demo_protection(user: User):
    # Allow demo personas to test confidential problem box submissions interactively
    pass

def check_is_admin(user: User) -> bool:
    if not user:
        return False
    return (
        user.role == UserRole.ADMIN or 
        getattr(user, "is_chief_admin", False) or 
        (user.email and user.email.lower().strip() == "utkarshkushwaha470@gmail.com")
    )

staff_roles = require_roles([UserRole.ADMIN, UserRole.FACULTY])
admin_only = require_roles([UserRole.ADMIN])

@router.post("/", response_model=ProblemBoxStudentResponse)
async def submit_problem_message(
    req: ProblemBoxCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Student submits confidential message to Faculty or Administrator.
    STRICT PRIVACY RULES:
    1. If sent to 'ADMINISTRATOR':
       - Access is granted EXCLUSIVELY to Chief Administrator UTKARSH KUSHWAHA / Admins.
       - Faculty members have ZERO access to view, read, or list this problem.
       - Admin sees full student identity.
    2. If sent to 'FACULTY':
       - Faculty members can view the problem to resolve academic/departmental issues.
       - Student personal identity (Name, Email, Roll/CRN) is 100% ANONYMIZED from Faculty.
       - Chief Administrator retains supervisory visibility.
    3. Gemma 4 safety pre-screening receives ONLY message text (PII-free).
    """
    check_demo_protection(current_user)
    role_upper = req.recipient_role.upper().strip()
    if role_upper in ["ADMIN", "ADMINISTRATOR", "DIRECTOR"]:
        role_upper = "ADMINISTRATOR"
    else:
        role_upper = "FACULTY"

    # Gemma 4 PII-free safety screening
    safety_analysis = await ai_service.screen_problem_box_safety(message_text=f"{req.subject} {req.content_text}")

    msg = ProblemBoxMessage(
        student_id=current_user.id,
        recipient_role=role_upper,
        subject=req.subject.strip(),
        content_text=req.content_text.strip(),
        status=ProblemStatus.SUBMITTED,
        ai_safety_flag=safety_analysis["ai_safety_flag"],
        ai_safety_category=safety_analysis["ai_safety_category"]
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return msg

@router.get("/my-messages", response_model=List[ProblemBoxStudentResponse])
async def list_my_problem_messages(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Student views their own submitted messages and official administrative/faculty replies."""
    messages = db.query(ProblemBoxMessage).filter(
        ProblemBoxMessage.student_id == current_user.id
    ).order_by(ProblemBoxMessage.created_at.desc()).all()
    return messages

@router.get("/admin/queue", response_model=List[ProblemBoxAdminResponse])
async def list_problem_box_admin_queue(
    request: Request,
    current_viewer: User = Depends(staff_roles),
    db: Session = Depends(get_db)
):
    """
    Review queue for Administrators and Faculty with strict privacy boundaries:
    - ADMINISTRATOR (Chief Admin Utkarsh Kushwaha / Admin):
      * CAN see problems sent to ADMINISTRATOR and FACULTY.
      * CAN see full student identity (Name, Email, Roll/CRN, Year).
    - FACULTY:
      * CANNOT see any problem directly sent to ADMINISTRATOR (Strictly excluded).
      * CAN only see problems addressed to 'FACULTY' (or legacy DEAN/HOD).
      * CANNOT see student details (100% Anonymous: Identity Concealed as 'Anonymous Student').
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    is_admin = check_is_admin(current_viewer)

    if is_admin:
        audit_service.log_action(
            db=db,
            admin_id=current_viewer.id,
            action_type=AuditActionType.VIEW_PROBLEM_BOX,
            target_entity="PROBLEM_BOX_QUEUE",
            ip_address=client_ip,
            details={"status": "VIEWED_CONFIDENTIAL_QUEUE", "role": "ADMINISTRATOR"}
        )

    # Base query
    q = db.query(ProblemBoxMessage)

    if not is_admin:
        # STRICT RULE: Faculty members MUST NOT have access to problems directly sent to the administrator!
        # Only include grievances addressed to FACULTY (or legacy DEAN/HOD)
        q = q.filter(ProblemBoxMessage.recipient_role.in_(["FACULTY", "DEAN", "HOD"]))
        q = q.filter(~ProblemBoxMessage.recipient_role.in_(["ADMINISTRATOR", "ADMIN", "DIRECTOR"]))

    messages = q.order_by(
        ProblemBoxMessage.ai_safety_flag.desc(),
        ProblemBoxMessage.created_at.desc()
    ).all()

    admin_view = []
    for m in messages:
        # Extra safety check: never return an administrator problem to non-admin
        if not is_admin and m.recipient_role in ["ADMINISTRATOR", "ADMIN", "DIRECTOR"]:
            continue

        student = db.query(User).filter(User.id == m.student_id).first()
        
        if is_admin:
            # Administrator CAN see student details
            student_name = student.full_name if student else "Unknown Student"
            student_email = student.email if student else ""
            student_batch = student.batch if student else ""
            student_year = student.locked_year if student else None
            crn = getattr(student, 'crn_or_roll_number', '') or student_batch
        else:
            # Faculty CANNOT see student details (100% Anonymous)
            student_name = "Anonymous Student"
            student_email = "[Concealed from Faculty]"
            student_batch = ""
            student_year = None
            crn = "[Concealed]"

        ai_summary = m.ai_safety_category or ("Urgent Safety Flag" if m.ai_safety_flag else "Standard Grievance")
        ai_level = "CRITICAL / URGENT" if m.ai_safety_flag else "NORMAL"

        admin_view.append({
            "id": m.id,
            "student_id": m.student_id if is_admin else "anonymous",
            "student_name": student_name,
            "sender_name": student_name,
            "student_email": student_email,
            "sender_email": student_email,
            "student_batch": student_batch,
            "student_year": student_year,
            "sender_crn": crn,
            "recipient_role": m.recipient_role,
            "subject": m.subject,
            "content_text": m.content_text,
            "status": m.status,
            "ai_safety_flag": m.ai_safety_flag,
            "ai_safety_category": m.ai_safety_category,
            "ai_urgency_summary": ai_summary,
            "ai_urgency_level": ai_level,
            "forwarded_to_name": m.forwarded_to_name,
            "admin_response_text": m.admin_response_text,
            "forwarded_at": m.forwarded_at,
            "replied_at": m.replied_at,
            "created_at": m.created_at
        })

    return admin_view

@router.get("/admin/{message_id}", response_model=ProblemBoxAdminResponse)
async def get_single_problem_message(
    message_id: str,
    current_viewer: User = Depends(staff_roles),
    db: Session = Depends(get_db)
):
    """Fetch single problem message with role-based restriction."""
    msg = db.query(ProblemBoxMessage).filter(ProblemBoxMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Problem message not found.")

    is_admin = check_is_admin(current_viewer)
    if not is_admin and msg.recipient_role in ["ADMINISTRATOR", "ADMIN", "DIRECTOR"]:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: This problem was sent directly to the Administrator and is strictly inaccessible to Faculty."
        )

    student = db.query(User).filter(User.id == msg.student_id).first()
    if is_admin:
        student_name = student.full_name if student else "Unknown Student"
        student_email = student.email if student else ""
        student_batch = student.batch if student else ""
        student_year = student.locked_year if student else None
        crn = getattr(student, 'crn_or_roll_number', '') or student_batch
    else:
        student_name = "Anonymous Student"
        student_email = "[Concealed from Faculty]"
        student_batch = ""
        student_year = None
        crn = "[Concealed]"

    ai_summary = msg.ai_safety_category or ("Urgent Safety Flag" if msg.ai_safety_flag else "Standard Grievance")
    ai_level = "CRITICAL / URGENT" if msg.ai_safety_flag else "NORMAL"

    return {
        "id": msg.id,
        "student_id": msg.student_id if is_admin else "anonymous",
        "student_name": student_name,
        "sender_name": student_name,
        "student_email": student_email,
        "sender_email": student_email,
        "student_batch": student_batch,
        "student_year": student_year,
        "sender_crn": crn,
        "recipient_role": msg.recipient_role,
        "subject": msg.subject,
        "content_text": msg.content_text,
        "status": msg.status,
        "ai_safety_flag": msg.ai_safety_flag,
        "ai_safety_category": msg.ai_safety_category,
        "ai_urgency_summary": ai_summary,
        "ai_urgency_level": ai_level,
        "forwarded_to_name": msg.forwarded_to_name,
        "admin_response_text": msg.admin_response_text,
        "forwarded_at": msg.forwarded_at,
        "replied_at": msg.replied_at,
        "created_at": msg.created_at
    }

@router.post("/admin/{message_id}/forward")
async def forward_problem_box_anonymously(
    message_id: str,
    req: ProblemBoxForwardRequest,
    request: Request,
    current_viewer: User = Depends(staff_roles),
    db: Session = Depends(get_db)
):
    """
    Decision: FORWARD ANONYMOUSLY.
    Sends message content to institutional authority without sender identity.
    Faculty can only forward problems targeted to FACULTY.
    """
    msg = db.query(ProblemBoxMessage).filter(ProblemBoxMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Problem message not found.")

    is_admin = check_is_admin(current_viewer)
    if not is_admin and msg.recipient_role in ["ADMINISTRATOR", "ADMIN", "DIRECTOR"]:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: This problem was sent directly to Administrator and is strictly inaccessible to Faculty."
        )

    msg.status = ProblemStatus.FORWARDED_ANONYMOUSLY
    msg.forwarded_to_name = req.target_authority_name
    msg.forwarded_at = datetime.utcnow()
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_viewer.id,
        action_type=AuditActionType.FORWARD_PROBLEM_BOX,
        target_entity="PROBLEM_BOX_MESSAGE",
        target_id=msg.id,
        ip_address=client_ip,
        details={
            "recipient_role": msg.recipient_role,
            "forwarded_to_authority": req.target_authority_name,
            "forwarded_by": current_viewer.full_name,
            "anonymized": True
        }
    )

    anonymized_payload = {
        "institution": "Campus Hub Official Incident Report - Allenhouse Institute of Technology",
        "addressed_to": req.target_authority_name,
        "role": msg.recipient_role,
        "subject": msg.subject,
        "message_body": msg.content_text,
        "sender": "[REDACTED - STUDENT IDENTITY CONCEALED BY POLICY]",
        "safety_category": msg.ai_safety_category
    }

    return {
        "message": f"Message anonymized and dispatched to {req.target_authority_name}.",
        "anonymized_payload": anonymized_payload
    }

@router.post("/admin/{message_id}/reply")
async def reply_problem_box(
    message_id: str,
    req: ProblemBoxReplyRequest,
    request: Request,
    current_viewer: User = Depends(staff_roles),
    db: Session = Depends(get_db)
):
    """
    Official Response: Delivered directly to student on the platform.
    Faculty can reply to Faculty problems; Administrator can reply to any problem.
    """
    msg = db.query(ProblemBoxMessage).filter(ProblemBoxMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Problem message not found.")

    is_admin = check_is_admin(current_viewer)
    if not is_admin and msg.recipient_role in ["ADMINISTRATOR", "ADMIN", "DIRECTOR"]:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: This problem was sent directly to Administrator and is strictly inaccessible to Faculty."
        )

    msg.status = ProblemStatus.REPLIED
    msg.admin_response_text = req.reply_text.strip()
    msg.replied_at = datetime.utcnow()
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_viewer.id,
        action_type=AuditActionType.REPLY_PROBLEM_BOX,
        target_entity="PROBLEM_BOX_MESSAGE",
        target_id=msg.id,
        ip_address=client_ip,
        details={
            "replied_by": current_viewer.full_name,
            "reply_snippet": req.reply_text[:100]
        }
    )

    # Real-time WebSocket push to student
    await ws_manager.send_to_user(msg.student_id, {
        "type": "PROBLEM_BOX_REPLY",
        "message_id": msg.id,
        "subject": msg.subject,
        "response_text": msg.admin_response_text
    })

    return {
        "message": "Official reply delivered to student via platform.",
        "replied_at": msg.replied_at
    }
