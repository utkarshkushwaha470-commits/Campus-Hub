import os

admin_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\backend\app\routers\admin.py"
with open(admin_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update imports
if "AppointFacultyRequest" not in code:
    code = code.replace(
        "CreateAdminRequest, DirectChiefChatMessage",
        "CreateAdminRequest, AppointFacultyRequest, DirectChiefChatMessage"
    )

# 2. Add appoint-faculty and faculty-list endpoints before /chief-message
faculty_endpoints = '''
@router.get("/faculty-list")
async def list_all_faculty(
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Returns list of all faculty members in the institution."""
    faculties = db.query(User).filter(User.role == UserRole.FACULTY).order_by(User.full_name.asc()).all()
    return [
        {
            "id": f.id,
            "full_name": f.full_name,
            "email": f.email,
            "batch": f.batch,
            "status": f.status,
            "crn_or_roll_number": f.crn_or_roll_number,
            "created_at": f.created_at
        }
        for f in faculties
    ]

@router.post("/appoint-faculty")
async def appoint_faculty_member(
    req: AppointFacultyRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Chief Administrator Exclusive: Appoint a Faculty Member / Professor directly.
    Only Utkarsh Kushwaha has executive authority.
    """
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA has authority to appoint faculty members."
        )

    clean_email = req.email.lower().strip()
    clean_name = req.full_name.strip()
    dept = req.department.strip() if req.department and req.department.strip() else "Computer Science & Engineering"

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        if existing.role == UserRole.FACULTY and existing.status == AccountStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active Faculty member with email '{clean_email}' already exists."
            )
        # Upgrade account to Faculty
        existing.role = UserRole.FACULTY
        existing.status = AccountStatus.APPROVED
        existing.full_name = clean_name
        if req.password:
            existing.password_hash = get_password_hash(req.password)
        existing.batch = f"FACULTY - {dept}"
        existing.locked_year = None
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        new_fac = User(
            id=str(uuid.uuid4()),
            email=clean_email,
            full_name=clean_name,
            password_hash=get_password_hash(req.password),
            role=UserRole.FACULTY,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch=f"FACULTY - {dept}",
            crn_or_roll_number=f"FAC-{uuid.uuid4().hex[:6].upper()}",
            is_2fa_enabled=False,
            is_chief_admin=False
        )
        db.add(new_fac)
        db.commit()
        db.refresh(new_fac)
        target = new_fac

    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        audit_service.log_action(
            db=db,
            admin_id=current_admin.id,
            action_type=AuditActionType.CREATE_MODULE,
            target_entity="FACULTY_MEMBER",
            target_id=target.id,
            ip_address=client_ip,
            details={
                "chief_admin": current_admin.full_name,
                "faculty_name": target.full_name,
                "faculty_email": target.email,
                "department": dept
            }
        )
    except Exception:
        pass

    return {
        "message": f"Successfully appointed Faculty member: {target.full_name} ({target.email}) - {dept}.",
        "faculty": {
            "id": target.id,
            "full_name": target.full_name,
            "email": target.email,
            "role": target.role,
            "batch": target.batch
        }
    }
'''

if "/appoint-faculty" not in code:
    code = code.replace('@router.post("/chief-message")', faculty_endpoints + '\n@router.post("/chief-message")')

with open(admin_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Appoint faculty endpoints successfully added!")
