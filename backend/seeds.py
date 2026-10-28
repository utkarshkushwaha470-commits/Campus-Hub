import uuid
from datetime import datetime
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole, AccountStatus
from app.models.id_verification import IDVerification, IDVerificationStatus, GemmaMatchHint
from app.models.query import Query, QueryAnswer, QueryVisibility
from app.models.chat import Thread, Message, ThreadType
from app.models.notification import Notification, NotificationTargetType
from app.models.problem_box import ProblemBoxMessage, ProblemRecipientRole, ProblemStatus
from app.models.group import CampusGroup, GroupMember, GroupMessage, GroupCategory
from app.services.auth_service import get_password_hash

def run_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("--- Seeding CampusConnect College Database ---")

    # 1. Super Admin (Seeded only, strong password + 2FA)
    admin = db.query(User).filter(User.email == "admin@apex.edu").first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@apex.edu",
            full_name="College Dean of Academics (Admin)",
            password_hash=get_password_hash("Admin@123"),
            role=UserRole.ADMIN,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="STAFF",
            crn_or_roll_number="ADM-001",
            is_2fa_enabled=True,
            two_factor_secret="888888"
        )
        db.add(admin)
        print("Created Super-Admin: admin@apex.edu / Admin@123 (2FA: 888888)")

    # 2. Faculty
    faculty = db.query(User).filter(User.email == "dr.sharma@apex.edu").first()
    if not faculty:
        faculty = User(
            id=str(uuid.uuid4()),
            email="dr.sharma@apex.edu",
            full_name="Dr. Vikram Sharma (Professor)",
            password_hash=get_password_hash("Faculty@123"),
            role=UserRole.FACULTY,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="FACULTY-CS",
            crn_or_roll_number="FAC-101",
            points=120,
            level=2
        )
        db.add(faculty)
        print("Created Faculty: dr.sharma@apex.edu / Faculty@123")

    # 3. Postgrad (PG) Student
    pg_student = db.query(User).filter(User.email == "aravind.pg@apex.edu").first()
    if not pg_student:
        pg_student = User(
            id=str(uuid.uuid4()),
            email="aravind.pg@apex.edu",
            full_name="Aravind Mohan (M.Tech AI)",
            password_hash=get_password_hash("Student@123"),
            role=UserRole.PG,
            status=AccountStatus.APPROVED,
            locked_year=None,
            batch="2025-2027",
            crn_or_roll_number="PG-2025-04",
            points=240,
            level=3
        )
        db.add(pg_student)
        print("Created PG Student: aravind.pg@apex.edu / Student@123")

    # 4. 4th Year Senior Student
    senior_4th = db.query(User).filter(User.email == "priya.4th@apex.edu").first()
    if not senior_4th:
        senior_4th = User(
            id=str(uuid.uuid4()),
            email="priya.4th@apex.edu",
            full_name="Priya Nair (4th Year Senior)",
            password_hash=get_password_hash("Student@123"),
            role=UserRole.STUDENT,
            status=AccountStatus.APPROVED,
            locked_year=4,
            batch="2023-2027",
            crn_or_roll_number="CRN-2023-402",
            points=420,
            level=4
        )
        db.add(senior_4th)
        print("Created 4th Year Senior: priya.4th@apex.edu / Student@123")

    # 5. 3rd Year Senior Student
    senior_3rd = db.query(User).filter(User.email == "rohit.3rd@apex.edu").first()
    if not senior_3rd:
        senior_3rd = User(
            id=str(uuid.uuid4()),
            email="rohit.3rd@apex.edu",
            full_name="Rohit Verma (3rd Year Senior)",
            password_hash=get_password_hash("Student@123"),
            role=UserRole.STUDENT,
            status=AccountStatus.APPROVED,
            locked_year=3,
            batch="2024-2028",
            crn_or_roll_number="CRN-2024-301",
            points=180,
            level=3
        )
        db.add(senior_3rd)
        print("Created 3rd Year Senior: rohit.3rd@apex.edu / Student@123")

    # 6. 1st Year Junior Student
    junior_1st = db.query(User).filter(User.email == "ananya.1st@apex.edu").first()
    if not junior_1st:
        junior_1st = User(
            id=str(uuid.uuid4()),
            email="ananya.1st@apex.edu",
            full_name="Ananya Sen (1st Year Junior)",
            password_hash=get_password_hash("Student@123"),
            role=UserRole.STUDENT,
            status=AccountStatus.APPROVED,
            locked_year=1,
            batch="2026-2030",
            crn_or_roll_number="CRN-2026-105",
            points=10,
            level=1
        )
        db.add(junior_1st)
        print("Created 1st Year Junior: ananya.1st@apex.edu / Student@123")

    # 7. Pending Student (waiting for ID verification)
    pending_student = db.query(User).filter(User.email == "rahul.pending@apex.edu").first()
    if not pending_student:
        pending_student = User(
            id=str(uuid.uuid4()),
            email="rahul.pending@apex.edu",
            full_name="Rahul Roy (Pending Applicant)",
            password_hash=get_password_hash("Student@123"),
            role=UserRole.STUDENT,
            status=AccountStatus.PENDING,
            locked_year=None,
            batch="2026-2030",
            crn_or_roll_number="CRN-2026-999"
        )
        db.add(pending_student)
        db.commit()

        verif = IDVerification(
            id=str(uuid.uuid4()),
            user_id=pending_student.id,
            id_photo_storage_path="id_sample_card.jpg",
            ocr_extracted_name="Rahul Roy",
            ocr_extracted_batch="2026-2030",
            ocr_extracted_year=1,
            ocr_match_confidence=0.96,
            ocr_hint_status=GemmaMatchHint.MATCH,
            status=IDVerificationStatus.PENDING
        )
        db.add(verif)
        print("Created Pending Verification Applicant: rahul.pending@apex.edu / Student@123")

    db.commit()

    # 8. Seed sample doubts and answers
    sample_q = db.query(Query).filter(Query.title == "Doubt in Binary Search Recursion Base Condition").first()
    if not sample_q and junior_1st and senior_4th:
        sample_q = Query(
            id=str(uuid.uuid4()),
            poster_id=junior_1st.id,
            target_year=1,
            is_premium=False,
            visibility=QueryVisibility.PUBLIC,
            title="Doubt in Binary Search Recursion Base Condition",
            content_text="In recursive binary search, when should we return -1? Is it when low > high or low >= high?",
            subject="Computer Science",
            tags='["algorithms", "binary-search", "recursion"]',
            ai_hint="[AI Hint - Gemma 4]: Check when the search interval becomes empty (i.e., low > high). That represents the base case when target element is absent.",
            is_resolved=False
        )
        db.add(sample_q)
        db.commit()

        # Senior answer
        ans = QueryAnswer(
            id=str(uuid.uuid4()),
            query_id=sample_q.id,
            author_id=senior_4th.id,
            content_text="Hi Ananya! You return -1 when low > high. When low == high, there is still one element left in your search space that must be inspected!",
            is_accepted=True
        )
        db.add(ans)
        db.commit()
        print("Created sample 1st year query with senior answer.")

    # 9. Seed sample notification
    if admin:
        notif = db.query(Notification).filter(Notification.title == "Mid-Semester Examinations Schedule Released").first()
        if not notif:
            notif = Notification(
                id=str(uuid.uuid4()),
                sender_id=admin.id,
                title="Mid-Semester Examinations Schedule Released",
                body="The academic council has uploaded the official mid-term examination timetable on the college intranet. All students please review.",
                target_type=NotificationTargetType.ALL,
                is_broadcast=True
            )
            db.add(notif)
            db.commit()
            print("Created sample broadcast notification.")

    # 10. Seed sample Instagram-style DM thread
    if junior_1st and senior_4th:
        dm_thread = db.query(Thread).filter(
            ((Thread.student_id == junior_1st.id) & (Thread.senior_id == senior_4th.id)) |
            ((Thread.student_id == senior_4th.id) & (Thread.senior_id == junior_1st.id))
        ).first()
        if not dm_thread:
            dm_thread = Thread(
                id=str(uuid.uuid4()),
                thread_type=ThreadType.DIRECT_MESSAGE,
                student_id=junior_1st.id,
                senior_id=senior_4th.id,
                topic="Direct Chat",
                last_message_text="Sure Ananya! Feel free to drop them here. I am happy to help 🚀",
                last_message_at=datetime.utcnow(),
            )
            db.add(dm_thread)
            db.commit()

            msg1 = Message(
                id=str(uuid.uuid4()),
                thread_id=dm_thread.id,
                sender_id=junior_1st.id,
                content_text="Hey Priya di! Are you free to review my sorting notes sometime?",
                reactions='{"❤️": ["' + senior_4th.id + '"]}',
                is_read=True
            )
            msg2 = Message(
                id=str(uuid.uuid4()),
                thread_id=dm_thread.id,
                sender_id=senior_4th.id,
                content_text="Sure Ananya! Feel free to drop them here. I am happy to help 🚀",
                reactions='{"🔥": ["' + junior_1st.id + '"]}',
                is_read=True
            )
            db.add_all([msg1, msg2])
            db.commit()
            print("Created sample Direct Message thread with reactions.")

    # 11. Seed sample Special Purpose Group
    if admin and senior_4th and junior_1st:
        group = db.query(CampusGroup).filter(CampusGroup.name == "Placement & Career Guidance Cell 2026").first()
        if not group:
            group = CampusGroup(
                id=str(uuid.uuid4()),
                name="Placement & Career Guidance Cell 2026",
                purpose="Special administrative committee to mentor graduating seniors, review resumes, and coordinate campus recruitment drives.",
                category=GroupCategory.PLACEMENT,
                created_by_admin_id=admin.id,
                is_active=True
            )
            db.add(group)
            db.commit()

            m1 = GroupMember(id=str(uuid.uuid4()), group_id=group.id, user_id=admin.id, role_in_group="ADMIN")
            m2 = GroupMember(id=str(uuid.uuid4()), group_id=group.id, user_id=senior_4th.id, role_in_group="LEAD")
            m3 = GroupMember(id=str(uuid.uuid4()), group_id=group.id, user_id=junior_1st.id, role_in_group="MEMBER")
            db.add_all([m1, m2, m3])
            db.commit()

            gmsg1 = GroupMessage(
                id=str(uuid.uuid4()),
                group_id=group.id,
                sender_id=admin.id,
                sender_name=admin.full_name,
                sender_role=admin.role,
                content_text="Welcome to the official College Placement Cell group. All drive circulars and interview preparatory materials will be posted here."
            )
            gmsg2 = GroupMessage(
                id=str(uuid.uuid4()),
                group_id=group.id,
                sender_id=senior_4th.id,
                sender_name=senior_4th.full_name,
                sender_role=senior_4th.role,
                content_text="Understood Dean Sir! I will coordinate the mock technical interview schedules for our batch."
            )
            db.add_all([gmsg1, gmsg2])
            db.commit()
            print("Created sample Special Purpose Group: Placement Cell.")

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    run_seed()
