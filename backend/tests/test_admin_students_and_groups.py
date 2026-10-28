import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole, AccountStatus
from app.models.group import CampusGroup, GroupMember, GroupMessage
from app.services.auth_service import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create admin
    admin = db.query(User).filter(User.email == "test_admin@apex.edu").first()
    if not admin:
        admin = User(
            id="admin-uuid-101",
            email="test_admin@apex.edu",
            full_name="Admin Director",
            password_hash=get_password_hash("AdminPass1"),
            role=UserRole.ADMIN,
            status=AccountStatus.APPROVED,
            batch="ADMIN",
            crn_or_roll_number="ADM-999"
        )
        db.add(admin)

    # Create student 1
    student1 = db.query(User).filter(User.email == "test_student1@apex.edu").first()
    if not student1:
        student1 = User(
            id="student-uuid-201",
            email="test_student1@apex.edu",
            full_name="Student One",
            password_hash=get_password_hash("StudentPass1"),
            role=UserRole.STUDENT,
            status=AccountStatus.APPROVED,
            locked_year=2,
            batch="2024-2028",
            crn_or_roll_number="CRN-S1-001"
        )
        db.add(student1)

    # Create student 2 (for outsider access testing)
    student2 = db.query(User).filter(User.email == "test_student2@apex.edu").first()
    if not student2:
        student2 = User(
            id="student-uuid-202",
            email="test_student2@apex.edu",
            full_name="Student Two",
            password_hash=get_password_hash("StudentPass2"),
            role=UserRole.STUDENT,
            status=AccountStatus.APPROVED,
            locked_year=3,
            batch="2023-2027",
            crn_or_roll_number="CRN-S2-002"
        )
        db.add(student2)

    db.commit()
    db.close()
    yield

def test_admin_list_all_students_and_search():
    token = create_access_token({"sub": "admin-uuid-101", "role": UserRole.ADMIN})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/students", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    emails = [s["email"] for s in data]
    assert "test_student1@apex.edu" in emails

    # Test search query
    res_search = client.get("/api/admin/students?search=Student One", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1
    assert res_search.json()[0]["full_name"] == "Student One"

def test_admin_terminate_student_and_access_revocation():
    admin_token = create_access_token({"sub": "admin-uuid-101", "role": UserRole.ADMIN})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin terminates Student One
    term_res = client.post(
        "/api/admin/students/student-uuid-201/terminate",
        json={"reason": "Gross misconduct during campus event"},
        headers=admin_headers
    )
    assert term_res.status_code == 200
    assert term_res.json()["status"] == AccountStatus.TERMINATED

    # Verify student status in database
    db = SessionLocal()
    st = db.query(User).filter(User.id == "student-uuid-201").first()
    assert st.status == AccountStatus.TERMINATED
    db.close()

    # Student One token now rejected with 403 Forbidden
    student_token = create_access_token({"sub": "student-uuid-201", "role": UserRole.STUDENT})
    student_headers = {"Authorization": f"Bearer {student_token}"}
    res_dashboard = client.get("/api/dashboard/summary", headers=student_headers)
    assert res_dashboard.status_code == 403

def test_admin_reinstate_student():
    admin_token = create_access_token({"sub": "admin-uuid-101", "role": UserRole.ADMIN})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin reinstates Student One
    reinst_res = client.post(
        "/api/admin/students/student-uuid-201/reinstate",
        json={"reason": "Appeal review approved by disciplinary committee"},
        headers=admin_headers
    )
    assert reinst_res.status_code == 200
    assert reinst_res.json()["status"] == AccountStatus.APPROVED

    # Student One can access dashboard again
    student_token = create_access_token({"sub": "student-uuid-201", "role": UserRole.STUDENT})
    student_headers = {"Authorization": f"Bearer {student_token}"}
    res_dashboard = client.get("/api/dashboard/summary", headers=student_headers)
    assert res_dashboard.status_code == 200

def test_non_admin_cannot_terminate_student():
    student_token = create_access_token({"sub": "student-uuid-201", "role": UserRole.STUDENT})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    res = client.post(
        "/api/admin/students/student-uuid-202/terminate",
        json={"reason": "Malicious attempt"},
        headers=student_headers
    )
    assert res.status_code == 403

def test_admin_create_purpose_group_and_messaging():
    admin_token = create_access_token({"sub": "admin-uuid-101", "role": UserRole.ADMIN})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin creates a Special Purpose Group
    create_res = client.post(
        "/api/groups",
        json={
            "name": "Robotics Competition Core",
            "purpose": "Dedicated team building the autonomous ground vehicle for Inter-Collegiate Techfest 2026.",
            "category": "SPECIAL_PURPOSE",
            "member_ids": ["student-uuid-201"]
        },
        headers=admin_headers
    )
    assert create_res.status_code == 201
    group_id = create_res.json()["id"]

    # 2. Student One can see the group in their enrolled groups list
    student1_token = create_access_token({"sub": "student-uuid-201", "role": UserRole.STUDENT})
    student1_headers = {"Authorization": f"Bearer {student1_token}"}

    list_res = client.get("/api/groups", headers=student1_headers)
    assert list_res.status_code == 200
    group_ids = [g["id"] for g in list_res.json()]
    assert group_id in group_ids

    # 3. Student One posts a message in the group
    post_res = client.post(
        f"/api/groups/{group_id}/messages",
        json={"content_text": "LiDAR sensor drivers are calibrated and ready for testing."},
        headers=student1_headers
    )
    assert post_res.status_code == 200
    assert post_res.json()["sender_name"] == "Student One"

    # 4. Student Two (outsider, not in group) cannot access messages or post
    student2_token = create_access_token({"sub": "student-uuid-202", "role": UserRole.STUDENT})
    student2_headers = {"Authorization": f"Bearer {student2_token}"}

    outsider_view = client.get(f"/api/groups/{group_id}/messages", headers=student2_headers)
    assert outsider_view.status_code == 403

    outsider_post = client.post(
        f"/api/groups/{group_id}/messages",
        json={"content_text": "I should not be able to post here."},
        headers=student2_headers
    )
    assert outsider_post.status_code == 403

    # 5. Admin can monitor and post in the group
    admin_post = client.post(
        f"/api/groups/{group_id}/messages",
        json={"content_text": "Good work. Lab 3 will remain open after-hours for testing."},
        headers=admin_headers
    )
    assert admin_post.status_code == 200
