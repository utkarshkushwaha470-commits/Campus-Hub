import os

chat_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\backend\app\models\chat.py"
with open(chat_path, "r", encoding="utf-8") as f:
    code = f.read()

model_code = """

class ChiefFacultyMessage(Base):
    __tablename__ = "chief_faculty_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    faculty_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_role = Column(String(20), nullable=False)  # "FACULTY" or "CHIEF_ADMIN"
    sender_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
"""

if "ChiefFacultyMessage" not in code:
    code += model_code
    with open(chat_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Added ChiefFacultyMessage to chat.py")
else:
    print("ChiefFacultyMessage already present.")
