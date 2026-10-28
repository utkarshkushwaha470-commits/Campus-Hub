from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, AccountStatus, UserRole
from app.models.id_verification import IDVerification, IDVerificationStatus
from app.models.admin_audit_log import AdminAuditLog, AuditActionType
from app.schemas.auth import (
    IDVerificationResponse, IDVerificationReview, YearlyPromotionRequest, UserResponse
)
from app.services.auth_service import require_roles, get_current_user
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/admin", tags=["Admin Portal & ID Verification"])

# Restrict all routes in this router to ADMIN
admin_only = require_roles([UserRole.ADMIN])

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
            details={"locked_year": locked_year, "batch": student.batch, "crn": student.crn_or_roll_number}
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
            details={"rejection_reason": review.rejection_reason}
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
