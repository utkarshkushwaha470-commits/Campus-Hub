import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.database import Base

class ProblemRecipientRole:
    DEAN = "DEAN"
    HOD = "HOD"
    DIRECTOR = "DIRECTOR"

class ProblemStatus:
    SUBMITTED = "SUBMITTED"
    FORWARDED_ANONYMOUSLY = "FORWARDED_ANONYMOUSLY"
    REPLIED = "REPLIED"
    RESOLVED = "RESOLVED"

class ProblemBoxMessage(Base):
    __tablename__ = "problem_box_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Sender identity is stored here ONLY and is strictly forbidden from exposure to non-admins or Gemma 4
    student_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    recipient_role = Column(String(50), nullable=False)  # DEAN, HOD, DIRECTOR
    subject = Column(String(300), nullable=False)
    content_text = Column(Text, nullable=False)
    
    status = Column(String(50), default=ProblemStatus.SUBMITTED, nullable=False)
    
    # Gemma 4 PII-free safety screening
    ai_safety_flag = Column(Boolean, default=False)
    ai_safety_category = Column(String(100), nullable=True)  # e.g., "URGENT", "HARASSMENT", "WELLNESS", "STANDARD"
    
    # Admin resolution
    forwarded_to_name = Column(String(200), nullable=True)
    admin_response_text = Column(Text, nullable=True)
    forwarded_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
