import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from app.database import Base

class RatingStatus:
    PASSED = "PASSED"
    HELD_FOR_REVIEW = "HELD_FOR_REVIEW"
    REJECTED = "REJECTED"

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query_id = Column(String(36), ForeignKey("queries.id"), nullable=False, index=True)
    rater_student_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    rated_senior_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    stars = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    status = Column(String(50), default=RatingStatus.PASSED, nullable=False)
    abuse_flag_reason = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class PointsLedger(Base):
    __tablename__ = "points_ledger"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    rating_id = Column(String(36), ForeignKey("ratings.id"), nullable=True)
    points_delta = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
