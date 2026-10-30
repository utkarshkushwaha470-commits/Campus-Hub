import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
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
    TERMINATE_STUDENT = "TERMINATE_STUDENT"
    REINSTATE_STUDENT = "REINSTATE_STUDENT"
    CREATE_GROUP = "CREATE_GROUP"
    DELETE_GROUP = "DELETE_GROUP"
    CREATE_MODULE = "CREATE_MODULE"
    CREATE_ADMIN = "CREATE_ADMIN"
    DELETE_ADMIN = "DELETE_ADMIN"
    APPROVE_ADMIN = "APPROVE_ADMIN"
    REJECT_ADMIN = "REJECT_ADMIN"
    PROBLEM_FORWARD = "FORWARD_PROBLEM_BOX"

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


class FacultyDispatch(Base):
    __tablename__ = "faculty_dispatches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_name = Column(String(100), nullable=False)
    sender_email = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=False)
    sender_department = Column(String(100), nullable=True)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    chief_reply = Column(Text, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
