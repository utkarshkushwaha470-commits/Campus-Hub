from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProblemBoxCreate(BaseModel):
    recipient_role: str  # DEAN, HOD, DIRECTOR
    subject: str
    content_text: str

class ProblemBoxStudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    recipient_role: str
    subject: str
    content_text: str
    status: str
    admin_response_text: Optional[str] = None
    created_at: datetime
    replied_at: Optional[datetime] = None

class ProblemBoxAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    student_name: str
    student_email: str
    student_batch: str
    student_year: Optional[int] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    sender_crn: Optional[str] = None
    recipient_role: str
    subject: str
    content_text: str
    status: str
    ai_safety_flag: bool = False
    ai_safety_category: Optional[str] = None
    ai_urgency_summary: Optional[str] = None
    ai_urgency_level: Optional[str] = None
    forwarded_to_name: Optional[str] = None
    admin_response_text: Optional[str] = None
    forwarded_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    created_at: datetime

class ProblemBoxForwardRequest(BaseModel):
    target_authority_name: str

class ProblemBoxReplyRequest(BaseModel):
    reply_text: str
