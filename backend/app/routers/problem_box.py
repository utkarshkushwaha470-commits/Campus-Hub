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

admin_only = require_roles([UserRole.ADMIN])

@router.post("/", response_model=ProblemBoxStudentResponse)
async def submit_problem_message(
    req: ProblemBoxCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Student submits confidential message to Dean, HOD, or Director.
    PRIVACY RULES:
    1. Sender identity is stored privately in database for Admin eyes ONLY.
    2. Hidden from all other general students/faculty.
    3. Gemma 4 safety pre-screening receives ONLY the message text (NO student name/email/ID).
    4. Urgent safety issues flagged to rise to the top of the admin queue.
    """
    if req.recipient_role.upper() not in [ProblemRecipientRole.DEAN, ProblemRecipientRole.HOD, ProblemRecipientRole.DIRECTOR]:
        raise HTTPException(
            status_code=400,
            detail="Recipient must be one of: 'DEAN', 'HOD', or 'DIRECTOR'."
        )

    # Gemma 4 PII-free safety screening
    safety_analysis = await ai_service.screen_problem_box_safety(message_text=f"{req.subject} {req.content_text}")

    msg = ProblemBoxMessage(
        student_id=current_user.id,
        recipient_role=req.recipient_role.upper(),
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
    """Student views their own submitted messages and administrative replies."""
    messages = db.query(ProblemBoxMessage).filter(
        ProblemBoxMessage.student_id == current_user.id
    ).order_by(ProblemBoxMessage.created_at.desc()).all()
    return messages

@router.get("/admin/queue", response_model=List[ProblemBoxAdminResponse])
async def list_problem_box_admin_queue(
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin-only review queue:
    - ONLY the admin can see the sender's identity.
    - Urgent and safety-flagged messages sorted to the top.
    - Admin access is logged in admin_audit_log for institutional accountability.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Audit log of admin viewing the Problem Box queue
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.VIEW_PROBLEM_BOX,
        target_entity="PROBLEM_BOX_QUEUE",
        ip_address=client_ip,
        details={"status": "VIEWED_CONFIDENTIAL_QUEUE"}
    )

    # Sort safety flagged issues first, then chronological
    messages = db.query(ProblemBoxMessage).order_by(
        ProblemBoxMessage.ai_safety_flag.desc(),
        ProblemBoxMessage.created_at.desc()
    ).all()

    admin_view = []
    for m in messages:
        student = db.query(User).filter(User.id == m.student_id).first()
        admin_view.append({
            "id": m.id,
            "student_id": m.student_id,
            "student_name": student.full_name if student else "Unknown",
            "student_email": student.email if student else "",
            "student_batch": student.batch if student else "",
            "student_year": student.locked_year if student else None,
            "recipient_role": m.recipient_role,
            "subject": m.subject,
            "content_text": m.content_text,
            "status": m.status,
            "ai_safety_flag": m.ai_safety_flag,
            "ai_safety_category": m.ai_safety_category,
            "forwarded_to_name": m.forwarded_to_name,
            "admin_response_text": m.admin_response_text,
            "forwarded_at": m.forwarded_at,
            "replied_at": m.replied_at,
            "created_at": m.created_at
        })

    return admin_view

@router.post("/admin/{message_id}/forward")
async def forward_problem_box_anonymously(
    message_id: str,
    req: ProblemBoxForwardRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin Decision: FORWARD WITH NO NAME.
    Sends message content to Dean, HOD, or Director without sender's identity (anonymized).
    Audit log created for accountability.
    """
    msg = db.query(ProblemBoxMessage).filter(ProblemBoxMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Problem message not found.")

    msg.status = ProblemStatus.FORWARDED_ANONYMOUSLY
    msg.forwarded_to_name = req.target_authority_name
    msg.forwarded_at = datetime.utcnow()
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.FORWARD_PROBLEM_BOX,
        target_entity="PROBLEM_BOX_MESSAGE",
        target_id=msg.id,
        ip_address=client_ip,
        details={
            "recipient_role": msg.recipient_role,
            "forwarded_to_authority": req.target_authority_name,
            "anonymized": True
        }
    )

    # Anonymized payload sent to institutional authority
    anonymized_payload = {
        "institution": "Brogrammers Official Incident Report",
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
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin Decision: REPLY DIRECTLY.
    Response reaches student ONLY through the platform.
    Audit log created.
    """
    msg = db.query(ProblemBoxMessage).filter(ProblemBoxMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Problem message not found.")

    msg.status = ProblemStatus.REPLIED
    msg.admin_response_text = req.reply_text.strip()
    msg.replied_at = datetime.utcnow()
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.REPLY_PROBLEM_BOX,
        target_entity="PROBLEM_BOX_MESSAGE",
        target_id=msg.id,
        ip_address=client_ip,
        details={"reply_snippet": req.reply_text[:100]}
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
