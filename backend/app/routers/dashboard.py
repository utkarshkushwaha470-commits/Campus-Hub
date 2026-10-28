from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.query import Query
from app.models.notification import Notification, UserNotificationRead
from app.models.problem_box import ProblemBoxMessage
from app.services.auth_service import get_current_verified_user

router = APIRouter(prefix="/api/dashboard", tags=["Student Dashboard & Sections"])

@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Returns student profile card and 4 core area summary stats:
    1. Profile Card: name, CRN, batch, locked_year, points, level, badges
    2. Year Sections (1st to 4th year)
    3. Premium Section (Access allowed for PG / Faculty / Admin)
    4. Problem Box status
    5. Notifications unread count
    """
    # Unread notifications count
    read_subquery = db.query(UserNotificationRead.notification_id).filter(
        UserNotificationRead.user_id == current_user.id
    )
    unread_notifs_count = db.query(func.count(Notification.id)).filter(
        ~Notification.id.in_(read_subquery)
    ).scalar() or 0

    # Problem box messages count
    problem_box_count = db.query(func.count(ProblemBoxMessage.id)).filter(
        ProblemBoxMessage.student_id == current_user.id
    ).scalar() or 0

    # Query counts for each year section
    year_stats = {}
    for yr in [1, 2, 3, 4]:
        count = db.query(func.count(Query.id)).filter(
            Query.target_year == yr,
            Query.is_premium == False
        ).scalar() or 0
        year_stats[f"year_{yr}"] = count

    premium_queries_count = db.query(func.count(Query.id)).filter(
        Query.is_premium == True
    ).scalar() or 0

    has_premium_access = current_user.role in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]

    return {
        "profile": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "crn_or_roll_number": current_user.crn_or_roll_number,
            "batch": current_user.batch,
            "locked_year": current_user.locked_year,
            "role": current_user.role,
            "points": current_user.points,
            "level": current_user.level,
            "badges": current_user.badges
        },
        "areas": {
            "year_sections": {
                "active_years": [1, 2, 3, 4],
                "stats": year_stats,
                "user_year": current_user.locked_year
            },
            "premium_section": {
                "has_access": has_premium_access,
                "role": current_user.role,
                "active_discussions": premium_queries_count
            },
            "problem_box": {
                "my_submissions_count": problem_box_count
            },
            "notifications": {
                "unread_count": unread_notifs_count
            }
        }
    }

@router.get("/section/{year}")
async def access_year_section(
    year: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Access rules for Year Sections:
    - Verified students can enter any year section to view questions.
    - Default rule: every verified user can read and answer public queries from lower years.
    - Juniors ask doubts in their own locked year section.
    """
    if year not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Invalid year section. Valid sections: 1 to 4.")

    queries = db.query(Query).filter(
        Query.target_year == year,
        Query.is_premium == False
    ).order_by(Query.created_at.desc()).all()

    can_answer = False
    if current_user.role in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]:
        can_answer = True
    elif current_user.locked_year and current_user.locked_year > year:
        can_answer = True

    can_post = (current_user.locked_year == year) or (current_user.role in [UserRole.ADMIN])

    return {
        "section_year": year,
        "can_post_query": can_post,
        "can_answer_as_senior": can_answer,
        "user_role": current_user.role,
        "user_locked_year": current_user.locked_year,
        "queries_count": len(queries)
    }

@router.get("/premium-section")
async def access_premium_section(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Strict Access Control:
    Premium Section is EXCLUSIVELY for Postgrad students (PG), Faculty, and Admin.
    Undergraduate students (Year 1 to 4) receive 403 Forbidden.
    """
    if current_user.role not in [UserRole.PG, UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. The Premium Section is reserved exclusively for Postgrad students and Faculty."
        )

    queries = db.query(Query).filter(
        Query.is_premium == True
    ).order_by(Query.created_at.desc()).all()

    return {
        "message": "Welcome to the CampusConnect Premium Section for PG & Faculty discussions.",
        "authorized_role": current_user.role,
        "discussions_count": len(queries)
    }
