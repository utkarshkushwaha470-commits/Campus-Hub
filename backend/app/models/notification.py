import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from app.database import Base

class NotificationTargetType:
    ALL = "ALL"
    YEAR = "YEAR"
    BATCH = "BATCH"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    target_type = Column(String(50), default=NotificationTargetType.ALL, nullable=False)
    target_year = Column(Integer, nullable=True)   # 1, 2, 3, 4
    target_batch = Column(String(50), nullable=True)
    is_broadcast = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

class UserNotificationRead(Base):
    __tablename__ = "user_notification_reads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notification_id = Column(String(36), ForeignKey("notifications.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)
