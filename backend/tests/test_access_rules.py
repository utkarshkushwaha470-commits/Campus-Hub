import pytest
from app.models.user import UserRole, AccountStatus
from tests.conftest import create_test_user, get_auth_header

def test_pending_user_access_blocked(client, db_session):
    """Pending unverified users cannot access campus dashboard or queries."""
    pending_user = create_test_user(
        db_session,
        email="pending.tester@apex.edu",
        role=UserRole.STUDENT,
        status=AccountStatus.PENDING,
        crn="CRN-PEND-01"
    )
    headers = get_auth_header(pending_user)

    resp = client.get("/api/dashboard/summary", headers=headers)
    assert resp.status_code == 403
    assert "pending ID verification" in resp.json()["detail"]

    resp_queries = client.get("/api/queries/", headers=headers)
    assert resp_queries.status_code == 403

def test_undergraduate_cannot_access_premium_section(client, db_session):
    """Undergraduate students (Year 1-4) are blocked from Premium Section (PG/Faculty)."""
    ug_student = create_test_user(
        db_session,
        email="ug.tester@apex.edu",
        role=UserRole.STUDENT,
        status=AccountStatus.APPROVED,
        locked_year=2,
        crn="CRN-UG-02"
    )
    headers = get_auth_header(ug_student)

    resp = client.get("/api/dashboard/premium-section", headers=headers)
    assert resp.status_code == 403
    assert "Access Denied" in resp.json()["detail"]

def test_pg_and_faculty_can_access_premium_section(client, db_session):
    """Postgrad and Faculty can access the Premium Section."""
    pg_user = create_test_user(
        db_session,
        email="pg.tester@apex.edu",
        role=UserRole.PG,
        status=AccountStatus.APPROVED,
        locked_year=None,
        crn="CRN-PG-03"
    )
    headers = get_auth_header(pg_user)

    resp = client.get("/api/dashboard/premium-section", headers=headers)
    assert resp.status_code == 200
    assert "Welcome to the Brogrammers Premium Section" in resp.json()["message"]

def test_only_admin_can_access_admin_queue(client, db_session):
    """Only Admin role can access admin verification endpoints."""
    student = create_test_user(
        db_session,
        email="regular.student@apex.edu",
        role=UserRole.STUDENT,
        status=AccountStatus.APPROVED,
        crn="CRN-REG-04"
    )
    admin = create_test_user(
        db_session,
        email="admin.tester@apex.edu",
        role=UserRole.ADMIN,
        status=AccountStatus.APPROVED,
        crn="CRN-ADM-05"
    )

    # Student fails
    resp_student = client.get("/api/admin/verifications", headers=get_auth_header(student))
    assert resp_student.status_code == 403

    # Admin succeeds
    resp_admin = client.get("/api/admin/verifications", headers=get_auth_header(admin))
    assert resp_admin.status_code == 200
