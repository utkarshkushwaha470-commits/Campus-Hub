import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base, AsyncSessionLocal
from app.models.user import User, RoleEnum, VerificationStatus
from app.models.module import Module
from app.services.auth_service import get_password_hash
from app.services.storage_service import save_encrypted_id_photo

async def seed():
    print("[*] Initializing CampusConnect Database and Seeding Initial Data...")
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        from sqlalchemy import select
        res = await db.execute(select(User))
        if res.scalars().first():
            print("Database already contains records. Skipping seed.")
            return

        dummy_card = b"DUMMY_COLLEGE_ID_CARD_PHOTO_BYTES_ENCRYPTED_WITH_FERNET_AES256"
        enc_path, _ = save_encrypted_id_photo(dummy_card, "sample_id.jpg")

        users = [
            User(
                username="rohan1",
                email="rohan.sharma@gmail.com",
                crn="CRN-2026-101",
                college_id_card_number="ID-2026-101",
                full_name="Rohan Sharma",
                hashed_password=get_password_hash("student123"),
                role=RoleEnum.STUDENT_1,
                verified_year=1,
                is_verified=True,
                verification_status=VerificationStatus.AUTO_VERIFIED,
                ocr_extracted_name="Rohan Sharma",
                ocr_extracted_crn="CRN-2026-101",
                ocr_extracted_year="1st Year",
                ocr_confidence=0.96,
                encrypted_id_photo_path=enc_path,
                department="Computer Science",
                reputation_score=35
            ),
            User(
                username="priya2",
                email="priya.patel@gmail.com",
                crn="CRN-2025-201",
                college_id_card_number="ID-2025-201",
                full_name="Priya Patel",
                hashed_password=get_password_hash("student123"),
                role=RoleEnum.STUDENT_2,
                verified_year=2,
                is_verified=True,
                verification_status=VerificationStatus.AUTO_VERIFIED,
                ocr_extracted_name="Priya Patel",
                ocr_extracted_crn="CRN-2025-201",
                ocr_extracted_year="2nd Year",
                ocr_confidence=0.94,
                encrypted_id_photo_path=enc_path,
                department="Information Technology",
                reputation_score=80
            ),
            User(
                username="aarav3",
                email="aarav.verma@gmail.com",
                crn="CRN-2024-301",
                college_id_card_number="ID-2024-301",
                full_name="Aarav Verma",
                hashed_password=get_password_hash("student123"),
                role=RoleEnum.STUDENT_3,
                verified_year=3,
                is_verified=True,
                verification_status=VerificationStatus.AUTO_VERIFIED,
                ocr_extracted_name="Aarav Verma",
                ocr_extracted_crn="CRN-2024-301",
                ocr_extracted_year="3rd Year",
                ocr_confidence=0.95,
                encrypted_id_photo_path=enc_path,
                department="Computer Science",
                reputation_score=195
            ),
            User(
                username="ananya4",
                email="ananya.singh@gmail.com",
                crn="CRN-2023-401",
                college_id_card_number="ID-2023-401",
                full_name="Ananya Singh",
                hashed_password=get_password_hash("student123"),
                role=RoleEnum.STUDENT_4,
                verified_year=4,
                is_verified=True,
                verification_status=VerificationStatus.AUTO_VERIFIED,
                ocr_extracted_name="Ananya Singh",
                ocr_extracted_crn="CRN-2023-401",
                ocr_extracted_year="4th Year",
                ocr_confidence=0.97,
                encrypted_id_photo_path=enc_path,
                department="Computer Science",
                reputation_score=310
            ),
            User(
                username="vikram_alumni",
                email="vikram.aditya@gmail.com",
                crn="ALU-2024-001",
                college_id_card_number="ID-ALU-001",
                full_name="Vikram Aditya",
                hashed_password=get_password_hash("alumni123"),
                role=RoleEnum.PASSOUT,
                verified_year=None,
                is_verified=True,
                verification_status=VerificationStatus.ADMIN_APPROVED,
                ocr_extracted_name="Vikram Aditya",
                ocr_extracted_crn="ALU-2024-001",
                ocr_extracted_year="Batch of 2024",
                ocr_confidence=0.92,
                encrypted_id_photo_path=enc_path,
                department="Software Engineering @ Google",
                reputation_score=520
            ),
            User(
                username="dr_sharma",
                email="prof.sharma@college.edu",
                crn="FAC-CS-001",
                college_id_card_number="FAC-ID-001",
                full_name="Prof. Rajesh Sharma",
                hashed_password=get_password_hash("faculty123"),
                role=RoleEnum.FACULTY,
                verified_year=None,
                is_verified=True,
                verification_status=VerificationStatus.ADMIN_APPROVED,
                ocr_extracted_name="Rajesh Sharma",
                ocr_extracted_crn="FAC-CS-001",
                ocr_extracted_year="Department Head",
                ocr_confidence=0.99,
                encrypted_id_photo_path=enc_path,
                department="Computer Science & Engineering",
                reputation_score=850
            ),
            User(
                username="admin",
                email="admin@college.edu",
                crn="ADMIN-001",
                college_id_card_number="ADMIN-ID",
                full_name="Dean of Academics",
                hashed_password=get_password_hash("admin123"),
                role=RoleEnum.ADMIN,
                verified_year=None,
                is_verified=True,
                verification_status=VerificationStatus.ADMIN_APPROVED,
                ocr_confidence=1.0,
                department="Academic Administration",
                reputation_score=1000
            ),
            # Unverified student for testing the Admin Review Queue
            User(
                username="kavya_pending",
                email="kavya.nair@gmail.com",
                crn="CRN-2026-MISMATCH",
                college_id_card_number="ID-MISMATCH-99",
                full_name="Kavya Nair",
                hashed_password=get_password_hash("student123"),
                role=RoleEnum.STUDENT_1,
                verified_year=1,
                is_verified=False,
                verification_status=VerificationStatus.PENDING,
                ocr_extracted_name="Kavya Nair",
                ocr_extracted_crn="CRN-2026-UNREADABLE",
                ocr_extracted_year="1st Year",
                ocr_confidence=0.45,
                encrypted_id_photo_path=enc_path,
                department="Computer Science",
                reputation_score=0
            )
        ]

        db.add_all(users)
        await db.commit()

        # Seed Standard Flowchart Modules
        modules = [
            Module(
                code="subject_help",
                name="Subject Help",
                description="Subject-specific help for COA, Python, Data Structures, Theory of Computation, Digital Electronics, DSTL, etc.",
                is_custom=False
            ),
            Module(
                code="exam_prep",
                name="Exam Preparation",
                description="Curated notes, PYQs, high-frequency exam questions, and strategy guides.",
                is_custom=False
            ),
            Module(
                code="tech_skills",
                name="Technical Skills",
                description="Competitive coding, project development, Git workflows, and hackathon prep.",
                is_custom=False
            ),
            Module(
                code="career_guidance",
                name="Career Guidance",
                description="Placement roadmaps, internship applications, higher studies, and resume reviews.",
                is_custom=False
            ),
            Module(
                code="general_support",
                name="General Support",
                description="Peer notes sharing, collaborative group study, and doubt resolution.",
                is_custom=False
            ),
            Module(
                code="custom_ai_lab",
                name="Custom: Generative AI Research Lab",
                description="Student-faculty collaborative projects using Google Gemma 4 and LLM agents.",
                is_custom=True
            )
        ]
        db.add_all(modules)
        await db.commit()

        print("[SUCCESS] Database successfully seeded with 8 users and 6 flowchart modules!")

if __name__ == "__main__":
    asyncio.run(seed())
