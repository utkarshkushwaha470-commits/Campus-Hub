from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NotificationCreate(BaseModel):
    title: str
    body: str
    target_type: str = "ALL"  # ALL, YEAR, BATCH
    target_year: Optional[int] = None
    target_batch: Optional[str] = None

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sender_id: str
    title: str
    body: str
    target_type: str
    target_year: Optional[int] = None
    target_batch: Optional[str] = None
    is_broadcast: bool = True
    is_read: bool = False
    created_at: datetime

class ReportCreate(BaseModel):
    target_type: str  # POST, ANSWER, CHAT, USER
    target_id: str
    reason: str
    details: Optional[str] = None

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reporter_id: str
    target_type: str
    target_id: str
    reason: str
    details: Optional[str] = None
    status: str
    created_at: datetime

class ModerationActionCreate(BaseModel):
    target_user_id: str
    action_type: str  # WARN, REMOVE_CONTENT, TEMP_BAN, PERM_BAN
    reason: str
    expires_at: Optional[datetime] = None

class ModerationActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    moderator_id: str
    target_user_id: str
    action_type: str
    reason: str
    expires_at: Optional[datetime] = None
    created_at: datetime
