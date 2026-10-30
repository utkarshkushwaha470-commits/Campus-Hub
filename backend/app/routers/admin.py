from typing import List, Optional
from pydantic import BaseModel
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, AccountStatus, UserRole
from app.models.id_verification import IDVerification, IDVerificationStatus
from app.models.admin_audit_log import AdminAuditLog, AuditActionType, FacultyDispatch
from app.models.group import CampusGroup
from app.models.chat import ChiefFacultyMessage
from app.models.notification import Notification
from app.schemas.auth import (
    IDVerificationResponse, IDVerificationReview, YearlyPromotionRequest, UserResponse,
    StudentTerminationRequest, StudentReinstateRequest, CreateAdminRequest, AppointFacultyRequest, DirectChiefChatMessage
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
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA has the authority to appoint new administrators."
        )

    clean_email = req.email.lower().strip()
    clean_name = req.full_name.strip()
    proof_pass = req.admin_proof.strip() if req.admin_proof and req.admin_proof.strip() else "staffadmin2026"

    # Check if user already exists
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        if existing.role == UserRole.ADMIN and existing.status == AccountStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active Administrator account with email {clean_email} already exists."
            )
        # If existing is a student or pending applicant, promote them directly to Administrator!
        existing.role = UserRole.ADMIN
        existing.status = AccountStatus.APPROVED
        existing.full_name = clean_name
        if req.password:
            existing.password_hash = get_password_hash(req.password)
        existing.admin_proof = proof_pass
        existing.batch = "STAFF-ADMIN"
        existing.is_chief_admin = False
        db.commit()
        db.refresh(existing)
        new_admin = existing
    else:
        new_admin = User(
            id=str(uuid.uuid4()),
            email=clean_email,
            full_name=clean_name,
            password_hash=get_password_hash(req.password),
            role=UserRole.ADMIN,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="STAFF-ADMIN",
            crn_or_roll_number=f"ADM-{uuid.uuid4().hex[:6].upper()}",
            is_2fa_enabled=False,
            admin_proof=proof_pass,
            is_chief_admin=False
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        audit_service.log_action(
            db=db,
            admin_id=current_admin.id,
            action_type=AuditActionType.CREATE_ADMIN,
            target_entity="ADMIN_USER",
            target_id=new_admin.id,
            ip_address=client_ip,
            details={
                "chief_admin": current_admin.full_name,
                "new_admin_name": new_admin.full_name,
                "new_admin_email": new_admin.email
            }
        )
    except Exception:
        pass

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


@router.get("/faculty-list")
async def list_all_faculty(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Returns list of all faculty members in the institution."""
    faculties = db.query(User).filter(User.role == UserRole.FACULTY).order_by(User.full_name.asc()).all()
    return [
        {
            "id": f.id,
            "full_name": f.full_name,
            "email": f.email,
            "batch": f.batch,
            "status": f.status,
            "crn_or_roll_number": f.crn_or_roll_number,
            "created_at": f.created_at
        }
        for f in faculties
    ]

@router.post("/appoint-faculty")
async def appoint_faculty_member(
    req: AppointFacultyRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Appoint a Faculty Member / Professor directly.
    Only Utkarsh Kushwaha has executive authority.
    """
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA has authority to appoint faculty members."
        )

    clean_email = req.email.lower().strip()
    clean_name = req.full_name.strip()
    dept = req.department.strip() if req.department and req.department.strip() else "Computer Science & Engineering"

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        if existing.role == UserRole.FACULTY and existing.status == AccountStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active Faculty member with email '{clean_email}' already exists."
            )
        # Upgrade account to Faculty
        existing.role = UserRole.FACULTY
        existing.status = AccountStatus.APPROVED
        existing.full_name = clean_name
        if req.password:
            existing.password_hash = get_password_hash(req.password)
        existing.batch = f"FACULTY - {dept}"
        existing.locked_year = None
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        new_fac = User(
            id=str(uuid.uuid4()),
            email=clean_email,
            full_name=clean_name,
            password_hash=get_password_hash(req.password),
            role=UserRole.FACULTY,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch=f"FACULTY - {dept}",
            crn_or_roll_number=f"FAC-{uuid.uuid4().hex[:6].upper()}",
            is_2fa_enabled=False,
            is_chief_admin=False
        )
        db.add(new_fac)
        db.commit()
        db.refresh(new_fac)
        target = new_fac

    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        audit_service.log_action(
            db=db,
            admin_id=current_admin.id,
            action_type=AuditActionType.CREATE_MODULE,
            target_entity="FACULTY_MEMBER",
            target_id=target.id,
            ip_address=client_ip,
            details={
                "chief_admin": current_admin.full_name,
                "faculty_name": target.full_name,
                "faculty_email": target.email,
                "department": dept
            }
        )
    except Exception:
        pass

    return {
        "message": f"Successfully appointed Faculty member: {target.full_name} ({target.email}) - {dept}.",
        "faculty": {
            "id": target.id,
            "full_name": target.full_name,
            "email": target.email,
            "role": target.role,
            "batch": target.batch
        }
    }

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


# ============================================================================
# CHIEF ADMINISTRATOR <-> FACULTY DIRECT 1-ON-1 PERSONAL CHAT ENGINE
# Strictly for Faculty & Staff Admins <-> Chief Admin Utkarsh Kushwaha
# Students are strictly forbidden from accessing this feature.
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
    Direct 1-on-1 personal chat channel for Faculty members and Staff Administrators
    to communicate directly with Chief Administrator Utkarsh Kushwaha.
    Students are strictly forbidden from this executive channel.
    """
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Students are strictly forbidden from Direct Chat with Chief Administrator."
        )

    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only verified Faculty and Administrators can communicate with Chief Administrator."
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
    """
    Faculty / Staff Admin retrieves their entire 1-on-1 personal conversation with Chief Admin.
    Also automatically marks Chief Admin replies as read.
    """
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Students are strictly forbidden from Direct Chat with Chief Administrator."
        )

    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only verified Faculty and Administrators can view Chief Administrator chat."
        )

    # Mark Chief Admin replies to this faculty member as read
    db.query(ChiefFacultyMessage).filter(
        ChiefFacultyMessage.faculty_id == current_user.id,
        ChiefFacultyMessage.sender_role == "CHIEF_ADMIN",
        ChiefFacultyMessage.is_read == False
    ).update({"is_read": True})
    db.commit()

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

@router.get("/faculty/unread-from-chief")
async def faculty_unread_from_chief(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if Chief Admin has sent an unread reply to this faculty member."""
    if current_user.role == UserRole.STUDENT or current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        return {"unread_count": 0}

    count = db.query(ChiefFacultyMessage).filter(
        ChiefFacultyMessage.faculty_id == current_user.id,
        ChiefFacultyMessage.sender_role == "CHIEF_ADMIN",
        ChiefFacultyMessage.is_read == False
    ).count()

    return {"unread_count": count}

@router.get("/faculty-chats")
async def list_faculty_chats_for_chief(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: View all active 1-on-1 conversations with Faculty & Staff Admins.
    """
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can access Direct Chat with Faculty."
        )

    # Get all faculty and staff administrators (excluding Chief Admin himself and students)
    faculties = db.query(User).filter(
        User.role.in_([UserRole.FACULTY, UserRole.ADMIN]),
        User.id != current_admin.id,
        User.is_chief_admin == False
    ).all()

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
            "department": f.batch or ("Staff Admin" if f.role == UserRole.ADMIN else "Faculty Member"),
            "role": f.role,
            "last_message": last_msg.message if last_msg else "No messages yet",
            "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread_count,
            "has_conversation": last_msg is not None
        })

    # Sort with faculty who have unread messages or recent messages first
    results.sort(key=lambda x: (x["unread_count"] > 0, x["last_message_at"] or ""), reverse=True)
    return results

@router.get("/faculty-chats/unread-count")
async def get_chief_faculty_chats_unread_count(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Get total count of unread messages from all faculty members for Chief Admin."""
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        return {"unread_count": 0}

    count = db.query(ChiefFacultyMessage).filter(
        ChiefFacultyMessage.sender_role == "FACULTY",
        ChiefFacultyMessage.is_read == False
    ).count()

    return {"unread_count": count}

@router.get("/faculty-chat-thread/{faculty_id}")
async def get_faculty_chat_thread(
    faculty_id: str,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Chief Administrator retrieves full 1-on-1 personal conversation thread with a specific faculty member."""
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA can view Faculty chats."
        )

    faculty = db.query(User).filter(User.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    # Mark all incoming messages from this faculty member as read
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
            "department": faculty.batch or ("Staff Admin" if faculty.role == UserRole.ADMIN else "Faculty Member"),
            "role": faculty.role
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
    """Chief Administrator sends a direct personal reply message to a Faculty member."""
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
        is_read=False
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)

    return {
        "message": f"Personal message successfully delivered to {faculty.full_name}.",
        "data": {
            "id": reply.id,
            "sender_name": reply.sender_name,
            "sender_role": reply.sender_role,
            "message": reply.message,
            "created_at": reply.created_at.isoformat()
        }
    }
