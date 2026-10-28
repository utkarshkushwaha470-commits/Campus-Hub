import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.database import Base

class ReportTargetType:
    POST = "POST"
    ANSWER = "ANSWER"
    CHAT = "CHAT"
    USER = "USER"

class ReportStatus:
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

class ModerationActionType:
    WARN = "WARN"
    REMOVE_CONTENT = "REMOVE_CONTENT"
    TEMP_BAN = "TEMP_BAN"
    PERM_BAN = "PERM_BAN"

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(36), nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(50), default=ReportStatus.OPEN, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ModerationAction(Base):
    __tablename__ = "moderation_actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    moderator_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)
    reason = Column(String(500), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class UserBlock(Base):
    __tablename__ = "user_blocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    blocker_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    blocked_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
