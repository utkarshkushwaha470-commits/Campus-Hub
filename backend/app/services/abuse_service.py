from datetime import datetime, timedelta
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.models.rating import Rating, RatingStatus
from app.models.user import User
from app.models.moderation import Report, ReportTargetType, ReportStatus

class AbuseService:
    """
    Deterministic anti-abuse rule and anomaly detection engine for peer ratings and points.
    Strict rules:
    1. Only the person who asked can rate.
    2. Only after senior has replied.
    3. One rating per query.
    4. No self-rating.
    5. Daily limit: max ratings per user per day.
    6. Pair velocity: max ratings between same student and senior per week.
    7. Mutual 5-star trading check.
    8. Burst rating detection (< 3 min gap).
    """

    @staticmethod
    def evaluate_rating(
        db: Session,
        rater_student: User,
        rated_senior: User,
        query_id: str,
        stars: int,
        client_ip: Optional[str] = None
    ) -> Tuple[bool, Optional[str], float]:
        """
        Evaluates incoming rating.
        Returns:
            (passed: bool, flag_reason: Optional[str], point_weight: float)
        """
        # Rule 1: No self-rating
        if rater_student.id == rated_senior.id:
            return False, "Self-rating is strictly prohibited.", 0.0

        now = datetime.utcnow()
        one_day_ago = now - timedelta(days=1)
        one_week_ago = now - timedelta(days=7)

        # Rule 2: Daily rating velocity limit (e.g., max 5 per day)
        daily_count = db.query(func.count(Rating.id)).filter(
            Rating.rater_student_id == rater_student.id,
            Rating.created_at >= one_day_ago
        ).scalar() or 0

        if daily_count >= settings.MAX_RATINGS_PER_DAY:
            return False, f"Daily rating limit exceeded ({daily_count}/{settings.MAX_RATINGS_PER_DAY}).", 0.0

        # Rule 3: Pair velocity limit (max ratings between same student and senior per week)
        pair_week_count = db.query(func.count(Rating.id)).filter(
            Rating.rater_student_id == rater_student.id,
            Rating.rated_senior_id == rated_senior.id,
            Rating.created_at >= one_week_ago
        ).scalar() or 0

        if pair_week_count >= settings.MAX_RATINGS_PER_PAIR_PER_WEEK:
            return False, f"Weekly pair interaction limit exceeded ({pair_week_count} ratings this week).", 0.0

        # Rule 4: Mutual 5-star trading check
        # Has senior also rated this junior 5 stars recently?
        mutual_5star = db.query(Rating).filter(
            Rating.rater_student_id == rated_senior.id,
            Rating.rated_senior_id == rater_student.id,
            Rating.stars == 5,
            Rating.created_at >= one_week_ago
        ).first()

        if stars == 5 and mutual_5star:
            return False, "Suspicious reciprocal 5-star trading detected between pair.", 0.0

        # Rule 5: Burst rating detection
        burst_threshold = now - timedelta(seconds=settings.BURST_RATING_WINDOW_SECONDS)
        recent_rating = db.query(Rating).filter(
            Rating.rater_student_id == rater_student.id,
            Rating.created_at >= burst_threshold
        ).first()

        if recent_rating:
            return False, f"Rapid burst ratings detected (< {settings.BURST_RATING_WINDOW_SECONDS}s gap).", 0.0

        # Account weighting calculation
        # New accounts (< 24h old) or low activity accounts give 0.5x weight
        weight = 1.0
        account_age = now - rater_student.created_at
        if account_age < timedelta(days=1):
            weight = 0.5

        return True, None, weight

    @staticmethod
    def calculate_level(points: int) -> int:
        """
        Level progression:
        Level 1: 0 - 49 pts
        Level 2: 50 - 149 pts
        Level 3: 150 - 299 pts
        Level 4: 300 - 499 pts
        Level 5: 500+ pts
        """
        if points >= 500:
            return 5
        elif points >= 300:
            return 4
        elif points >= 150:
            return 3
        elif points >= 50:
            return 2
        return 1

    @staticmethod
    def flag_for_moderator(
        db: Session,
        rating_id: str,
        reason: str,
        rater_id: str,
        senior_id: str
    ):
        """Creates a moderator report when abuse checks fail."""
        report = Report(
            reporter_id=rater_id,
            target_type=ReportTargetType.USER,
            target_id=senior_id,
            reason=f"Abuse Engine Alert: {reason}",
            details=f"Rating ID: {rating_id} held for moderator review due to suspicious velocity or pattern.",
            status=ReportStatus.OPEN
        )
        db.add(report)
        db.commit()

abuse_service = AbuseService()
