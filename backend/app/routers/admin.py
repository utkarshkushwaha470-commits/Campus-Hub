from typing import List, Optional
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, AccountStatus, UserRole
from app.models.id_verification import IDVerification, IDVerificationStatus
from app.models.admin_audit_log import AdminAuditLog, AuditActionType
from app.models.group import CampusGroup
from app.models.notification import Notification
from app.schemas.auth import (
    IDVerificationResponse, IDVerificationReview, YearlyPromotionRequest, UserResponse,
    StudentTerminationRequest, StudentReinstateRequest, CreateAdminRequest, DirectChiefChatMessage
)
from app.services.auth_service import require_roles, get_current_user, get_password_hash
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/admin", tags=["Admin Portal & ID Verification"])

# Restrict all routes in this router to ADMIN
admin_only = require_roles([UserRole.ADMIN])

def check_demo_protection(user: User):
    if getattr(user, 'is_demo', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Prototype Demo Account: This is an interactive read-only demonstration account for project review. Modifying live institutional records is disabled.'
        )


@router.get("/verifications")
async def list_pending_verifications(
    status_filter: Optional[str] = "PENDING",
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Returns queue of student ID verifications for admin review.
    Shows student details, uploaded ID card reference, and Gemma 4 OCR match hint.
    """
    query = db.query(IDVerification).join(User, IDVerification.user_id == User.id)
    if status_filter:
        query = query.filter(IDVerification.status == status_filter)
    
    verifications = query.order_by(IDVerification.created_at.desc()).all()
    
    results = []
    for v in verifications:
        user = db.query(User).filter(User.id == v.user_id).first()
        results.append({
            "id": v.id,
            "user_id": v.user_id,
            "student_name": user.full_name if user else "Unknown",
            "student_email": user.email if user else "",
            "claimed_batch": user.batch if user else "",
            "claimed_crn": user.crn_or_roll_number if user else "",
            "id_photo_storage_path": v.id_photo_storage_path,
            "ocr_extracted_name": v.ocr_extracted_name,
            "ocr_extracted_batch": v.ocr_extracted_batch,
            "ocr_extracted_year": v.ocr_extracted_year,
            "ocr_match_confidence": v.ocr_match_confidence,
            "ocr_hint_status": v.ocr_hint_status,
            "status": v.status,
            "rejection_reason": v.rejection_reason,
            "created_at": v.created_at
        })
    
    return results

@router.get("/verifications/{verif_id}/photo")
async def view_id_card_photo(
    verif_id: str,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to securely decrypt and view the student's ID card photo.
    Encrypted at rest, never accessible publicly or to other students.
    """
    verif = db.query(IDVerification).filter(IDVerification.id == verif_id).first()
    if not verif:
        raise HTTPException(status_code=404, detail="ID verification record not found.")

    photo_bytes = await storage_service.get_id_card_bytes(verif.id_photo_storage_path)
    if not photo_bytes:
        raise HTTPException(status_code=404, detail="ID card photo file missing or already securely deleted.")

    return Response(content=photo_bytes, media_type="image/jpeg")

@router.post("/verifications/{verif_id}/review")
async def review_verification(
    verif_id: str,
    review: IDVerificationReview,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin Approve or Reject action:
    - Approve: User status -> APPROVED. Year is permanently LOCKED from ID card.
    - Reject: User status -> REJECTED with reason.
    - AI hint is visible to admin, but ADMIN DECISION IS FINAL.
    - Full action logged in audit log.
    """
    check_demo_protection(current_admin)
    verif = db.query(IDVerification).filter(IDVerification.id == verif_id).first()
    if not verif:
        raise HTTPException(status_code=404, detail="ID verification record not found.")

    student = db.query(User).filter(User.id == verif.user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Associated student account not found.")

    client_ip = request.client.host if request.client else "127.0.0.1"

    if review.action.upper() == "APPROVE":
        verif.status = IDVerificationStatus.APPROVED
        verif.reviewed_by_admin_id = current_admin.id
        verif.reviewed_at = datetime.utcnow()
        verif.rejection_reason = None

        # Lock the year permanently
        locked_year = review.override_year or verif.ocr_extracted_year or 1
        student.locked_year = locked_year
        student.status = AccountStatus.APPROVED

        db.commit()

        audit_service.log_action(
            db=db,
            admin_id=current_admin.id,
            action_type=AuditActionType.APPROVE_ID,
            target_entity="USER",
            target_id=student.id,
            ip_address=client_ip,
            details={
                "student_name": student.full_name,
                "student_email": student.email,
                "crn": student.crn_or_roll_number,
                "locked_year": locked_year,
                "batch": student.batch,
                "action": "APPROVED"
            }
        )

        return {
            "message": f"Student {student.full_name} approved. Year permanently locked to Year {locked_year}.",
            "locked_year": locked_year
        }

    elif review.action.upper() == "REJECT":
        if not review.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required.")

        verif.status = IDVerificationStatus.REJECTED
        verif.reviewed_by_admin_id = current_admin.id
        verif.reviewed_at = datetime.utcnow()
        verif.rejection_reason = review.rejection_reason

        student.status = AccountStatus.REJECTED
        db.commit()

        audit_service.log_action(
            db=db,
            admin_id=current_admin.id,
            action_type=AuditActionType.REJECT_ID,
            target_entity="USER",
            target_id=student.id,
            ip_address=client_ip,
            details={
                "student_name": student.full_name,
                "student_email": student.email,
                "crn": student.crn_or_roll_number,
                "batch": student.batch,
                "rejection_reason": review.rejection_reason,
                "action": "REJECTED"
            }
        )

        return {
            "message": f"Student verification rejected. Reason: '{review.rejection_reason}'. Student can now resubmit."
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'APPROVE' or 'REJECT'.")

@router.delete("/verifications/{verif_id}/photo")
async def delete_id_photo(
    verif_id: str,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Deletes student ID card photo after verification for GDPR/privacy compliance."""
    verif = db.query(IDVerification).filter(IDVerification.id == verif_id).first()
    if not verif:
        raise HTTPException(status_code=404, detail="ID verification record not found.")

    deleted = await storage_service.delete_id_card(verif.id_photo_storage_path)
    verif.id_photo_storage_path = "[DELETED_POST_VERIFICATION]"
    db.commit()
    return {"message": "ID card photo securely deleted from storage.", "success": deleted}

@router.post("/users/{user_id}/promote-year")
async def promote_student_year(
    user_id: str,
    promo: YearlyPromotionRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Annual promotion action.
    The student CANNOT change their locked year.
    Only the Admin can execute a promotion update.
    """
    check_demo_protection(current_admin)
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    old_year = student.locked_year
    student.locked_year = promo.new_year
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.PROMOTE_YEAR,
        target_entity="USER",
        target_id=student.id,
        ip_address=client_ip,
        details={"old_year": old_year, "new_year": promo.new_year}
    )

    return {
        "message": f"Student {student.full_name} promoted from Year {old_year} to Year {promo.new_year}.",
        "new_year": promo.new_year
    }

@router.get("/audit-logs")
async def get_admin_audit_logs(
    limit: int = 50,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Returns immutable log of all administrator actions for institutional accountability."""
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit).all()
    return logs

@router.get("/students")
async def list_all_students(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    year_filter: Optional[int] = None,
    role_filter: Optional[str] = None,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin access to ALL students across campus.
    Enables viewing profiles, academic years, CRN/roll numbers, points, level, and account status.
    Administrators are strictly excluded from the student directory.
    """
    query = db.query(User).filter(User.role != UserRole.ADMIN)
    
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(User.status == status_filter.upper())
    
    if year_filter:
        query = query.filter(User.locked_year == year_filter)
        
    if role_filter and role_filter.upper() != "ALL":
        query = query.filter(User.role == role_filter.upper())
        
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(s)) |
            (User.email.ilike(s)) |
            (User.crn_or_roll_number.ilike(s)) |
            (User.batch.ilike(s))
        )
        
    users = query.order_by(User.created_at.desc()).all()
    
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "locked_year": u.locked_year,
            "batch": u.batch,
            "crn_or_roll_number": u.crn_or_roll_number,
            "points": u.points,
            "level": u.level,
            "is_2fa_enabled": u.is_2fa_enabled,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.post("/students/{user_id}/terminate")
async def terminate_student(
    user_id: str,
    req: StudentTerminationRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin action to TERMINATE a student's account.
    Immediately revokes access across the platform and logs an audit record.
    """
    check_demo_protection(current_admin)
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student account not found.")

    if student.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot terminate an Administrator account.")

    previous_status = student.status
    student.status = AccountStatus.TERMINATED
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.TERMINATE_STUDENT,
        target_entity="USER",
        target_id=student.id,
        ip_address=client_ip,
        details={
            "student_name": student.full_name,
            "student_email": student.email,
            "crn": student.crn_or_roll_number,
            "previous_status": previous_status,
            "termination_reason": req.reason
        }
    )

    return {
        "message": f"Student {student.full_name} ({student.crn_or_roll_number}) has been permanently TERMINATED.",
        "status": student.status,
        "reason": req.reason
    }

@router.post("/students/{user_id}/reinstate")
async def reinstate_student(
    user_id: str,
    req: StudentReinstateRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Admin action to reinstate a previously terminated or suspended student.
    Restores account status to APPROVED.
    """
    check_demo_protection(current_admin)
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student account not found.")

    previous_status = student.status
    student.status = AccountStatus.APPROVED
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.REINSTATE_STUDENT,
        target_entity="USER",
        target_id=student.id,
        ip_address=client_ip,
        details={
            "student_name": student.full_name,
            "student_email": student.email,
            "previous_status": previous_status,
            "reinstate_reason": req.reason
        }
    )

    return {
        "message": f"Student {student.full_name} has been REINSTATED to APPROVED status.",
        "status": student.status
    }

# ================= CHIEF ADMINISTRATOR MANAGEMENT ENDPOINTS =================

@router.get("/admins-list")
async def list_all_admins(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Returns list of all administrators.
    Chief Admin is highlighted as the supreme authority (Utkarsh Kushwaha).
    """
    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    query = db.query(User).filter(User.role == UserRole.ADMIN)
    if not is_chief:
        # Normal sub-admins cannot view pending registering admins or clearance queue
        query = query.filter(User.status == AccountStatus.APPROVED)
    admins = query.order_by(User.created_at.asc()).all()
    
    results = []
    for a in admins:
        is_chief = a.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(a, "is_chief_admin", False)
        results.append({
            "id": a.id,
            "full_name": a.full_name,
            "email": a.email,
            "batch": a.batch,
            "status": a.status,
            "crn_or_roll_number": a.crn_or_roll_number,
            "is_chief_admin": is_chief,
            "created_at": a.created_at
        })
    return results

@router.get("/admins-work-dossier")
async def get_admins_work_dossier(
    admin_id: Optional[str] = None,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Access complete work performance, activities,
    and administrative execution details of all college administrators.
    """
    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA has authority to inspect all administrators' work dossiers."
        )

    # Fetch admins
    admins_query = db.query(User).filter(User.role == UserRole.ADMIN)
    if admin_id:
        admins_query = admins_query.filter(User.id == admin_id)
    admins = admins_query.order_by(User.created_at.asc()).all()

    work_dossiers = []
    for a in admins:
        is_chief_user = a.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(a, "is_chief_admin", False)

        # 1. Audit logs for this admin
        logs = db.query(AdminAuditLog).filter(AdminAuditLog.admin_user_id == a.id).order_by(AdminAuditLog.created_at.desc()).all()

        # 2. Work metrics calculation
        verifs_approved = sum(1 for log in logs if log.action_type == AuditActionType.APPROVE_ID)
        verifs_rejected = sum(1 for log in logs if log.action_type == AuditActionType.REJECT_ID)
        students_terminated = sum(1 for log in logs if log.action_type == AuditActionType.TERMINATE_STUDENT)
        students_promoted = sum(1 for log in logs if log.action_type == AuditActionType.PROMOTE_YEAR)
        groups_created = sum(1 for log in logs if log.action_type == AuditActionType.CREATE_GROUP)
        alerts_published = sum(1 for log in logs if log.action_type == AuditActionType.PUBLISH_NOTIFICATION)
        problem_box_handled = sum(1 for log in logs if log.action_type in [
            AuditActionType.FORWARD_PROBLEM_BOX,
            AuditActionType.REPLY_PROBLEM_BOX,
            AuditActionType.VIEW_PROBLEM_BOX
        ])

        # Cross-reference direct tables
        direct_verifs = db.query(IDVerification).filter(IDVerification.reviewed_by_admin_id == a.id).all()
        if len(direct_verifs) > (verifs_approved + verifs_rejected):
            verifs_approved = sum(1 for v in direct_verifs if v.status == "APPROVED")
            verifs_rejected = sum(1 for v in direct_verifs if v.status == "REJECTED")

        direct_groups = db.query(CampusGroup).filter(CampusGroup.created_by_admin_id == a.id).count()
        if direct_groups > groups_created:
            groups_created = direct_groups

        direct_notifications = db.query(Notification).filter(Notification.sender_id == a.id).count()
        if direct_notifications > alerts_published:
            alerts_published = direct_notifications

        last_log = logs[0] if logs else None
        last_active = last_log.created_at if last_log else a.updated_at
        last_ip = last_log.ip_address if last_log else "127.0.0.1"

        # Recent activities (up to 50 actions) with enriched student details
        recent_activities = []
        for log in logs[:50]:
            parsed_details = {}
            if log.details_json:
                if isinstance(log.details_json, dict):
                    parsed_details = dict(log.details_json)
                elif isinstance(log.details_json, str):
                    try:
                        parsed_details = json.loads(log.details_json)
                    except Exception:
                        parsed_details = {"raw": log.details_json}

            student_info = None
            if log.target_entity in ["USER", "STUDENT"] and log.target_id:
                target_user = db.query(User).filter(User.id == log.target_id).first()
                if target_user:
                    student_info = {
                        "name": target_user.full_name,
                        "crn": target_user.crn_or_roll_number,
                        "email": target_user.email,
                        "batch": target_user.batch,
                        "locked_year": target_user.locked_year,
                        "status": target_user.status
                    }
                    if "student_name" not in parsed_details:
                        parsed_details["student_name"] = target_user.full_name
                    if "student_email" not in parsed_details:
                        parsed_details["student_email"] = target_user.email
                    if "crn" not in parsed_details:
                        parsed_details["crn"] = target_user.crn_or_roll_number
                    if "batch" not in parsed_details:
                        parsed_details["batch"] = target_user.batch
                    if "locked_year" not in parsed_details and target_user.locked_year:
                        parsed_details["locked_year"] = target_user.locked_year

            recent_activities.append({
                "id": log.id,
                "action_type": log.action_type,
                "target_entity": log.target_entity,
                "target_id": log.target_id,
                "ip_address": log.ip_address,
                "details": parsed_details,
                "student_info": student_info,
                "timestamp": log.created_at
            })

        work_dossiers.append({
            "admin_id": a.id,
            "full_name": a.full_name,
            "email": a.email,
            "batch": a.batch,
            "status": a.status,
            "crn_or_roll_number": a.crn_or_roll_number,
            "is_chief_admin": is_chief_user,
            "created_at": a.created_at,
            "last_active_at": last_active,
            "last_ip_address": last_ip,
            "metrics": {
                "total_actions": len(logs),
                "verifications_reviewed": verifs_approved + verifs_rejected,
                "verifications_approved": verifs_approved,
                "verifications_rejected": verifs_rejected,
                "students_terminated": students_terminated,
                "students_promoted": students_promoted,
                "groups_created": groups_created,
                "alerts_published": alerts_published,
                "problem_box_handled": problem_box_handled
            },
            "recent_activities": recent_activities
        })

    return work_dossiers

@router.post("/create-admin")
async def create_new_admin(
    req: CreateAdminRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Appoint a new institutional Administrator.
    Only Utkarsh Kushwaha possesses this executive authority.
    """
    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA has the authority to appoint new administrators."
        )

    # Check email duplicate
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email {req.email} already exists."
        )

    new_admin = User(
        id=str(uuid.uuid4()),
        email=req.email.lower().strip(),
        full_name=req.full_name.strip(),
        password_hash=get_password_hash(req.password),
        role=UserRole.ADMIN,
        status=AccountStatus.APPROVED,
        locked_year=None,
        batch="STAFF-ADMIN",
        crn_or_roll_number=f"ADM-{uuid.uuid4().hex[:6].upper()}",
        is_2fa_enabled=False,
        admin_proof=req.admin_proof.strip() if req.admin_proof.strip() else "staffadmin2026",
        is_chief_admin=False
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.CREATE_MODULE,  # Executive admin creation
        target_entity="ADMIN_USER",
        target_id=new_admin.id,
        ip_address=client_ip,
        details={
            "chief_admin": current_admin.full_name,
            "new_admin_name": new_admin.full_name,
            "new_admin_email": new_admin.email
        }
    )

    return {
        "message": f"Successfully appointed new Administrator: {new_admin.full_name} ({new_admin.email}).",
        "admin": {
            "id": new_admin.id,
            "full_name": new_admin.full_name,
            "email": new_admin.email,
            "role": new_admin.role,
            "is_chief_admin": False
        }
    }

@router.delete("/delete-admin/{admin_id}")
async def delete_or_terminate_admin(
    admin_id: str,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Revoke or delete a sub-administrator's credentials.
    Utkarsh Kushwaha cannot be deleted.
    """
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can terminate or delete administrators."
        )

    target_admin = db.query(User).filter(User.id == admin_id).first()
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrator account not found.")

    if target_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(target_admin, "is_chief_admin", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chief Administrator UTKARSH KUSHWAHA is the permanent platform director and cannot be deleted or revoked."
        )

    target_admin.status = AccountStatus.TERMINATED
    target_admin.role = UserRole.STUDENT  # Revoke administrative role
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.TERMINATE_STUDENT,
        target_entity="ADMIN_REVOCATION",
        target_id=target_admin.id,
        ip_address=client_ip,
        details={
            "chief_admin": current_admin.full_name,
            "revoked_admin_name": target_admin.full_name,
            "revoked_admin_email": target_admin.email
        }
    )

    return {
        "message": f"Administrator credentials for {target_admin.full_name} have been REVOKED.",
        "revoked_id": target_admin.id
    }

@router.post("/approve-admin-request/{admin_id}")
async def approve_admin_request(
    admin_id: str,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Approve a pending administrator clearance request.
    Only Utkarsh Kushwaha has this authority.
    """
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can approve administrator clearance requests."
        )

    target_admin = db.query(User).filter(User.id == admin_id).first()
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrator applicant record not found.")

    target_admin.status = AccountStatus.APPROVED
    target_admin.role = UserRole.ADMIN
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.APPROVE_ID,
        target_entity="ADMIN_APPROVAL",
        target_id=target_admin.id,
        ip_address=client_ip,
        details={
            "chief_admin": current_admin.full_name,
            "approved_admin_name": target_admin.full_name,
            "approved_admin_email": target_admin.email
        }
    )

    return {
        "message": f"Successfully approved administrator clearance for {target_admin.full_name} ({target_admin.email}).",
        "admin_id": target_admin.id
    }

@router.post("/reject-admin-request/{admin_id}")
async def reject_admin_request(
    admin_id: str,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Reject a pending administrator clearance request.
    """
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can reject administrator clearance requests."
        )

    target_admin = db.query(User).filter(User.id == admin_id).first()
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrator applicant record not found.")

    target_admin.status = AccountStatus.REJECTED
    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.REJECT_ID,
        target_entity="ADMIN_REJECTION",
        target_id=target_admin.id,
        ip_address=client_ip,
        details={
            "chief_admin": current_admin.full_name,
            "rejected_admin_name": target_admin.full_name,
            "rejected_admin_email": target_admin.email
        }
    )

    return {
        "message": f"Administrator request for {target_admin.full_name} ({target_admin.email}) has been rejected.",
        "admin_id": target_admin.id
    }

@router.post("/chief-message")
async def send_direct_message_to_chief(
    req: DirectChiefChatMessage,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Direct communication channel for sub-administrators to consult or report directly
    to Chief Administrator Utkarsh Kushwaha.
    """
    chief = db.query(User).filter(
        (User.email == "utkarshkushwaha470@gmail.com") | (User.is_chief_admin == True)
    ).first()

    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_service.log_action(
        db=db,
        admin_id=current_admin.id,
        action_type=AuditActionType.PROBLEM_FORWARD,
        target_entity="CHIEF_ADMIN_DISPATCH",
        target_id=chief.id if chief else "CHIEF",
        ip_address=client_ip,
        details={
            "from_admin": current_admin.full_name,
            "from_email": current_admin.email,
            "subject": req.subject,
            "message": req.message
        }
    )

    return {
        "message": f"Urgent administrative dispatch received by Chief Administrator UTKARSH KUSHWAHA.",
        "timestamp": datetime.utcnow()
    }
