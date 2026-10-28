import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.admin_audit_log import AdminAuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        admin_id: str,
        action_type: str,
        target_entity: str,
        target_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AdminAuditLog:
        audit_entry = AdminAuditLog(
            admin_user_id=admin_id,
            action_type=action_type,
            target_entity=target_entity,
            target_id=target_id,
            ip_address=ip_address or "127.0.0.1",
            details_json=json.dumps(details or {})
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

audit_service = AuditService()
