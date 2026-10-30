from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OTPRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class SignUpRequest(BaseModel):
    email: str
    full_name: str
    password: str
    batch: str
    requested_year: int
    crn_or_roll_number: str
    role: Optional[str] = "STUDENT"
    otp: str

class LoginRequest(BaseModel):
    email: str
    password: str
    two_factor_code: Optional[str] = None
    is_admin_mode: Optional[bool] = False
    admin_proof: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    batch: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateAdminProofRequest(BaseModel):
    current_proof: str
    new_proof: str

class AdminSignUpRequest(BaseModel):
    email: str
    full_name: str
    password: str
    admin_proof: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    status: str
    locked_year: Optional[int] = None
    batch: str
    crn_or_roll_number: str
    points: int
    level: int
    badges: str
    is_chief_admin: Optional[bool] = False
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class IDVerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: str
    ocr_extracted_name: Optional[str] = None
    ocr_extracted_batch: Optional[str] = None
    ocr_extracted_year: Optional[int] = None
    ocr_match_confidence: float = 0.0
    ocr_hint_status: str = "MANUAL_CHECK"
    rejection_reason: Optional[str] = None
    created_at: datetime

class IDVerificationReview(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    rejection_reason: Optional[str] = None
    override_year: Optional[int] = None

class YearlyPromotionRequest(BaseModel):
    user_id: str
    new_year: int

class StudentTerminationRequest(BaseModel):
    reason: str

class StudentReinstateRequest(BaseModel):
    reason: Optional[str] = "Administrative reinstatement"

class CreateAdminRequest(BaseModel):
    full_name: str
    email: str
    password: str
    admin_proof: str

class DirectChiefChatMessage(BaseModel):
    subject: str
    message: str
