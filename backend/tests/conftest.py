import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole, AccountStatus
from app.models.query import Query, QueryAnswer, QueryVisibility
from app.services.auth_service import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite:///./test_campusconnect.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def create_test_user(db, email, role, status=AccountStatus.APPROVED, locked_year=1, crn="TEST-001", batch="2026-2030"):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=f"Test User {email.split('@')[0]}",
            password_hash=get_password_hash("Password@123"),
            role=role,
            status=status,
            locked_year=locked_year,
            batch=batch,
            crn_or_roll_number=crn,
            points=100,
            level=2
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_auth_header(user):
    token = create_access_token({"sub": user.id, "role": user.role})
    return {"Authorization": f"Bearer {token}"}
