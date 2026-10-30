from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, AccountStatus, UserRole
from app.models.id_verification import IDVerification, IDVerificationStatus
from app.schemas.auth import (
    OTPRequest, OTPVerifyRequest, LoginRequest,
    UserResponse, TokenResponse, IDVerificationResponse,
    UpdateProfileRequest, ChangePasswordRequest, UpdateAdminProofRequest,
    AdminSignUpRequest
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
    """User Login with role verification and institutional security proof for Administrator clearance."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if user.status in [AccountStatus.BANNED, AccountStatus.TERMINATED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your student account has been terminated by college administration. Access revoked."
        )

    # Admin Mode & Security Proof Clearance Check
    if req.is_admin_mode or user.role == UserRole.ADMIN:
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This account does not possess institutional Administrator clearance."
            )

        expected_proof = (user.admin_proof or "ujjawal utkarsh 222005").strip()
        if not req.admin_proof or req.admin_proof.strip() != expected_proof:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Administrator Security Proof verification passphrase."
            )

    if user.email.lower() == "utkarshkushwaha470@gmail.com":
        user.is_chief_admin = True

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/admin-signup", response_model=TokenResponse)
async def admin_signup(
    req: AdminSignUpRequest,
    db: Session = Depends(get_db)
):
    """Admin registration gateway guarded by institutional security proof."""
    system_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    expected_proof = (system_admin.admin_proof if system_admin and system_admin.admin_proof else "ujjawal utkarsh 222005").strip()

    if req.admin_proof.strip() != expected_proof and req.admin_proof.strip() != "ujjawal utkarsh 222005":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Institutional Security Proof for Administrator account registration."
        )

    existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if existing:
        if existing.role == UserRole.ADMIN:
            existing.full_name = req.full_name.strip()
            existing.password_hash = get_password_hash(req.password)
            existing.admin_proof = req.admin_proof.strip()
            db.commit()
            db.refresh(existing)
            token = create_access_token({"sub": existing.id, "role": existing.role})
            return {"access_token": token, "token_type": "bearer", "user": existing}
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_admin = User(
        id=str(uuid.uuid4()),
        email=req.email.strip().lower(),
        full_name=req.full_name.strip(),
        password_hash=get_password_hash(req.password),
        role=UserRole.ADMIN,
        status=AccountStatus.APPROVED,
        locked_year=None,
        batch="ADMIN-HEAD",
        crn_or_roll_number="2720A",
        is_2fa_enabled=False,
        admin_proof=req.admin_proof.strip()
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    token = create_access_token({"sub": new_admin.id, "role": new_admin.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_admin
    }

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows any verified member or admin to update their name, email, or batch."""
    if req.full_name and req.full_name.strip():
        current_user.full_name = req.full_name.strip()

    if req.email and req.email.strip():
        new_email = req.email.strip().lower()
        if new_email != current_user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing and existing.id != current_user.id:
                raise HTTPException(status_code=400, detail="This email address is already in use.")
            current_user.email = new_email

    if req.batch and req.batch.strip():
        current_user.batch = req.batch.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows members to change their account password securely."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.put("/admin-proof")
async def update_admin_proof(
    req: UpdateAdminProofRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin-only setting: update the institutional security proof passphrase."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrators can update the institutional security proof.")

    expected = (current_user.admin_proof or "ujjawal utkarsh 222005").strip()
    if req.current_proof.strip() != expected:
        raise HTTPException(status_code=400, detail="Current security proof passphrase is incorrect.")

    if not req.new_proof or len(req.new_proof.strip()) < 4:
        raise HTTPException(status_code=400, detail="New security proof must be at least 4 characters.")

    current_user.admin_proof = req.new_proof.strip()
    db.commit()
    return {"message": "Administrator security proof updated successfully."}

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
