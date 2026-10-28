import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from app.database import Base

class GroupCategory:
    SPECIAL_PURPOSE = "SPECIAL_PURPOSE"
    PLACEMENT = "PLACEMENT"
    CLUB = "CLUB"
    COMMITTEE = "COMMITTEE"
    ACADEMIC = "ACADEMIC"
    DISCIPLINARY = "DISCIPLINARY"

class CampusGroup(Base):
    __tablename__ = "campus_groups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    purpose = Column(Text, nullable=False)
    category = Column(String(50), default=GroupCategory.SPECIAL_PURPOSE, nullable=False)
    created_by_admin_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("campus_groups.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role_in_group = Column(String(50), default="MEMBER", nullable=False)  # "MEMBER", "LEAD", "ADMIN"
    
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class GroupMessage(Base):
    __tablename__ = "group_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("campus_groups.id"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_name = Column(String(255), nullable=False)
    sender_role = Column(String(50), nullable=False)
    content_text = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
