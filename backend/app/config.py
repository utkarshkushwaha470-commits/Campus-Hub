import os
from pydantic_settings import BaseSettings

_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_default_db = os.path.join(_backend_dir, "campusconnect.db").replace("\\", "/")
_raw_db = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")
if _raw_db.startswith("postgres://"):
    _raw_db = _raw_db.replace("postgres://", "postgresql://", 1)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Hub"
    COLLEGE_NAME: str = "Allenhouse Institute of Technology"
    COLLEGE_DOMAIN: str = "apex.edu"
    
    # Database (always points to persistent database in backend directory)
    DATABASE_URL: str = _raw_db
    
    # JWT & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "brogrammers-ultra-secure-jwt-secret-key-32chars-minimum-!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Google Gemma 4 Service
    # Endpoint can point to Google Vertex AI, HuggingFace TGI, vLLM, or Gemini proxy
    GEMMA4_API_KEY: str = os.getenv("GEMMA4_API_KEY", "")
    GEMMA4_API_URL: str = os.getenv("GEMMA4_API_URL", "https://api.google.com/gemma4/v1")
    GEMMA4_MODEL_NAME: str = os.getenv("GEMMA4_MODEL_NAME", "gemma-4-multimodal")
    
    # File Storage (S3 compatible or encrypted local fallback)
    STORAGE_MODE: str = os.getenv("STORAGE_MODE", "local")  # "local" | "s3"
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "brogrammers-private")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    
    STORAGE_LOCAL_DIR: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "storage")
    )
    
    # Moderation & Anti-Abuse
    MAX_RATINGS_PER_DAY: int = 5
    MAX_RATINGS_PER_PAIR_PER_WEEK: int = 2
    BURST_RATING_WINDOW_SECONDS: int = 180

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
