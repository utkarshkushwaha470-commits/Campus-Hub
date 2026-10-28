import uuid
from app.models.user import UserRole, AccountStatus
from app.models.problem_box import ProblemRecipientRole, ProblemStatus
from app.models.admin_audit_log import AdminAuditLog, AuditActionType
from tests.conftest import create_test_user, get_auth_header

def test_problem_box_anonymity_and_admin_only_queue(client, db_session):
    """
    Problem Box Privacy Guarantee:
    - Hidden from all general users.
    - Only the Admin can see the sender's identity.
    - Anonymized forwarding to authorities.
    - Full audit logging.
    """
    student = create_test_user(db_session, "confidential.student@apex.edu", UserRole.STUDENT, crn="CRN-PRIV-01")
    other_student = create_test_user(db_session, "snooping.student@apex.edu", UserRole.STUDENT, crn="CRN-PRIV-02")
    faculty = create_test_user(db_session, "faculty.viewer@apex.edu", UserRole.FACULTY, crn="FAC-PRIV-03")
    admin = create_test_user(db_session, "authority.admin@apex.edu", UserRole.ADMIN, crn="ADM-PRIV-04")

    # 1. Student submits message to HOD
    submit_resp = client.post(
        "/api/problem-box/",
        json={
            "recipient_role": ProblemRecipientRole.HOD,
            "subject": "Lab Equipment Malfunction and Safety Concern",
            "content_text": "The grounding in Electrical Lab 3 is sparking and posing a safety hazard."
        },
        headers=get_auth_header(student)
    )
    assert submit_resp.status_code == 200
    msg_id = submit_resp.json()["id"]

    # 2. General student and faculty CANNOT access admin queue
    resp_snoop = client.get("/api/problem-box/admin/queue", headers=get_auth_header(other_student))
    assert resp_snoop.status_code == 403

    resp_fac = client.get("/api/problem-box/admin/queue", headers=get_auth_header(faculty))
    assert resp_fac.status_code == 403

    # 3. ONLY the Admin can view the queue
    resp_admin = client.get("/api/problem-box/admin/queue", headers=get_auth_header(admin))
    assert resp_admin.status_code == 200
    queue = resp_admin.json()
    assert len(queue) > 0

    # Verify admin sees the sender identity
    target_item = next(m for m in queue if m["id"] == msg_id)
    assert target_item["student_email"] == "confidential.student@apex.edu"
    assert "confidential.student" in target_item["student_name"]

    # Verify audit log was created for admin viewing confidential queue
    view_audit = db_session.query(AdminAuditLog).filter(
        AdminAuditLog.admin_user_id == admin.id,
        AdminAuditLog.action_type == AuditActionType.VIEW_PROBLEM_BOX
    ).first()
    assert view_audit is not None

    # 4. Admin forwards to HOD: MUST be completely anonymized (no student name/email)
    forward_resp = client.post(
        f"/api/problem-box/admin/{msg_id}/forward",
        json={"target_authority_name": "Prof. HOD of Electrical Engineering"},
        headers=get_auth_header(admin)
    )
    assert forward_resp.status_code == 200
    payload = forward_resp.json()["anonymized_payload"]
    assert payload["sender"] == "[REDACTED - STUDENT IDENTITY CONCEALED BY POLICY]"
    assert "confidential.student" not in payload["sender"]
    assert "confidential.student@apex.edu" not in str(payload)

    # 5. Admin replies directly to student via platform
    reply_resp = client.post(
        f"/api/problem-box/admin/{msg_id}/reply",
        json={"reply_text": "Thank you for alerting us. Facilities team has shut off power to Lab 3."},
        headers=get_auth_header(admin)
    )
    assert reply_resp.status_code == 200

    # 6. Student checks their own Problem Box: sees official reply
    my_msgs = client.get("/api/problem-box/my-messages", headers=get_auth_header(student))
    assert my_msgs.status_code == 200
    student_view = next(m for m in my_msgs.json() if m["id"] == msg_id)
    assert student_view["status"] == ProblemStatus.REPLIED
    assert "Facilities team has shut off power" in student_view["admin_response_text"]
