import uuid
from app.models.user import User, UserRole, AccountStatus
from app.models.id_verification import IDVerification, IDVerificationStatus, GemmaMatchHint
from tests.conftest import create_test_user, get_auth_header

def test_admin_approval_permanently_locks_year(client, db_session):
    """Admin approval approves user and permanently locks their year from ID card."""
    admin = create_test_user(db_session, "super.admin@apex.edu", UserRole.ADMIN, crn="ADM-LOCK-01")
    
    # Create pending student
    new_student = create_test_user(
        db_session,
        "freshman@apex.edu",
        UserRole.STUDENT,
        status=AccountStatus.PENDING,
        locked_year=None,
        crn="CRN-FRESH-02"
    )

    verif = IDVerification(
        id=str(uuid.uuid4()),
        user_id=new_student.id,
        id_photo_storage_path="id_freshman.jpg",
        ocr_extracted_name="Freshman Student",
        ocr_extracted_batch="2026-2030",
        ocr_extracted_year=1,
        ocr_match_confidence=0.98,
        ocr_hint_status=GemmaMatchHint.MATCH,
        status=IDVerificationStatus.PENDING
    )
    db_session.add(verif)
    db_session.commit()

    # Admin reviews and approves
    admin_headers = get_auth_header(admin)
    review_resp = client.post(
        f"/api/admin/verifications/{verif.id}/review",
        json={"action": "APPROVE", "override_year": 1},
        headers=admin_headers
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["locked_year"] == 1

    # Verify student is now APPROVED and year is locked to 1
    db_session.refresh(new_student)
    assert new_student.status == AccountStatus.APPROVED
    assert new_student.locked_year == 1

def test_admin_yearly_promotion(client, db_session):
    """Students cannot change locked year; only Admin promotion update can advance year."""
    admin = create_test_user(db_session, "promo.admin@apex.edu", UserRole.ADMIN, crn="ADM-PROMO-03")
    student = create_test_user(
        db_session, "advancing.student@apex.edu", UserRole.STUDENT,
        status=AccountStatus.APPROVED, locked_year=2, crn="CRN-PROMO-04"
    )

    admin_headers = get_auth_header(admin)
    promo_resp = client.post(
        f"/api/admin/users/{student.id}/promote-year",
        json={"user_id": student.id, "new_year": 3},
        headers=admin_headers
    )
    assert promo_resp.status_code == 200
    assert promo_resp.json()["new_year"] == 3

    db_session.refresh(student)
    assert student.locked_year == 3

def test_one_id_crn_one_account_constraint(client, db_session):
    """One ID/CRN = One Account rule strictly enforced during signup."""
    # Existing user with CRN-UNIQUE-01
    create_test_user(
        db_session,
        "existing.crn@apex.edu",
        UserRole.STUDENT,
        crn="CRN-UNIQUE-01"
    )

    # Attempt to sign up another account with the identical CRN
    files = {"id_card": ("test_id.jpg", b"fake_id_bytes", "image/jpeg")}
    data = {
        "email": "different.email@apex.edu",
        "full_name": "Imposter Student",
        "password": "Password@123",
        "batch": "2026-2030",
        "requested_year": 1,
        "crn_or_roll_number": "CRN-UNIQUE-01",  # Duplicate!
        "otp": "123456"
    }
    resp = client.post("/api/auth/signup", data=data, files=files)
    assert resp.status_code == 400
    assert "One ID = One Account" in resp.json()["detail"]
