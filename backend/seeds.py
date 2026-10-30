import uuid
import sys
import os

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole, AccountStatus
from app.services.auth_service import get_password_hash

def run_seed():
    """
    Brogrammers Official Demo & Production Seed Policy:
    Contains ONLY:
    1. Chief Administrator (Utkarsh Kushwaha)
    2. 1 Faculty Demo Account (Dr. Vikram Sharma)
    3. 4 Student Demo Accounts (Year 1, Year 2, Year 3, Year 4)
    Zero other fake or mock accounts are generated.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("--- Brogrammers Presentation & Company Demo Setup ---")

    # 1. Chief Administrator: Utkarsh Kushwaha
    chief = db.query(User).filter(User.email == "utkarshkushwaha470@gmail.com").first()
    if not chief:
        chief = User(
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
        db.add(chief)
    else:
        chief.is_chief_admin = True
        chief.status = AccountStatus.APPROVED
        chief.role = UserRole.ADMIN
        chief.admin_proof = "ujjawal utkarsh 222005"
        chief.password_hash = get_password_hash("utkarsh2720A")

    # 2. One Faculty Demo Account
    faculty = db.query(User).filter(User.email == "faculty.demo@apex.edu").first()
    if not faculty:
        faculty = User(
            id=str(uuid.uuid4()),
            email="faculty.demo@apex.edu",
            full_name="Dr. Vikram Sharma (Faculty / HOD)",
            password_hash=get_password_hash("Faculty@123"),
            role=UserRole.FACULTY,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="FACULTY",
            crn_or_roll_number="FAC-CS-01",
            points=350,
            level=4,
            is_2fa_enabled=False
        )
        db.add(faculty)
    else:
        faculty.status = AccountStatus.APPROVED
        faculty.role = UserRole.FACULTY
        faculty.password_hash = get_password_hash("Faculty@123")

    # 3. All Year Students Demo Accounts (Years 1 to 4)
    students = [
        {
            "email": "student.4th@apex.edu",
            "full_name": "Priya Nair (4th Year Senior)",
            "password": "Student@123",
            "locked_year": 4,
            "batch": "2023-2027",
            "crn": "23BCS042",
            "points": 280,
            "level": 3
        },
        {
            "email": "student.3rd@apex.edu",
            "full_name": "Rohit Verma (3rd Year Senior)",
            "password": "Student@123",
            "locked_year": 3,
            "batch": "2024-2028",
            "crn": "24BCS089",
            "points": 190,
            "level": 2
        },
        {
            "email": "student.2nd@apex.edu",
            "full_name": "Aarav Mehta (2nd Year Sophomore)",
            "password": "Student@123",
            "locked_year": 2,
            "batch": "2025-2029",
            "crn": "25BCS114",
            "points": 110,
            "level": 2
        },
        {
            "email": "student.1st@apex.edu",
            "full_name": "Ananya Sen (1st Year Junior)",
            "password": "Student@123",
            "locked_year": 1,
            "batch": "2026-2030",
            "crn": "26BCS019",
            "points": 40,
            "level": 1
        }
    ]

    for s in students:
        st = db.query(User).filter(User.email == s["email"]).first()
        if not st:
            st = User(
                id=str(uuid.uuid4()),
                email=s["email"],
                full_name=s["full_name"],
                password_hash=get_password_hash(s["password"]),
                role=UserRole.STUDENT,
                status=AccountStatus.APPROVED,
                locked_year=s["locked_year"],
                batch=s["batch"],
                crn_or_roll_number=s["crn"],
                points=s["points"],
                level=s["level"],
                is_2fa_enabled=False
            )
            db.add(st)
        else:
            st.status = AccountStatus.APPROVED
            st.role = UserRole.STUDENT
            st.locked_year = s["locked_year"]
            st.password_hash = get_password_hash(s["password"])

    db.commit()
    db.close()
    print("Demo setup completed: Chief Admin + Faculty + 4 Year Students verified.")

if __name__ == "__main__":
    run_seed()
