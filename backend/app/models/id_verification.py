import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from app.database import Base

class IDVerificationStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class GemmaMatchHint:
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    MANUAL_CHECK = "MANUAL_CHECK"

class IDVerification(Base):
    __tablename__ = "id_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Secure storage path
    id_photo_storage_path = Column(String(500), nullable=False)
    
    # Gemma 4 multimodal OCR extracted fields (Advisory hint only)
    ocr_extracted_name = Column(String(255), nullable=True)
    ocr_extracted_batch = Column(String(50), nullable=True)
    ocr_extracted_year = Column(Integer, nullable=True)
    ocr_match_confidence = Column(Float, default=0.0)
    ocr_hint_status = Column(String(50), default=GemmaMatchHint.MANUAL_CHECK)
    
    # Official Admin Decision
    status = Column(String(50), default=IDVerificationStatus.PENDING, nullable=False)
    rejection_reason = Column(String(500), nullable=True)
    reviewed_by_admin_id = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
