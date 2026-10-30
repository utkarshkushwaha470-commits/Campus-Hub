import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.database import Base

class ThreadType:
    DIRECT_MESSAGE = "DIRECT_MESSAGE"
    ONE_TO_ONE = "ONE_TO_ONE"
    QUERY_THREAD = "QUERY_THREAD"
    BATCH_LOUNGE = "BATCH_LOUNGE"

class Thread(Base):
    __tablename__ = "threads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_type = Column(String(50), default=ThreadType.DIRECT_MESSAGE, nullable=False)
    query_id = Column(String(36), nullable=True)
    student_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    senior_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    topic = Column(String(200), nullable=True)
    last_message_text = Column(String(500), nullable=True)
    last_message_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
    reactions = Column(String(500), default="{}", nullable=False)  # JSON e.g. {"❤️": ["user1"], "🔥": ["user2"]}
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ChiefFacultyMessage(Base):
    __tablename__ = "chief_faculty_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    faculty_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_role = Column(String(20), nullable=False)  # "FACULTY" or "CHIEF_ADMIN"
    sender_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
