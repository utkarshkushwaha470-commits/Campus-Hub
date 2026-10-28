from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole, AccountStatus
from app.models.moderation import (
    Report, ReportTargetType, ReportStatus, ModerationAction, ModerationActionType, UserBlock
)
from app.models.query import Query, QueryAnswer
from app.models.rating import Rating, RatingStatus
from app.schemas.notification import (
    ReportCreate, ReportResponse, ModerationActionCreate, ModerationActionResponse
)
from app.services.auth_service import get_current_verified_user, require_roles

router = APIRouter(prefix="/api/moderation", tags=["Report, Block & Moderation Queue"])

moderator_roles = require_roles([UserRole.MODERATOR, UserRole.ADMIN])

@router.post("/report", response_model=ReportResponse)
async def report_content(
    req: ReportCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Submits a report on a post, answer, chat message, or user."""
    report = Report(
        reporter_id=current_user.id,
        target_type=req.target_type.upper(),
        target_id=req.target_id,
        reason=req.reason.strip(),
        details=req.details.strip() if req.details else None,
        status=ReportStatus.OPEN
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.post("/block/{user_id}")
async def block_user(
    user_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Blocks a user. Blocked users cannot message each other."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself.")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")

    existing = db.query(UserBlock).filter(
        UserBlock.blocker_id == current_user.id,
        UserBlock.blocked_user_id == user_id
    ).first()

    if not existing:
        block = UserBlock(blocker_id=current_user.id, blocked_user_id=user_id)
        db.add(block)
        db.commit()

    return {"message": f"User {target.full_name} has been blocked. Direct communications disabled."}

@router.get("/queue")
async def list_moderator_queue(
    current_mod: User = Depends(moderator_roles),
    db: Session = Depends(get_db)
):
    """
    Returns items requiring moderator attention:
    1. Open user reports
    2. Flagged abuse ratings held in review
    """
    open_reports = db.query(Report).filter(Report.status == ReportStatus.OPEN).order_by(Report.created_at.desc()).all()
    flagged_ratings = db.query(Rating).filter(Rating.status == RatingStatus.HELD_FOR_REVIEW).order_by(Rating.created_at.desc()).all()

    ratings_data = []
    for r in flagged_ratings:
        senior = db.query(User).filter(User.id == r.rated_senior_id).first()
        junior = db.query(User).filter(User.id == r.rater_student_id).first()
        ratings_data.append({
            "rating_id": r.id,
            "query_id": r.query_id,
            "stars": r.stars,
            "rater_name": junior.full_name if junior else "Student",
            "senior_name": senior.full_name if senior else "Senior",
            "abuse_flag_reason": r.abuse_flag_reason,
            "created_at": r.created_at
        })

    return {
        "open_reports": open_reports,
        "held_ratings": ratings_data
    }

@router.post("/action", response_model=ModerationActionResponse)
async def take_moderation_action(
    req: ModerationActionCreate,
    current_mod: User = Depends(moderator_roles),
    db: Session = Depends(get_db)
):
    """
    Moderator actions:
    - WARN
    - REMOVE_CONTENT
    - TEMP_BAN
    - PERM_BAN
    Logs action and updates target status.
    """
    target_user = db.query(User).filter(User.id == req.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    if req.action_type == ModerationActionType.PERM_BAN:
        target_user.status = AccountStatus.BANNED
    elif req.action_type == ModerationActionType.TEMP_BAN:
        target_user.status = AccountStatus.SUSPENDED

    mod_action = ModerationAction(
        moderator_id=current_mod.id,
        target_user_id=req.target_user_id,
        action_type=req.action_type,
        reason=req.reason.strip(),
        expires_at=req.expires_at or (datetime.utcnow() + timedelta(days=7) if req.action_type == ModerationActionType.TEMP_BAN else None)
    )
    db.add(mod_action)
    db.commit()
    db.refresh(mod_action)

    return mod_action
