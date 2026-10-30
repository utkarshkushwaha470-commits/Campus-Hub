# 🎓 Campus Hub — Allenhouse Institute of Technology

> **Official Institutional Community, Academic Intelligence & Single-College Platform**  
> **Executive Director & Chief Administrator**: UTKARSH KUSHWAHA (`utkarshkushwaha470@gmail.com`)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_(Vite)-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite / SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy-D71F00.svg?logo=sqlite&logoColor=white)](https://www.sqlalchemy.org)
[![PWA](https://img.shields.io/badge/PWA-Progressive_Web_App-5A0FC8.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 📖 Overview

**Campus Hub** is a progressive web platform built specifically for **Allenhouse Institute of Technology**. Designed to unify campus academic discussions, senior mentorship, institutional verification, and executive faculty consultations:

* 👑 **Executive Command Center (Chief Administrator)**: Permanent institutional director authority held by **UTKARSH KUSHWAHA**. Features admin work oversight, student termination control, and appoint new admits.
* 💬 **Direct 1-on-1 Personal Chat**: Private executive communication line between Faculty/Staff Administrators and Chief Administrator Utkarsh Kushwaha. (Students are strictly excluded with 403 Forbidden protection).
* 🪪 **Physical College ID Card Verification**: One Roll Number / CRN = One Account. OCR assistance with administrative human-in-the-loop review.
* 🔒 **Academic Year-Locking**: Once verified, a student's academic year (Year 1, 2, 3, or 4) is permanently locked into their institutional profile.
* 🎓 **Senior Mentorship & Reputation Engine**: Senior students answer junior doubts, earn points and badges, protected by anti-abuse algorithms.
* 📬 **Confidential Problem Box**: Anonymized grievance and feedback portal with role-based routing.
* 🌐 **Multi-Device & Remote Access**: Instant access over local Wi-Fi / Hotspot (`0.0.0.0:8000`) or worldwide via Cloudflare Tunnel (`Share_Live_Worldwide.bat`).

---

## 🚀 1-Click Quick Start (Windows)

### Option 1: Double-Click Launcher (Easiest)
Simply double-click:
```bat
Start_Campus_Hub.bat
```
* Automatically prepares Python virtual environment (`venv`).
* Automatically frees port `8000` if previously locked.
* Automatically opens your default browser at **`http://localhost:8000`**.

### Option 2: Running in Background (Silent Mode)
Double-click:
```bat
Run_Background.bat
```
* Runs silently in the background without any open terminal window.
* Stop anytime by double-clicking `Stop_Campus_Hub.bat`.

### Option 3: Running inside VS Code
1. Open this repository folder in **VS Code**.
2. Press **`F5`** or open `run.py` and click the **Run (▷)** button.

---

## 💻 Manual Setup (Cross-Platform)

```bash
# 1. Clone repository
git clone https://github.com/utkarshkushwaha470-commits/Campus-Hub.git
cd Campus-Hub

# 2. Set up Python environment
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
python run.py
```

The application will be live at `http://localhost:8000`.

---

## 📱 Connecting from Another Laptop or Phone

### On the Same Wi-Fi / Hotspot:
1. Connect both devices to the same Wi-Fi or mobile hotspot.
2. On the other device's browser, enter:
   `http://<your-laptop-ip>:8000`  (e.g., `http://192.168.31.46:8000`)

### Anywhere over the Internet (Worldwide):
Double-click `Share_Live_Worldwide.bat` to generate a secure public HTTPS link.

---

## 🏛️ Project Structure

```
Campus-Hub/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy Database Models (User, Chat, Doubt, etc.)
│   │   ├── routers/       # FastAPI API Endpoints (Admin, Auth, Chat, etc.)
│   │   ├── schemas/       # Pydantic Schemas & Validators
│   │   ├── services/      # Business Logic & Auth Services
│   │   ├── database.py    # Database Session & SQLite/Postgres Engine
│   │   └── main.py        # Main ASGI Application & Middleware
│   ├── campusconnect.db   # Persistent SQLite Database
│   └── run.py             # Backend Server Runner
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, ProfileCard, Modals
│   │   ├── pages/         # Dashboard, ChiefFacultyChat, AdminVerification, etc.
│   │   └── services/      # Frontend API Service Layer
│   ├── dist/              # Production Web Assets
│   └── package.json
├── Start_Campus_Hub.bat    # 1-Click Windows Launcher
├── Run_Background.bat     # Background Silent Mode Launcher
├── Stop_Campus_Hub.bat    # 1-Click Shutdown Tool
├── Share_Live_Worldwide.bat # Public HTTPS Tunnel
├── requirements.txt       # Python Dependencies
└── run.py                 # Multi-Interface Server Launcher
```

---

## 👤 Author & Chief Administrator
**UTKARSH KUSHWAHA**  
Chief Administrator — Allenhouse Institute of Technology  
Email: `utkarshkushwaha470@gmail.com`
