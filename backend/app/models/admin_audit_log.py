import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.database import Base

class AuditActionType:
    APPROVE_ID = "APPROVE_ID"
    REJECT_ID = "REJECT_ID"
    PROMOTE_YEAR = "PROMOTE_YEAR"
    VIEW_PROBLEM_BOX = "VIEW_PROBLEM_BOX"
    FORWARD_PROBLEM_BOX = "FORWARD_PROBLEM_BOX"
    REPLY_PROBLEM_BOX = "REPLY_PROBLEM_BOX"
    MODERATE_USER = "MODERATE_USER"
    PUBLISH_NOTIFICATION = "PUBLISH_NOTIFICATION"

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    target_entity = Column(String(100), nullable=False)
    target_id = Column(String(36), nullable=True)
    ip_address = Column(String(50), nullable=True)
    details_json = Column(Text, default="{}", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
