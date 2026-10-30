import uuid
import sys
import os

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole, AccountStatus
from app.models.problem_box import ProblemBoxMessage, ProblemRecipientRole, ProblemStatus
from app.models.query import Query, QueryVisibility
from app.models.group import CampusGroup, GroupMember, GroupMessage, GroupCategory
from app.services.auth_service import get_password_hash

def run_seed():
    """
    Brogrammers Official Demo and Production Seed Policy:
    Contains:
    1. Chief Administrator (Utkarsh Kushwaha)
    2. Company Demo Sandbox personas (Demo Chief, Demo Faculty, Demo Y1-Y4 students)
    3. Initial verified sample doubts and Problem Box messages
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Auto-load all 29 accounts from all_users_dump.json
    dump_path = os.path.join(os.path.dirname(__file__), "all_users_dump.json")
    if os.path.exists(dump_path):
        import json
        try:
            with open(dump_path, "r", encoding="utf-8") as df:
                users_list = json.load(df)
            for du in users_list:
                existing = db.query(User).filter(User.email == du["email"].lower()).first()
                if not existing:
                    u = User(
                        id=du.get("id") or str(uuid.uuid4()),
                        email=du["email"].lower(),
                        full_name=du["full_name"],
                        password_hash=get_password_hash("Demo@123"),
                        role=du.get("role", "STUDENT"),
                        status=AccountStatus.APPROVED,
                        locked_year=du.get("locked_year"),
                        batch=du.get("batch") or "2024-2028",
                        crn_or_roll_number=du.get("crn_or_roll_number") or "CRN-DEMO",
                        points=du.get("points", 50),
                        level=du.get("level", 1),
                        admin_proof=du.get("admin_proof") or "ujjawal utkarsh 222005",
                        is_chief_admin=du.get("is_chief_admin", False)
                    )
                    db.add(u)
            db.commit()
        except Exception as e:
            print("Dump load notice:", e)

    print("--- Brogrammers Presentation and Company Demo Setup ---")

    # 1. Real Chief Administrator: Utkarsh Kushwaha
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
            is_chief_admin=True,
            is_demo=False
        )
        db.add(chief)
    else:
        chief.is_chief_admin = True
        chief.status = AccountStatus.APPROVED
        chief.role = UserRole.ADMIN
        chief.admin_proof = "ujjawal utkarsh 222005"
        chief.password_hash = get_password_hash("utkarsh2720A")
        chief.is_demo = False

    # 2. Demo Chief Admin for 1-Click Company Sandbox
    demo_chief = db.query(User).filter(User.email == "demo.chief@brogrammers.local").first()
    if not demo_chief:
        demo_chief = User(
            id=str(uuid.uuid4()),
            email="demo.chief@brogrammers.local",
            full_name="Demo Chief Admin (Prototype)",
            password_hash=get_password_hash("Demo@123"),
            role=UserRole.ADMIN,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="CHIEF-ADMIN",
            crn_or_roll_number="DEMO-CHIEF-01",
            is_2fa_enabled=False,
            admin_proof="demoproof2026",
            is_chief_admin=True,
            is_demo=False
        )
        db.add(demo_chief)
    else:
        demo_chief.is_chief_admin = True
        demo_chief.status = AccountStatus.APPROVED
        demo_chief.role = UserRole.ADMIN
        demo_chief.admin_proof = "demoproof2026"
        demo_chief.password_hash = get_password_hash("Demo@123")
        demo_chief.is_demo = False

    # 3. Demo Faculty (Dr. Vikram Sharma)
    faculty_emails = ["demo.faculty@brogrammers.local", "faculty.demo@apex.edu"]
    for femail in faculty_emails:
        fac = db.query(User).filter(User.email == femail).first()
        if not fac:
            fac = User(
                id=str(uuid.uuid4()),
                email=femail,
                full_name="Dr. Vikram Sharma (Faculty / HOD)",
                password_hash=get_password_hash("Demo@123"),
                role=UserRole.FACULTY,
                status=AccountStatus.APPROVED,
                locked_year=None,
                batch="FACULTY",
                crn_or_roll_number=f"FAC-CS-{femail[:4].upper()}",
                points=350,
                level=4,
                is_2fa_enabled=False,
                is_demo=False
            )
            db.add(fac)
        else:
            fac.status = AccountStatus.APPROVED
            fac.role = UserRole.FACULTY
            fac.password_hash = get_password_hash("Demo@123")
            fac.is_demo = False

    # 4. Demo Students (Years 1 to 4)
    student_personas = [
        {
            "emails": ["demo.student4@brogrammers.local", "student.4th@apex.edu"],
            "name": "Priya Nair (4th Year Senior)",
            "year": 4,
            "batch": "2023-2027",
            "crn_base": "23BCS042",
            "points": 280,
            "level": 3
        },
        {
            "emails": ["demo.student3@brogrammers.local", "student.3rd@apex.edu"],
            "name": "Rohit Verma (3rd Year Senior)",
            "year": 3,
            "batch": "2024-2028",
            "crn_base": "24BCS089",
            "points": 190,
            "level": 2
        },
        {
            "emails": ["demo.student2@brogrammers.local", "student.2nd@apex.edu"],
            "name": "Aarav Mehta (2nd Year Sophomore)",
            "year": 2,
            "batch": "2025-2029",
            "crn_base": "25BCS114",
            "points": 110,
            "level": 2
        },
        {
            "emails": ["demo.student1@brogrammers.local", "student.1st@apex.edu"],
            "name": "Ananya Sen (1st Year Junior)",
            "year": 1,
            "batch": "2026-2030",
            "crn_base": "26BCS019",
            "points": 40,
            "level": 1
        }
    ]

    for sp in student_personas:
        for semail in sp["emails"]:
            st = db.query(User).filter(User.email == semail).first()
            if not st:
                st = User(
                    id=str(uuid.uuid4()),
                    email=semail,
                    full_name=sp["name"],
                    password_hash=get_password_hash("Demo@123"),
                    role=UserRole.STUDENT,
                    status=AccountStatus.APPROVED,
                    locked_year=sp["year"],
                    batch=sp["batch"],
                    crn_or_roll_number=f"{sp['crn_base']}-{semail[:4].upper()}",
                    points=sp["points"],
                    level=sp["level"],
                    is_2fa_enabled=False,
                    is_demo=False
                )
                db.add(st)
            else:
                st.status = AccountStatus.APPROVED
                st.role = UserRole.STUDENT
                st.locked_year = sp["year"]
                st.password_hash = get_password_hash("Demo@123")
                st.is_demo = False

    db.commit()

    # 5. Seed Initial Problem Box Messages if queue is empty
    problem_count = db.query(ProblemBoxMessage).count()
    if problem_count == 0:
        first_student = db.query(User).filter(User.email == "demo.student2@brogrammers.local").first()
        student_id = first_student.id if first_student else chief.id
        sample_probs = [
            ProblemBoxMessage(
                id=str(uuid.uuid4()),
                student_id=student_id,
                recipient_role="DEAN",
                subject="Hostel B WiFi connectivity drops frequently during exam preparation",
                content_text="The 2nd floor router in Block B goes offline every evening from 8 PM to 11 PM. It severely disrupts studying for the upcoming mid-semester examinations. Kindly request the IT team to inspect the router.",
                status="SUBMITTED",
                ai_safety_flag=False,
                ai_safety_category="Infrastructure Grievance"
            ),
            ProblemBoxMessage(
                id=str(uuid.uuid4()),
                student_id=student_id,
                recipient_role="HOD",
                subject="Lab 3 Python/AI environment requires PyTorch GPU updates for practicals",
                content_text="During our Deep Learning laboratory sessions, machines in Lab 3 are missing compatible CUDA drivers for our scheduled coursework experiments.",
                status="FORWARDED_ANONYMOUSLY",
                forwarded_to_name="Head of Department (HOD)",
                ai_safety_flag=False,
                ai_safety_category="Academic Laboratory Concern"
            )
        ]
        for p in sample_probs:
            db.add(p)
        db.commit()

    # 6. Seed Sample Doubts / Queries if empty
    query_count = db.query(Query).count()
    if query_count == 0:
        senior = db.query(User).filter(User.email == "demo.student4@brogrammers.local").first()
        senior_id = senior.id if senior else chief.id
        sample_queries = [
            Query(
                id=str(uuid.uuid4()),
                poster_id=senior_id,
                target_year=3,
                subject="Computer Networks",
                title="TCP Congestion Control vs UDP Streaming",
                content_text="Can someone explain how TCP slow start and congestion avoidance differ when handling video streams compared to UDP with application-level pacing?",
                visibility=QueryVisibility.PUBLIC,
                is_resolved=True
            ),
            Query(
                id=str(uuid.uuid4()),
                poster_id=senior_id,
                target_year=2,
                subject="Operating Systems",
                title="Deadlock Detection Algorithm Implementation",
                content_text="Looking for a clear Python or C++ walkthrough of Banker's Algorithm with safe sequence generation.",
                visibility=QueryVisibility.PUBLIC,
                is_resolved=False
            )
        ]
        for q in sample_queries:
            db.add(q)
        db.commit()

    # 7. Seed Initial Purpose Groups if empty
    group_count = db.query(CampusGroup).count()
    if group_count == 0:
        all_users = db.query(User).all()
        admin_user = chief
        
        g1 = CampusGroup(
            id=str(uuid.uuid4()),
            name="Placement & Career Preparation Cell 2026",
            purpose="Official recruitment drives, mock technical interviews, DSA coding sheets, and company-specific preparation guides for all years.",
            category=GroupCategory.PLACEMENT,
            created_by_admin_id=admin_user.id,
            is_active=True
        )
        g2 = CampusGroup(
            id=str(uuid.uuid4()),
            name="Allenhouse AI & Technical Innovation Club",
            purpose="Inter-college hackathons, open-source projects, machine learning workshops, and startup project collaborations.",
            category=GroupCategory.CLUB,
            created_by_admin_id=admin_user.id,
            is_active=True
        )
        db.add(g1)
        db.add(g2)
        db.commit()

        # Add all students and faculty as members
        for u in all_users:
            role = "ADMIN" if u.id == admin_user.id else "MEMBER"
            db.add(GroupMember(id=str(uuid.uuid4()), group_id=g1.id, user_id=u.id, role_in_group=role))
            db.add(GroupMember(id=str(uuid.uuid4()), group_id=g2.id, user_id=u.id, role_in_group=role))
        
        # Add welcome messages
        db.add(GroupMessage(
            id=str(uuid.uuid4()),
            group_id=g1.id,
            sender_id=admin_user.id,
            sender_name=admin_user.full_name,
            sender_role="ADMIN",
            content_text="Welcome to the Campus Placement Cell! Check the files section for 2026 aptitude question banks and top recruiter guidelines."
        ))
        db.add(GroupMessage(
            id=str(uuid.uuid4()),
            group_id=g2.id,
            sender_id=admin_user.id,
            sender_name=admin_user.full_name,
            sender_role="ADMIN",
            content_text="Welcome to the AI & Innovation Club! Hackathon registration details are posted. Feel free to pitch your project ideas here."
        ))
        db.commit()

    db.close()
    print("Demo setup completed: Chief Admin + Faculty + 4 Year Students + Campus Groups verified.")

if __name__ == "__main__":
    run_seed()
