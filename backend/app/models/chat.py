import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.database import Base

class ThreadType:
    ONE_TO_ONE = "ONE_TO_ONE"
    QUERY_THREAD = "QUERY_THREAD"

class Thread(Base):
    __tablename__ = "threads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_type = Column(String(50), default=ThreadType.ONE_TO_ONE, nullable=False)
    query_id = Column(String(36), nullable=True)
    student_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    senior_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(36), ForeignKey("threads.id"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    content_text = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
