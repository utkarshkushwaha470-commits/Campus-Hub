import os

model_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\backend\app\models\admin_audit_log.py"
with open(model_path, "r", encoding="utf-8") as f:
    c = f.read()

# Make sure Boolean is imported
if "Boolean" not in c:
    c = c.replace(
        "from sqlalchemy import Column, String, DateTime, ForeignKey, Text",
        "from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean"
    )

dispatch_model = """

class FacultyDispatch(Base):
    __tablename__ = "faculty_dispatches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_name = Column(String(100), nullable=False)
    sender_email = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=False)
    sender_department = Column(String(100), nullable=True)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    chief_reply = Column(Text, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
"""

if "FacultyDispatch" not in c:
    c += dispatch_model
    with open(model_path, "w", encoding="utf-8") as f:
        f.write(c)
    print("Added FacultyDispatch model to admin_audit_log.py")
else:
    print("FacultyDispatch already exists.")
