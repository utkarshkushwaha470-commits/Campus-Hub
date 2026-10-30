import os

init_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\backend\app\models\__init__.py"
with open(init_path, "r", encoding="utf-8") as f:
    c = f.read()

if "FacultyDispatch" not in c:
    c = c.replace(
        "from app.models.admin_audit_log import AdminAuditLog, AuditActionType",
        "from app.models.admin_audit_log import AdminAuditLog, AuditActionType, FacultyDispatch"
    )
    c = c.replace(
        '"AuditActionType",',
        '"AuditActionType",\n    "FacultyDispatch",'
    )
    with open(init_path, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated models/__init__.py with FacultyDispatch")
