# Brogrammers — Allenhouse Institute of Technology

> **Official Single-College Collaborative Community & Academic Intelligence Platform**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_(Vite)-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite / SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy-D71F00.svg?logo=sqlite&logoColor=white)](https://www.sqlalchemy.org)
[![PWA](https://img.shields.io/badge/PWA-Progressive_Web_App-5A0FC8.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)]()

---

## 📖 Overview

**Brogrammers** is a mobile-first, single-college progressive web platform engineered specifically for **Allenhouse Institute of Technology**. Designed to unify campus academic discussions, peer mentorship, and administrative oversight under strict privacy, security, and verification rules:

- 🪪 **Physical College ID Card Verification**: One Roll Number / CRN = One Account. Physical college ID card upload with AI OCR assistance and administrative human-in-the-loop review.
- 🔒 **Permanent Academic Year-Locking**: Once verified, a student's year level (Year 1, 2, 3, or 4) is permanently locked into their verified institutional profile. Students can only browse their allowed curriculum modules.
- 🎓 **Senior Mentorship & Reputation Engine**: Senior students (Years 3 & 4) answer junior doubts, earn reputation points and badges, subject to anti-abuse algorithmic checks (no self-rating, reciprocal vote-trading detection).
- 🛡️ **Chief Administrator Executive Command Center**: Permanent platform director authority held by **UTKARSH KUSHWAHA** (`utkarshkushwaha470@gmail.com`). Normal sub-administrators can never view new registering admins or the clearance queue. Comprehensive chronological **Work Dossier** provides student details oversight (Legal Name, Roll Number, Email, Batch).
- 📬 **Confidential Problem Box**: Anonymized grievance and whistleblowing portal with role-based forwarding to Deans, HODs, and Directors.
- 🔑 **"Forgot Password" OTP Email Recovery**: Password recovery via secure 6-digit OTP dispatched to registered college email, authorizing immediate login upon verification.
- 🏢 **Company Demo Sandbox**: Interactive 1-click read-only evaluation accounts for live company presentations (Year 1–4 students, Faculty, and Chief Admin) with simulated persona names and mutation protection.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | FastAPI (Python 3 async), Uvicorn ASGI Server, Pydantic v2 |
| **Database & ORM** | SQLAlchemy 2.0 with SQLite (Zero-friction local) / PostgreSQL ready |
| **Frontend UI** | React 18, Vite 5, Tailwind CSS, Heroicons / Modern Glassmorphism |
| **Security & Auth** | JWT Bearer Tokens, Bcrypt password hashing, Multi-Tier Admin Proof Passphrases |
| **Real-Time Layer** | Native WebSockets (`/ws/live/{user_id}` and `/ws/chat/{thread_id}`) |
| **Test Suite** | Pytest, Pytest-Asyncio, Starlette TestClient (17 automated tests) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10+ installed
- **Node.js**: 18+ installed

### 1. Clone & Set Up

```bash
# Clone the repository
git clone https://github.com/<your-username>/brogrammers-allenhouse.git
cd brogrammers-allenhouse

# Set up Python virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies & build bundle
cd frontend
npm install
npm run build
cd ..
```

### 2. Launch Platform (Single-Command Run)

```bash
python run.py
```
Open **`http://localhost:8000`** in your browser. The single server automatically serves the compiled mobile-first React PWA alongside the interactive FastAPI endpoints.

- **Interactive API Swagger Docs**: `http://localhost:8000/docs`
- **Interactive ReDoc**: `http://localhost:8000/redoc`

---

## 🔑 Accounts Reference

### 1. Real Administrator Clearance
- **Chief Administrator**:
  - Name: **UTKARSH KUSHWAHA**
  - Email: `utkarshkushwaha470@gmail.com`
  - Access: Supreme administrative command deck, clearance queue, work dossier oversight, multi-admin management.

### 2. Company Presentation Demo Accounts (Read-Only Sandboxes)
Prepared for live company evaluators and recruiters with simulated persona names:

| Persona | Demo Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| 🛡️ **Demo Chief Admin (Prototype)** | `demo.chief@brogrammers.local` | `Demo@123` | Simulated Chief Admin Executive Deck (Proof: `demoproof2026`) |
| 👨‍🏫 **Demo Faculty Professor (Dr. Sample)** | `demo.faculty@brogrammers.local` | `Demo@123` | Faculty Problem Box & Advisory View |
| ⭐ **Demo Student - 4th Year Senior** | `demo.student4@brogrammers.local` | `Demo@123` | Senior Mentoring & Reputation Sandbox |
| 🎓 **Demo Student - 3rd Year Senior** | `demo.student3@brogrammers.local` | `Demo@123` | Upperclassman Discussion Sandbox |
| 📘 **Demo Student - 2nd Year Sophomore** | `demo.student2@brogrammers.local` | `Demo@123` | Year 2 Curriculum & Peer Sandbox |
| 🌱 **Demo Student - 1st Year Junior** | `demo.student1@brogrammers.local` | `Demo@123` | Freshman Questioning & Mentee Sandbox |

---

## 🧪 Automated Testing

Run the automated test suite across access rules, rating abuse prevention, locked years, and admin clearance:

```bash
pytest backend/tests -v
```

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy Database Models (User, Query, Chat, Audit)
│   │   ├── routers/           # FastAPI Route Handlers (Auth, Admin, Queries, Chat)
│   │   ├── schemas/           # Pydantic v2 Request & Response Models
│   │   ├── services/          # Business logic (Auth, Storage, AI, Audit)
│   │   ├── config.py          # College institutional configuration
│   │   ├── database.py        # Database engine & sessionmaker
│   │   └── main.py            # FastAPI entry point & WebSocket manager
│   ├── tests/                 # Automated pytest test suites
│   ├── requirements.txt       # Python dependencies
│   └── seeds.py               # Institutional demo seeder
├── frontend/
│   ├── public/                # Favicon, PWA manifest, service worker
│   ├── src/
│   │   ├── components/        # Reusable UI components (Navbar, Chat, etc.)
│   │   ├── pages/             # Route views (LoginPage, SignUpPage, AdminVerificationPage)
│   │   ├── services/          # API communication client
│   │   ├── App.jsx            # Top-level state and routing
│   │   └── main.jsx           # React DOM root
│   ├── package.json           # Node.js dependencies & build scripts
│   └── vite.config.js         # Vite PWA build configuration
├── .gitignore                 # Git ignore rules
├── requirements.txt           # Root Python dependency manifest
├── run.py                     # Single-command application launcher
└── README.md                  # Project documentation
```

---

## 🛡️ License & Copyright
Developed for **Allenhouse Institute of Technology**. All rights reserved.
Chief Administrative Director: **UTKARSH KUSHWAHA**.
