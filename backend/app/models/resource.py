import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class ResourceTypeEnum(str, enum.Enum):
    NOTES = "NOTES"
    PYQ = "PYQ"
    STUDY_MATERIAL = "STUDY_MATERIAL"
    PROJECT = "PROJECT"
    OTHER = "OTHER"

class ModerationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(Enum(ResourceTypeEnum), default=ResourceTypeEnum.NOTES)
    file_url = Column(String(500), nullable=False)
    subject = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ModerationStatus), default=ModerationStatus.PENDING)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    module = relationship("Module", back_populates="resources")
    uploader = relationship("User", foreign_keys=[uploaded_by_id])
