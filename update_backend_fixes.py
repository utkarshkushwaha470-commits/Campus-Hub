import os
import re

scratch_dir = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect"

# 1. Update backend/app/models/admin_audit_log.py
audit_path = os.path.join(scratch_dir, "backend", "app", "models", "admin_audit_log.py")
if os.path.exists(audit_path):
    with open(audit_path, "r", encoding="utf-8") as f:
        audit_content = f.read()

    new_audit_enum = """class AuditActionType:
    APPROVE_ID = "APPROVE_ID"
    REJECT_ID = "REJECT_ID"
    PROMOTE_YEAR = "PROMOTE_YEAR"
    VIEW_PROBLEM_BOX = "VIEW_PROBLEM_BOX"
    FORWARD_PROBLEM_BOX = "FORWARD_PROBLEM_BOX"
    REPLY_PROBLEM_BOX = "REPLY_PROBLEM_BOX"
    MODERATE_USER = "MODERATE_USER"
    PUBLISH_NOTIFICATION = "PUBLISH_NOTIFICATION"
    TERMINATE_STUDENT = "TERMINATE_STUDENT"
    REINSTATE_STUDENT = "REINSTATE_STUDENT"
    CREATE_GROUP = "CREATE_GROUP"
    DELETE_GROUP = "DELETE_GROUP"
    CREATE_MODULE = "CREATE_MODULE"
    CREATE_ADMIN = "CREATE_ADMIN"
    DELETE_ADMIN = "DELETE_ADMIN"
    APPROVE_ADMIN = "APPROVE_ADMIN"
    REJECT_ADMIN = "REJECT_ADMIN"
    PROBLEM_FORWARD = "FORWARD_PROBLEM_BOX"
"""
    audit_content = re.sub(r"class AuditActionType:.*?(?=class AdminAuditLog)", new_audit_enum + "\n", audit_content, flags=re.DOTALL)
    with open(audit_path, "w", encoding="utf-8") as f:
        f.write(audit_content)
    print("Updated admin_audit_log.py")

# 2. Update backend/app/routers/admin.py
admin_path = os.path.join(scratch_dir, "backend", "app", "routers", "admin.py")
if os.path.exists(admin_path):
    with open(admin_path, "r", encoding="utf-8") as f:
        admin_content = f.read()

    # Replace create_new_admin implementation
    create_admin_regex = r"@router\.post\(\"/create-admin\"\)\s*async def create_new_admin\(.*?return \{\s*\"message\": f\"Successfully appointed new Administrator:.*?\}\s*\}"
    
    new_create_admin = """@router.post("/create-admin")
async def create_new_admin(
    req: CreateAdminRequest,
    request: Request,
    current_admin: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    \"\"\"
    Chief Administrator Exclusive: Appoint a new institutional Administrator.
    Only Utkarsh Kushwaha possesses this executive authority.
    \"\"\"
    check_demo_protection(current_admin)
    is_chief = current_admin.email.lower().strip() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    if not is_chief:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Chief Administrator UTKARSH KUSHWAHA has the authority to appoint new administrators."
        )

    clean_email = req.email.lower().strip()
    clean_name = req.full_name.strip()
    proof_pass = req.admin_proof.strip() if req.admin_proof and req.admin_proof.strip() else "staffadmin2026"

    # Check if user already exists
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        if existing.role == UserRole.ADMIN and existing.status == AccountStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active Administrator account with email {clean_email} already exists."
            )
        # If existing is a student or pending applicant, promote them directly to Administrator!
        existing.role = UserRole.ADMIN
        existing.status = AccountStatus.APPROVED
        existing.full_name = clean_name
        if req.password:
            existing.password_hash = get_password_hash(req.password)
        existing.admin_proof = proof_pass
        existing.batch = "STAFF-ADMIN"
        existing.is_chief_admin = False
        db.commit()
        db.refresh(existing)
        new_admin = existing
    else:
        new_admin = User(
            id=str(uuid.uuid4()),
            email=clean_email,
            full_name=clean_name,
            password_hash=get_password_hash(req.password),
            role=UserRole.ADMIN,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="STAFF-ADMIN",
            crn_or_roll_number=f"ADM-{uuid.uuid4().hex[:6].upper()}",
            is_2fa_enabled=False,
            admin_proof=proof_pass,
            is_chief_admin=False
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        audit_service.log_action(
            db=db,
            admin_id=current_admin.id,
            action_type=AuditActionType.CREATE_ADMIN,
            target_entity="ADMIN_USER",
            target_id=new_admin.id,
            ip_address=client_ip,
            details={
                "chief_admin": current_admin.full_name,
                "new_admin_name": new_admin.full_name,
                "new_admin_email": new_admin.email
            }
        )
    except Exception:
        pass

    return {
        "message": f"Successfully appointed new Administrator: {new_admin.full_name} ({new_admin.email}).",
        "admin": {
            "id": new_admin.id,
            "full_name": new_admin.full_name,
            "email": new_admin.email,
            "role": new_admin.role,
            "is_chief_admin": False
        }
    }"""
    
    admin_content = re.sub(create_admin_regex, new_create_admin, admin_content, flags=re.DOTALL)
    admin_content = admin_content.replace("AuditActionType.PROBLEM_FORWARD", "AuditActionType.FORWARD_PROBLEM_BOX")
    
    with open(admin_path, "w", encoding="utf-8") as f:
        f.write(admin_content)
    print("Updated admin.py")

# 3. Update backend/app/config.py for Campus Hub & robust cloud DB URL parsing
config_path = os.path.join(scratch_dir, "backend", "app", "config.py")
if os.path.exists(config_path):
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = f.read()

    cfg = cfg.replace('PROJECT_NAME: str = "Brogrammers"', 'PROJECT_NAME: str = "Campus Hub"')
    
    # Cloud DB URL normalizer
    db_norm = """_raw_db = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")
if _raw_db.startswith("postgres://"):
    _raw_db = _raw_db.replace("postgres://", "postgresql://", 1)
"""
    if "_raw_db" not in cfg:
        cfg = cfg.replace('_default_db = os.path.join(_backend_dir, "campusconnect.db").replace("\\\\", "/")',
                          '_default_db = os.path.join(_backend_dir, "campusconnect.db").replace("\\\\", "/")\n' + db_norm)
        cfg = cfg.replace('DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")',
                          'DATABASE_URL: str = _raw_db')
    
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(cfg)
    print("Updated config.py")

print("All backend updates completed!")
