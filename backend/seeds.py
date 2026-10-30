import uuid
from datetime import datetime
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole, AccountStatus
from app.services.auth_service import get_password_hash

def run_seed():
    """
    Production Seeding Policy:
    NO fake admins or fake students are generated.
    Only guarantees that Chief Administrator Utkarsh Kushwaha's root clearance is verified.
    All other accounts must be explicitly registered by real users.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("--- Brogrammers Database Policy: No Fake Accounts ---")

    # Chief Administrator: Utkarsh Kushwaha (Permanent Highest Authority)
    utkarsh_admin = db.query(User).filter(User.email == "utkarshkushwaha470@gmail.com").first()
    if not utkarsh_admin:
        utkarsh_admin = User(
            id=str(uuid.uuid4()),
            email="utkarshkushwaha470@gmail.com",
            full_name="UTKARSH KUSHWAHA",
            password_hash=get_password_hash("utkarsh2720A"),
            role=UserRole.ADMIN,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="CHIEF-ADMIN",
            crn_or_roll_number="2720A",
            is_2fa_enabled=False,
            two_factor_secret="888888",
            admin_proof="ujjawal utkarsh 222005",
            is_chief_admin=True
        )
        db.add(utkarsh_admin)
        print("Ensured Chief Admin: UTKARSH KUSHWAHA (utkarshkushwaha470@gmail.com)")
    else:
        utkarsh_admin.full_name = "UTKARSH KUSHWAHA"
        utkarsh_admin.password_hash = get_password_hash("utkarsh2720A")
        utkarsh_admin.role = UserRole.ADMIN
        utkarsh_admin.status = AccountStatus.APPROVED
        utkarsh_admin.crn_or_roll_number = "2720A"
        utkarsh_admin.batch = "CHIEF-ADMIN"
        utkarsh_admin.is_2fa_enabled = False
        utkarsh_admin.admin_proof = "ujjawal utkarsh 222005"
        utkarsh_admin.is_chief_admin = True
        print("Verified Chief Admin: UTKARSH KUSHWAHA (utkarshkushwaha470@gmail.com)")

    db.commit()
    db.close()

if __name__ == "__main__":
    run_seed()
