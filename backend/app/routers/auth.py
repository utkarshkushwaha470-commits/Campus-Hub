from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, AccountStatus, UserRole
from app.models.id_verification import IDVerification, IDVerificationStatus
from app.schemas.auth import (
    OTPRequest, OTPVerifyRequest, LoginRequest,
    UserResponse, TokenResponse, IDVerificationResponse
)
from app.services.auth_service import (
    get_password_hash, verify_password, generate_otp, verify_otp,
    create_access_token, get_current_user
)
from app.services.storage_service import storage_service
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/auth", tags=["Authentication & Sign Up"])

@router.post("/send-otp")
async def send_email_otp(req: OTPRequest):
    """Generates and sends an OTP to student college email."""
    otp = generate_otp(req.email)
    # In production, send via SES/SMTP. Returned for development ease.
    return {
        "message": f"Verification OTP dispatched to {req.email}",
        "dev_otp": otp
    }

@router.post("/signup", response_model=TokenResponse)
async def signup_student(
    email: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(...),
    batch: str = Form(...),
    requested_year: int = Form(...),
    crn_or_roll_number: str = Form(...),
    role: str = Form("STUDENT"),
    otp: str = Form(...),
    id_card: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Sign Up Flow:
    1. Verify OTP
    2. Check uniqueness of email and CRN / Roll Number (One ID/CRN = one account)
    3. Store encrypted ID card photo
    4. Call Gemma 4 Multimodal pre-check for advisory match hint
    5. Create user in PENDING status
    """
    # 1. OTP Verification
    if not verify_otp(email, otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email OTP."
        )

    # 2. Duplicate checks (One ID/CRN = One Account)
    if db.query(User).filter(User.email == email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account is already registered with this email address."
        )

    if db.query(User).filter(User.crn_or_roll_number == crn_or_roll_number.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account is already linked with this CRN / Roll Number. One ID = One Account."
        )

    # 3. Store ID Card securely in private vault
    photo_bytes = await id_card.read()
    if len(photo_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID card photo must be under 10MB.")

    storage_path = await storage_service.save_id_card(photo_bytes, id_card.filename)

    # 4. Gemma 4 OCR & Pre-check (Advisory Hint)
    gemma_hint = await ai_service.pre_check_id_card(
        image_bytes=photo_bytes,
        claimed_name=full_name,
        claimed_batch=batch,
        claimed_year=requested_year
    )

    # 5. Create PENDING user
    new_user = User(
        email=email.lower(),
        full_name=full_name.strip(),
        password_hash=get_password_hash(password),
        role=role.upper(),
        status=AccountStatus.PENDING,
        locked_year=None,  # Year is locked only after admin approval!
        batch=batch.strip(),
        crn_or_roll_number=crn_or_roll_number.strip(),
        points=0,
        level=1,
        badges="[]"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create verification record
    verification = IDVerification(
        user_id=new_user.id,
        id_photo_storage_path=storage_path,
        ocr_extracted_name=gemma_hint["ocr_extracted_name"],
        ocr_extracted_batch=gemma_hint["ocr_extracted_batch"],
        ocr_extracted_year=gemma_hint["ocr_extracted_year"],
        ocr_match_confidence=gemma_hint["ocr_match_confidence"],
        ocr_hint_status=gemma_hint["ocr_hint_status"],
        status=IDVerificationStatus.PENDING
    )
    db.add(verification)
    db.commit()

    token = create_access_token({"sub": new_user.id, "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    """User Login with status checks and 2FA support for Admin."""
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Admin 2FA check
    if user.role == UserRole.ADMIN and user.is_2fa_enabled:
        if not req.two_factor_code or req.two_factor_code != "888888":  # Default 2FA bypass for admin demo
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA authentication code for Administrator account."
            )

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/resubmit-id")
async def resubmit_id_card(
    id_card: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows REJECTED users to upload a new ID photo for admin re-verification."""
    if current_user.status != AccountStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only rejected accounts may resubmit an ID card photo."
        )

    photo_bytes = await id_card.read()
    storage_path = await storage_service.save_id_card(photo_bytes, id_card.filename)

    # Re-run Gemma 4 pre-check
    gemma_hint = await ai_service.pre_check_id_card(
        image_bytes=photo_bytes,
        claimed_name=current_user.full_name,
        claimed_batch=current_user.batch,
        claimed_year=current_user.locked_year or 1
    )

    # Update or add verification record
    latest_verif = db.query(IDVerification).filter(
        IDVerification.user_id == current_user.id
    ).order_by(IDVerification.created_at.desc()).first()

    if latest_verif:
        latest_verif.id_photo_storage_path = storage_path
        latest_verif.ocr_extracted_name = gemma_hint["ocr_extracted_name"]
        latest_verif.ocr_extracted_batch = gemma_hint["ocr_extracted_batch"]
        latest_verif.ocr_extracted_year = gemma_hint["ocr_extracted_year"]
        latest_verif.ocr_match_confidence = gemma_hint["ocr_match_confidence"]
        latest_verif.ocr_hint_status = gemma_hint["ocr_hint_status"]
        latest_verif.status = IDVerificationStatus.PENDING
        latest_verif.rejection_reason = None
    else:
        new_verif = IDVerification(
            user_id=current_user.id,
            id_photo_storage_path=storage_path,
            ocr_extracted_name=gemma_hint["ocr_extracted_name"],
            ocr_extracted_batch=gemma_hint["ocr_extracted_batch"],
            ocr_extracted_year=gemma_hint["ocr_extracted_year"],
            ocr_match_confidence=gemma_hint["ocr_match_confidence"],
            ocr_hint_status=gemma_hint["ocr_hint_status"],
            status=IDVerificationStatus.PENDING
        )
        db.add(new_verif)

    current_user.status = AccountStatus.PENDING
    db.commit()

    return {"message": "ID card resubmitted successfully. Waiting for admin verification."}

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
