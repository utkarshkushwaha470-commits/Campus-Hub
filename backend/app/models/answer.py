from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    doubt_id = Column(Integer, ForeignKey("doubts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_text = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    author_role_badge = Column(String(50), default="STUDENT")
    is_accepted = Column(Boolean, default=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    doubt = relationship("Doubt", back_populates="answers")
    author = relationship("User", back_populates="answers", foreign_keys=[author_id])
    ratings = relationship("Rating", back_populates="answer", cascade="all, delete-orphan")

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("answers.id", ondelete="CASCADE"), nullable=False)
    rated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stars = Column(Integer, nullable=False)  # 1 to 5
    is_suspicious = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    answer = relationship("Answer", back_populates="ratings")
    rated_by = relationship("User", back_populates="ratings_given", foreign_keys=[rated_by_id])
