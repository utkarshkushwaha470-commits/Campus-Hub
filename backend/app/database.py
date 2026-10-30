from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

# Auto-migration for admin_proof and is_chief_admin columns
try:
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN admin_proof VARCHAR(255) DEFAULT 'ujjawal utkarsh 222005'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_chief_admin BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
except Exception:
    pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
