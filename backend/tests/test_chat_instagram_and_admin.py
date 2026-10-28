import uuid
from app.models.user import UserRole, AccountStatus
from app.models.chat import Thread, Message, ThreadType
from app.models.moderation import UserBlock
from tests.conftest import create_test_user, get_auth_header

def test_instagram_style_chat_and_admin_super_access(client, db_session):
    """
    Verifies:
    1. Students can start direct messages, send messages, and toggle reactions.
    2. Non-participants cannot view private threads.
    3. Admin has SUPER-ACCESS to view all campus conversations and moderate messages.
    """
    student_a = create_test_user(db_session, "chat.a@apex.edu", UserRole.STUDENT, locked_year=1, crn="CRN-CHAT-01")
    student_b = create_test_user(db_session, "chat.b@apex.edu", UserRole.STUDENT, locked_year=2, crn="CRN-CHAT-02")
    stranger = create_test_user(db_session, "chat.stranger@apex.edu", UserRole.STUDENT, locked_year=3, crn="CRN-CHAT-03")
    admin = create_test_user(db_session, "chat.admin@apex.edu", UserRole.ADMIN, crn="ADM-CHAT-04")

    # 1. Student A starts chat with Student B
    start_resp = client.post(
        "/api/chat/start",
        data={"recipient_id": student_b.id},
        headers=get_auth_header(student_a)
    )
    assert start_resp.status_code == 200
    thread_id = start_resp.json()["thread_id"]

    # 2. Student A sends direct message
    msg_resp = client.post(
        f"/api/chat/threads/{thread_id}/messages",
        data={"content_text": "Hey! Did you finish the Lab assignment?"},
        headers=get_auth_header(student_a)
    )
    assert msg_resp.status_code == 200
    msg_id = msg_resp.json()["id"]

    # 3. Student B reads messages and adds emoji reaction (❤️)
    get_msgs_b = client.get(
        f"/api/chat/threads/{thread_id}/messages",
        headers=get_auth_header(student_b)
    )
    assert get_msgs_b.status_code == 200
    assert len(get_msgs_b.json()["messages"]) == 1

    react_resp = client.post(
        f"/api/chat/messages/{msg_id}/react",
        data={"emoji": "❤️"},
        headers=get_auth_header(student_b)
    )
    assert react_resp.status_code == 200
    assert "❤️" in react_resp.json()["reactions"]

    # 4. Stranger attempts to view private thread -> Denied with 403 Forbidden
    stranger_resp = client.get(
        f"/api/chat/threads/{thread_id}/messages",
        headers=get_auth_header(stranger)
    )
    assert stranger_resp.status_code == 403

    # 5. ADMIN SUPER-ACCESS: Admin lists ALL campus conversations
    admin_all_resp = client.get(
        "/api/chat/admin/all-threads",
        headers=get_auth_header(admin)
    )
    assert admin_all_resp.status_code == 200
    all_threads = admin_all_resp.json()
    assert any(t["thread_id"] == thread_id for t in all_threads)

    # 6. ADMIN SUPER-ACCESS: Admin inspects the private conversation
    admin_view_resp = client.get(
        f"/api/chat/threads/{thread_id}/messages",
        headers=get_auth_header(admin)
    )
    assert admin_view_resp.status_code == 200
    assert admin_view_resp.json()["is_admin_view"] == True

    # 7. ADMIN MODERATION: Admin redacts message
    del_resp = client.delete(
        f"/api/chat/admin/messages/{msg_id}",
        headers=get_auth_header(admin)
    )
    assert del_resp.status_code == 200

    # Verify message content was redacted
    db_session.expire_all()
    msg = db_session.query(Message).filter(Message.id == msg_id).first()
    assert "removed by campus administration" in msg.content_text
