import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class VisibilityEnum(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"

class Doubt(Base):
    __tablename__ = "doubts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content_text = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    ocr_text = Column(Text, nullable=True)
    subject = Column(String(100), nullable=False)
    tags = Column(String(255), default="")
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    poster_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    visibility = Column(Enum(VisibilityEnum), default=VisibilityEnum.PUBLIC, nullable=False)
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255), nullable=True)
    ai_hint_text = Column(Text, nullable=True)
    ai_hint_generated_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    poster = relationship("User", back_populates="doubts", foreign_keys=[poster_id])
    module = relationship("Module", back_populates="doubts")
    answers = relationship("Answer", back_populates="doubt", cascade="all, delete-orphan")
    recipients = relationship("DoubtRecipient", back_populates="doubt", cascade="all, delete-orphan")

class DoubtRecipient(Base):
    __tablename__ = "doubt_recipients"

    id = Column(Integer, primary_key=True, index=True)
    doubt_id = Column(Integer, ForeignKey("doubts.id", ondelete="CASCADE"), nullable=False)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    doubt = relationship("Doubt", back_populates="recipients")
    recipient = relationship("User", foreign_keys=[recipient_user_id])
