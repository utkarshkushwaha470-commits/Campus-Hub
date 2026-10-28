from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class QueryCreate(BaseModel):
    title: str
    content_text: str
    subject: str
    tags: List[str] = []
    target_year: Optional[int] = None
    is_premium: bool = False
    visibility: str = "PUBLIC"  # PUBLIC or ONE_TO_ONE
    assigned_senior_id: Optional[str] = None

class QueryAnswerCreate(BaseModel):
    content_text: str

class QueryAnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query_id: str
    author_id: str
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    author_year: Optional[int] = None
    content_text: str
    attachment_storage_path: Optional[str] = None
    is_accepted: bool = False
    created_at: datetime

class QueryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    poster_id: str
    poster_name: Optional[str] = None
    poster_year: Optional[int] = None
    target_year: Optional[int] = None
    is_premium: bool = False
    visibility: str = "PUBLIC"
    assigned_senior_id: Optional[str] = None
    title: str
    content_text: str
    photo_storage_path: Optional[str] = None
    subject: str
    tags: str = "[]"
    ai_hint: Optional[str] = None
    is_resolved: bool = False
    answers: List[QueryAnswerResponse] = []
    created_at: datetime

class OCRPreCheckResponse(BaseModel):
    suggested_subject: str
    suggested_tags: List[str]
    is_inappropriate: bool
    flag_reason: Optional[str] = None
    ocr_text: str
