# CampusConnect - Single College Community & Doubt Resolution Platform

**CampusConnect** is a responsive, mobile-first Progressive Web App (PWA) engineered for an individual college campus ("Apex Institute of Technology"). It features ID-verified sign-ups, academic year-segregated doubts, senior mentorship with automated anti-abuse star ratings and karma points, a strictly confidential administrative "Problem Box", and instant real-time campus broadcasts.

---

## 🏗 System Architecture & Technology Stack

- **Backend**: FastAPI (Python 3.14 async), SQLAlchemy ORM (PostgreSQL ready / SQLite zero-friction local), Pytest test harness.
- **Frontend**: Mobile-first React (Vite) + Tailwind CSS + PWA Service Worker (`sw.js`) and manifest (`manifest.json`).
- **Real-Time Layer**: Native WebSockets (`/ws/live/{user_id}` and `/ws/chat/{thread_id}`) for live alert pushes and 1-to-1 doubt chats.
- **File Storage**: S3-compatible private bucket storage with signed URLs and symmetric encrypted local vault fallback (`storage_service.py`).
- **AI Engine**: Google Gemma 4 (Multimodal) consolidated behind a unified `ai_service.py` module. AI strictly assists (match hints, OCR extraction, tag suggestions, safety scans) and never makes final decisions on verification, bans, or ratings.

---

## 🚀 Quick Setup & Run Instructions

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment (already set up in scratch/campusconnect/venv)
python -m venv ../venv
..\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Seed default administrative, faculty, and student profiles
python seeds.py

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```
API Documentation and interactive Swagger UI are available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite React PWA dev server
npm run dev
```
Open your browser at: `http://localhost:3000`

---

## 🤖 How to Point `ai_service` at the Google Gemma 4 Endpoint

All AI calls in CampusConnect route through `backend/app/services/ai_service.py`.

In `backend/.env`:
```env
# Google Cloud Vertex AI, Gemini API, or custom vLLM / HuggingFace TGI proxy
GEMMA4_API_KEY="your-google-api-key"
GEMMA4_API_URL="https://api.google.com/gemma4/v1"
GEMMA4_MODEL_NAME="gemma-4-multimodal"
```

### AI Responsibilities Matrix
1. **ID Card Pre-Check**: Extracts OCR text (Name, Batch, Year, CRN), cross-checks against student claims, and provides an advisory `MATCH` or `MISMATCH` hint to the admin. The admin makes the approval decision.
2. **Doubt OCR & Tag Auto-Suggestion**: OCRs problem photos, suggests academic subjects (Computer Science, Mathematics, Physics, Electrical) and relevant tags, and pre-screens for inappropriate content.
3. **Advisory "AI Hint"**: Generates a conceptual guidance hint clearly tagged as `[AI Hint by Gemma 4]` and excluded from leaderboards and point calculations.
4. **Problem Box Safety Screening**: Receives **ONLY the message text** (NO student identity, email, or name) to detect emergency, harassment, or self-harm triggers so urgent cases rise to the top of the admin queue.

---

## 🔑 Pre-Seeded Institutional Demo Accounts

| Role | Email | Password | Details & Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@apex.edu` | `Admin@123` | **2FA Code**: `888888`. Review ID queue, lock/promote years, access confidential Problem Box, broadcast alerts. |
| **Faculty Member** | `dr.sharma@apex.edu` | `Faculty@123` | Access to Premium Section + can answer lower-year doubts + publish alerts. |
| **PG Student** | `aravind.pg@apex.edu` | `Student@123` | Access to Premium Section (M.Tech AI) + answers undergraduate doubts. |
| **4th Year Senior** | `priya.4th@apex.edu` | `Student@123` | Locked Year 4. Answers Year 1-3 doubts, receives 1-5 star ratings and points. |
| **3rd Year Senior** | `rohit.3rd@apex.edu` | `Student@123` | Locked Year 3. |
| **1st Year Junior** | `ananya.1st@apex.edu` | `Student@123` | Locked Year 1. Asks questions, rates seniors after help. |
| **Pending Applicant** | `rahul.pending@apex.edu` | `Student@123` | Status: `PENDING`. Sees only "Waiting for ID Verification" screen until admin approves. |

---

## 🧪 Running the Automated Test Suite

```bash
cd backend
..\venv\Scripts\python -m pytest tests -v
```

Tests verify:
1. `test_access_rules.py`: Pending users blocked from protected endpoints; undergraduates blocked from Premium Section (403); PG and Faculty permitted; admin endpoints secured.
2. `test_locked_year.py`: Admin verification locks year permanently into user record; users cannot modify year; annual promotion via admin; one CRN/ID per account enforced.
3. `test_ratings_abuse.py`: Only asker can rate; only after senior replies; no self-rating; daily rating velocity limits; reciprocal 5-star trading caught and quarantined to moderator queue.
4. `test_problem_box_privacy.py`: General students cannot view admin queue; only Admin views identity; forwarding to authorities anonymizes payload; admin view/forward/reply actions logged in `admin_audit_log`.
