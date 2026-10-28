from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RatingCreate(BaseModel):
    query_id: str
    stars: int
    comment: Optional[str] = None

class RatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query_id: str
    rater_student_id: str
    rated_senior_id: str
    stars: int
    comment: Optional[str] = None
    status: str
    abuse_flag_reason: Optional[str] = None
    created_at: datetime

class LeaderboardEntry(BaseModel):
    user_id: str
    full_name: str
    role: str
    locked_year: Optional[int] = None
    points: int
    level: int
    rank: int
