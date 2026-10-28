import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from app.database import Base

class QueryVisibility:
    PUBLIC = "PUBLIC"
    ONE_TO_ONE = "ONE_TO_ONE"

class Query(Base):
    __tablename__ = "queries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    poster_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_year = Column(Integer, nullable=True)  # 1, 2, 3, 4
    is_premium = Column(Boolean, default=False)
    visibility = Column(String(50), default=QueryVisibility.PUBLIC, nullable=False)
    assigned_senior_id = Column(String(36), nullable=True)  # For 1-to-1 queries
    
    title = Column(String(300), nullable=False)
    content_text = Column(Text, nullable=False)
    photo_storage_path = Column(String(500), nullable=True)
    subject = Column(String(100), nullable=False)
    tags = Column(String(300), default="[]")  # JSON array string
    ai_hint = Column(Text, nullable=True)     # Gemma 4 advisory hint
    is_resolved = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class QueryAnswer(Base):
    __tablename__ = "query_answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query_id = Column(String(36), ForeignKey("queries.id"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    content_text = Column(Text, nullable=False)
    attachment_storage_path = Column(String(500), nullable=True)
    is_accepted = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
