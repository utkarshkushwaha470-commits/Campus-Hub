import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, AccountStatus, UserRole
from app.models.id_verification import IDVerification, IDVerificationStatus
from app.schemas.auth import (
    OTPRequest, OTPVerifyRequest, LoginRequest, ForgotPasswordLoginRequest,
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
from app.services.audit_service import audit_service
from app.models.admin_audit_log import AuditActionType

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

    # Detailed diagnosis if in Admin Mode
    if req.is_admin_mode:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No administrator account found with email '{req.email.strip()}'. Please register for Administrator Clearance below to send your request to Chief Admin Utkarsh Kushwaha."
            )
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This email belongs to a student account. Please use the Student Login tab or apply for administrator clearance."
            )
        if user.status == AccountStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your Administrator clearance request has been sent to Chief Administrator UTKARSH KUSHWAHA and is currently PENDING review. You will receive access once approved."
            )
        if user.status in [AccountStatus.BANNED, AccountStatus.TERMINATED]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your administrator credentials have been revoked by institutional administration."
            )
        if user.status == AccountStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your Administrator clearance request was not approved by Chief Administrator."
            )
        if not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password for this administrator account."
            )
        expected_proof = (user.admin_proof or "ujjawal utkarsh 222005").strip()
        if not req.admin_proof or req.admin_proof.strip() != expected_proof:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Administrator Security Proof verification passphrase."
            )
        otp_to_verify = req.two_factor_code or getattr(req, "otp", None)
        if otp_to_verify:
            if not verify_otp(user.email, otp_to_verify.strip()):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Email Verification OTP."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email Verification OTP is required. Please click 'Send OTP' to verify your email."
            )
    else:
        # Student Login Flow
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

    if user.email.lower() == "utkarshkushwaha470@gmail.com":
        user.is_chief_admin = True

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/forgot-password-login", response_model=TokenResponse)
async def forgot_password_login(req: ForgotPasswordLoginRequest, db: Session = Depends(get_db)):
    """
    Direct login and optional password reset via Email OTP.
    If valid OTP is provided, the user is authenticated and allowed to enter their account.
    If a new password is provided, their account password is updated.
    """
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registered account found with email '{req.email}'."
        )

    if user.status in [AccountStatus.BANNED, AccountStatus.TERMINATED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated or terminated by college administration."
        )

    if user.role == UserRole.ADMIN and user.status == AccountStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your Administrator clearance request has been sent to Chief Administrator UTKARSH KUSHWAHA and is currently PENDING review. You will receive access once approved."
        )

    if user.role == UserRole.ADMIN and user.status == AccountStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your Administrator clearance request was not approved by Chief Administrator."
        )

    # Verify OTP
    if not verify_otp(clean_email, req.otp.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification OTP. Please request a new code."
        )

    # If new password supplied, update it
    if req.new_password and len(req.new_password.strip()) >= 4:
        user.password_hash = get_password_hash(req.new_password.strip())

    if user.email.lower() == "utkarshkushwaha470@gmail.com":
        user.is_chief_admin = True

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "message": f"Welcome back, {user.full_name}! OTP verified successfully. You are now logged in.",
        "status": user.status,
        "user": user
    }

@router.post("/admin-signup", response_model=TokenResponse)
async def admin_signup(
    req: AdminSignUpRequest,
    db: Session = Depends(get_db)
):
    """
    Admin registration gateway where new admins configure their own security proof
    and submit clearance request to Chief Administrator Utkarsh Kushwaha.
    """
    # 1. OTP Verification
    if req.otp:
        if not verify_otp(req.email.strip().lower(), req.otp.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired Email Verification OTP."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email Verification OTP is required for Administrator registration. Click 'Send OTP' to verify."
        )

    # 2. Check Security Proof Passphrase
    if not req.admin_proof or len(req.admin_proof.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Proof Passphrase is required (minimum 3 characters)."
        )

    is_chief = req.email.strip().lower() == "utkarshkushwaha470@gmail.com"
    new_status = AccountStatus.APPROVED if is_chief else AccountStatus.PENDING

    # 3. Check existing user
    existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if existing:
        existing.role = UserRole.ADMIN
        existing.status = new_status
        existing.full_name = req.full_name.strip()
        existing.password_hash = get_password_hash(req.password)
        existing.admin_proof = req.admin_proof.strip()
        if is_chief:
            existing.is_chief_admin = True
        db.commit()
        db.refresh(existing)
        target_user = existing
    else:
        new_admin = User(
            id=str(uuid.uuid4()),
            email=req.email.strip().lower(),
            full_name=req.full_name.strip(),
            password_hash=get_password_hash(req.password),
            role=UserRole.ADMIN,
            status=new_status,
            locked_year=None,
            batch="ADMIN-HEAD" if is_chief else "STAFF-ADMIN",
            crn_or_roll_number="2720A" if is_chief else f"ADM-{uuid.uuid4().hex[:6].upper()}",
            is_2fa_enabled=False,
            admin_proof=req.admin_proof.strip(),
            is_chief_admin=is_chief
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        target_user = new_admin

    if is_chief:
        token = create_access_token({"sub": target_user.id, "role": target_user.role})
        return {
            "access_token": token,
            "token_type": "bearer",
            "message": "Chief Administrator UTKARSH KUSHWAHA logged in successfully.",
            "status": "APPROVED",
            "user": target_user
        }
    else:
        # Clearance request dispatched to Chief Admin
        audit_service.log_action(
            db=db,
            admin_id=target_user.id,
            action_type=AuditActionType.CREATE_GROUP, # Log clearance submission
            target_entity="ADMIN_CLEARANCE_APPLICATION",
            target_id=target_user.id,
            details={
                "applicant_name": target_user.full_name,
                "applicant_email": target_user.email,
                "status": "PENDING_CHIEF_APPROVAL"
            }
        )
        return {
            "access_token": "",
            "token_type": "bearer",
            "message": f"Administrator clearance request for {target_user.full_name} ({target_user.email}) has been submitted and sent to Chief Administrator UTKARSH KUSHWAHA for review and activation.",
            "status": "PENDING",
            "user": target_user
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
