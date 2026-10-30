import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from app.database import Base

class UserRole:
    STUDENT = "STUDENT"
    PG = "PG"
    FACULTY = "FACULTY"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"

class AccountStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    BANNED = "BANNED"
    TERMINATED = "TERMINATED"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.STUDENT, nullable=False)
    status = Column(String(50), default=AccountStatus.PENDING, nullable=False)
    
    # Year locked from ID verification (1, 2, 3, or 4 for students; None for PG/Faculty/Admin)
    locked_year = Column(Integer, nullable=True)
    batch = Column(String(50), nullable=False)  # e.g., "2024-2028"
    crn_or_roll_number = Column(String(100), unique=True, index=True, nullable=False)
    
    points = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    badges = Column(String(500), default="[]", nullable=False)  # JSON array string
    
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(100), nullable=True)
    admin_proof = Column(String(255), default="ujjawal utkarsh 222005", nullable=True)
    is_chief_admin = Column(Boolean, default=False, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
