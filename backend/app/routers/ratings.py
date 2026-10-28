from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.query import Query, QueryAnswer
from app.models.chat import Thread, Message
from app.models.rating import Rating, RatingStatus, PointsLedger
from app.schemas.rating import RatingCreate, RatingResponse, LeaderboardEntry
from app.services.auth_service import get_current_verified_user
from app.services.abuse_service import abuse_service

router = APIRouter(prefix="/api/ratings", tags=["Ratings, Anti-Abuse & Leaderboard"])

@router.post("/", response_model=RatingResponse)
async def submit_rating(
    req: RatingCreate,
    request: Request,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Junior rates Senior (1-5 stars).
    Strict Rules Enforced:
    1. Only the person who asked the query can rate.
    2. Only after senior has replied (query answer or chat message exists).
    3. Exactly one rating per query.
    4. No self-rating.
    5. Pass to abuse_service:
       - Check daily velocity limit (max 5/day)
       - Check pair weekly velocity (max 2/week)
       - Check mutual 5-star trading
       - Check burst timing (< 3 min)
       - If pass: award points, update level, update leaderboard.
       - If fail: hold points (HELD_FOR_REVIEW) and alert moderator review queue.
    """
    if req.stars < 1 or req.stars > 5:
        raise HTTPException(status_code=400, detail="Rating stars must be between 1 and 5.")

    query_obj = db.query(Query).filter(Query.id == req.query_id).first()
    if not query_obj:
        raise HTTPException(status_code=404, detail="Target query not found.")

    # Rule 1: Only the person who asked can rate
    if query_obj.poster_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the student who asked this query is permitted to rate the senior."
        )

    # Rule 3: One rating per query
    existing_rating = db.query(Rating).filter(Rating.query_id == req.query_id).first()
    if existing_rating:
        raise HTTPException(status_code=400, detail="A rating has already been submitted for this doubt.")

    # Identify senior: either from public answer or assigned 1-to-1 senior
    senior_id = query_obj.assigned_senior_id
    if not senior_id:
        # Check first accepted/latest answer
        latest_answer = db.query(QueryAnswer).filter(
            QueryAnswer.query_id == req.query_id,
            QueryAnswer.author_id != current_user.id
        ).order_by(QueryAnswer.created_at.desc()).first()

        if not latest_answer:
            raise HTTPException(
                status_code=400,
                detail="Cannot submit rating before a senior has provided an answer."
            )
        senior_id = latest_answer.author_id
    else:
        # In 1-to-1, check if senior has sent at least one message
        thread = db.query(Thread).filter(Thread.query_id == req.query_id).first()
        if thread:
            senior_msg = db.query(Message).filter(
                Message.thread_id == thread.id,
                Message.sender_id == senior_id
            ).first()
            if not senior_msg:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot rate: the senior has not yet sent any reply in this chat thread."
                )

    senior_user = db.query(User).filter(User.id == senior_id).first()
    if not senior_user:
        raise HTTPException(status_code=404, detail="Senior user profile not found.")

    client_ip = request.client.host if request.client else "127.0.0.1"

    # Evaluate via Abuse Engine
    passed, flag_reason, weight = abuse_service.evaluate_rating(
        db=db,
        rater_student=current_user,
        rated_senior=senior_user,
        query_id=req.query_id,
        stars=req.stars,
        client_ip=client_ip
    )

    rating_status = RatingStatus.PASSED if passed else RatingStatus.HELD_FOR_REVIEW

    rating_entry = Rating(
        query_id=req.query_id,
        rater_student_id=current_user.id,
        rated_senior_id=senior_id,
        stars=req.stars,
        comment=req.comment,
        status=rating_status,
        abuse_flag_reason=flag_reason
    )
    db.add(rating_entry)
    db.commit()
    db.refresh(rating_entry)

    if passed:
        # Base points: 10 pts per star * account weight
        awarded_points = int(req.stars * 10 * weight)
        senior_user.points += awarded_points
        senior_user.level = abuse_service.calculate_level(senior_user.points)

        ledger_entry = PointsLedger(
            user_id=senior_id,
            rating_id=rating_entry.id,
            points_delta=awarded_points,
            reason=f"Helpful answer rating ({req.stars} stars) for Query '{query_obj.title[:30]}...'"
        )
        db.add(ledger_entry)
        db.commit()
    else:
        # Points held in quarantine, sent to moderator review queue
        abuse_service.flag_for_moderator(
            db=db,
            rating_id=rating_entry.id,
            reason=flag_reason or "Anomalous velocity detected",
            rater_id=current_user.id,
            senior_id=senior_id
        )

    return rating_entry

@router.get("/leaderboard")
async def get_leaderboard(
    category: str = "overall",  # overall, year_2, year_3, year_4, pg_faculty
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Returns Leaderboard rankings (overall or year-wise).
    Updated in real time based on points awarded through verified ratings.
    """
    q = db.query(User).filter(User.status == "APPROVED")

    if category == "year_2":
        q = q.filter(User.locked_year == 2)
    elif category == "year_3":
        q = q.filter(User.locked_year == 3)
    elif category == "year_4":
        q = q.filter(User.locked_year == 4)
    elif category == "pg_faculty":
        q = q.filter(User.role.in_(["PG", "FACULTY"]))

    top_users = q.order_by(User.points.desc()).limit(limit).all()

    leaderboard = []
    for rank, u in enumerate(top_users, start=1):
        leaderboard.append({
            "rank": rank,
            "user_id": u.id,
            "full_name": u.full_name,
            "role": u.role,
            "locked_year": u.locked_year,
            "points": u.points,
            "level": u.level,
            "batch": u.batch
        })

    return {
        "category": category,
        "rankings": leaderboard
    }
