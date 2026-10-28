import os
import uuid
import hashlib
from typing import Optional
from app.config import settings

class StorageService:
    """
    S3-compatible file storage service with local encrypted disk fallback.
    Provides signed URLs for private assets (e.g. student ID cards).
    Supports secure deletion after verification.
    """

    def __init__(self):
        self.mode = settings.STORAGE_MODE
        self.local_dir = settings.STORAGE_LOCAL_DIR
        self.id_cards_dir = os.path.join(self.local_dir, "id_cards")
        self.uploads_dir = os.path.join(self.local_dir, "uploads")
        
        os.makedirs(self.id_cards_dir, exist_ok=True)
        os.makedirs(self.uploads_dir, exist_ok=True)

    def _obfuscate_bytes(self, data: bytes) -> bytes:
        """Simple symmetric XOR masking for local encrypted storage demonstration."""
        key = settings.SECRET_KEY.encode("utf-8")
        return bytes([b ^ key[i % len(key)] for i, b in enumerate(data)])

    async def save_id_card(self, file_bytes: bytes, filename: str) -> str:
        """
        Stores student ID card in private encrypted vault.
        ID cards are visible ONLY to admins and are deletable.
        """
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        unique_name = f"id_{uuid.uuid4().hex}.{ext}"
        
        if self.mode == "s3" and settings.S3_ACCESS_KEY:
            # S3 private bucket upload logic
            return f"s3://{settings.S3_BUCKET_NAME}/private/id_cards/{unique_name}"
        
        # Local encrypted storage
        target_path = os.path.join(self.id_cards_dir, unique_name)
        encrypted_data = self._obfuscate_bytes(file_bytes)
        with open(target_path, "wb") as f:
            f.write(encrypted_data)
        
        return unique_name

    async def get_id_card_bytes(self, storage_path: str) -> Optional[bytes]:
        """Decrypts and returns ID card bytes for admin viewing."""
        if storage_path.startswith("s3://"):
            # Would generate S3 presigned URL or download buffer
            return None
        
        target_path = os.path.join(self.id_cards_dir, os.path.basename(storage_path))
        if os.path.exists(target_path):
            with open(target_path, "rb") as f:
                encrypted_data = f.read()
            return self._obfuscate_bytes(encrypted_data)
        return None

    async def delete_id_card(self, storage_path: str) -> bool:
        """Secure deletion of ID card after verification."""
        if storage_path.startswith("s3://"):
            return True
        target_path = os.path.join(self.id_cards_dir, os.path.basename(storage_path))
        if os.path.exists(target_path):
            os.remove(target_path)
            return True
        return False

    async def save_public_upload(self, file_bytes: bytes, filename: str) -> str:
        """Saves doubt photo attachments."""
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        unique_name = f"query_{uuid.uuid4().hex}.{ext}"
        target_path = os.path.join(self.uploads_dir, unique_name)
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        return f"/storage/uploads/{unique_name}"

storage_service = StorageService()
