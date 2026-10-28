import uuid
from app.models.user import UserRole, AccountStatus
from app.models.query import Query, QueryAnswer, QueryVisibility
from app.models.rating import Rating, RatingStatus
from tests.conftest import create_test_user, get_auth_header

def test_only_asker_can_rate_and_only_after_answer(client, db_session):
    """Only the user who posted the query can rate, and only after an answer exists."""
    junior = create_test_user(db_session, "asker.jr@apex.edu", UserRole.STUDENT, locked_year=1, crn="CRN-RATE-01")
    senior = create_test_user(db_session, "helper.sr@apex.edu", UserRole.STUDENT, locked_year=3, crn="CRN-RATE-02")
    stranger = create_test_user(db_session, "stranger@apex.edu", UserRole.STUDENT, locked_year=2, crn="CRN-RATE-03")

    # Junior creates doubt
    query = Query(
        id=str(uuid.uuid4()),
        poster_id=junior.id,
        target_year=1,
        title="Need Help in Differential Calculus",
        content_text="How to find limit as x approaches 0 for sin(x)/x?",
        subject="Mathematics"
    )
    db_session.add(query)
    db_session.commit()

    # Junior tries to rate BEFORE senior replies -> Fails
    resp_early = client.post(
        "/api/ratings/",
        json={"query_id": query.id, "stars": 5, "comment": "Thanks!"},
        headers=get_auth_header(junior)
    )
    assert resp_early.status_code == 400
    assert "before a senior has provided an answer" in resp_early.json()["detail"]

    # Senior provides answer
    answer = QueryAnswer(
        id=str(uuid.uuid4()),
        query_id=query.id,
        author_id=senior.id,
        content_text="Apply L'Hopital's rule or use the Taylor expansion of sin(x)!"
    )
    db_session.add(answer)
    db_session.commit()

    # Stranger tries to rate -> Fails with 403 Forbidden
    resp_stranger = client.post(
        "/api/ratings/",
        json={"query_id": query.id, "stars": 5, "comment": "Great answer"},
        headers=get_auth_header(stranger)
    )
    assert resp_stranger.status_code == 403
    assert "Only the student who asked" in resp_stranger.json()["detail"]

    # Junior rates senior -> Succeeds, points awarded
    senior_initial_points = senior.points
    resp_valid = client.post(
        "/api/ratings/",
        json={"query_id": query.id, "stars": 5, "comment": "Clear explanation!"},
        headers=get_auth_header(junior)
    )
    assert resp_valid.status_code == 200
    assert resp_valid.json()["status"] == RatingStatus.PASSED

    db_session.refresh(senior)
    assert senior.points > senior_initial_points

def test_no_self_rating(client, db_session):
    """Students cannot rate their own answers."""
    poster = create_test_user(db_session, "self.rater@apex.edu", UserRole.STUDENT, locked_year=2, crn="CRN-SELF-04")
    query = Query(
        id=str(uuid.uuid4()),
        poster_id=poster.id,
        target_year=2,
        title="Self Query",
        content_text="Self explanation",
        subject="Physics"
    )
    db_session.add(query)
    db_session.commit()

    # Self answer
    answer = QueryAnswer(
        id=str(uuid.uuid4()),
        query_id=query.id,
        author_id=poster.id,
        content_text="I solved it myself"
    )
    db_session.add(answer)
    db_session.commit()

    # Self rating attempt
    resp = client.post(
        "/api/ratings/",
        json={"query_id": query.id, "stars": 5},
        headers=get_auth_header(poster)
    )
    assert resp.status_code == 400

def test_mutual_5star_trading_abuse_held_for_review(client, db_session):
    """Reciprocal 5-star trading triggers the abuse engine and holds points for moderator review."""
    user_a = create_test_user(db_session, "trader.a@apex.edu", UserRole.STUDENT, locked_year=2, crn="CRN-TRADE-05")
    user_b = create_test_user(db_session, "trader.b@apex.edu", UserRole.STUDENT, locked_year=3, crn="CRN-TRADE-06")

    # User B already rated User A 5 stars
    q1 = Query(id=str(uuid.uuid4()), poster_id=user_b.id, target_year=3, title="Q1", content_text="C1", subject="CS")
    db_session.add(q1)
    db_session.commit()

    rating_b_to_a = Rating(
        id=str(uuid.uuid4()),
        query_id=q1.id,
        rater_student_id=user_b.id,
        rated_senior_id=user_a.id,
        stars=5,
        status=RatingStatus.PASSED
    )
    db_session.add(rating_b_to_a)
    db_session.commit()

    # Now User A creates query, User B answers, and User A tries to reciprocate with 5 stars
    q2 = Query(id=str(uuid.uuid4()), poster_id=user_a.id, target_year=2, title="Q2", content_text="C2", subject="CS")
    db_session.add(q2)
    ans2 = QueryAnswer(id=str(uuid.uuid4()), query_id=q2.id, author_id=user_b.id, content_text="Ans 2")
    db_session.add(ans2)
    db_session.commit()

    # User A rates User B 5 stars
    resp = client.post(
        "/api/ratings/",
        json={"query_id": q2.id, "stars": 5, "comment": "Trade stars"},
        headers=get_auth_header(user_a)
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == RatingStatus.HELD_FOR_REVIEW
    assert "reciprocal 5-star trading" in data["abuse_flag_reason"]
