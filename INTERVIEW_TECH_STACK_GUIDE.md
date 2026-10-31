# 🎓 Campus Hub — Master Technical Stack & Architectural Reference
> **Project**: Campus Hub (Institutional Academic Intelligence, Community & Grievance Platform)  
> **Institutional Authority / Chief Administrator**: UTKARSH KUSHWAHA  
> **Target College**: Allenhouse Institute of Technology  
> **Target Audience**: Technical Interviewers, System Design Panels & Engineering Recruiters

---

## 1. Executive Technical Summary (Elevator Pitch)

> *"Campus Hub is an enterprise-grade, mobile-first Progressive Web App (PWA) designed for single-college institutional intelligence. It solves cross-year academic mentorship, physical ID card verification, anonymous problem resolution, and direct executive administration using an asynchronous FastAPI backend, a responsive React 18 frontend, real-time WebSockets, SQLite/PostgreSQL with SQLAlchemy ORM, and privacy-preserving AI safety screening with Gemma 4."*

---

## 2. Core Technology Stack Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAMPUS HUB ARCHITECTURE                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴──────────────────────────────┐
    ▼                                                              ▼
┌───────────────────────────┐                  ┌───────────────────────────┐
│     FRONTEND CLIENT       │                  │      BACKEND SERVICE      │
│  React 18 + Vite + TW     │◄─── REST API ───►│   FastAPI (Asynchronous)  │
│  Progressive Web App(PWA) │◄── WebSockets ──►│   Uvicorn ASGI Server     │
│  HTML5 Geolocation (GPS)  │                  │   Pydantic V2 Validation  │
└───────────────────────────┘                  └─────────────┬─────────────┘
                                                             │
    ┌────────────────────────────────────────────────────────┴─────────────┐
    ▼                                                                      ▼
┌───────────────────────────┐                          ┌───────────────────────────┐
│    DATABASE & STORAGE     │                          │      AI & AUTOMATION      │
│  SQLite 3 / PostgreSQL    │                          │  Gemma 4 Multimodal Engine│
│  SQLAlchemy 2.0 ORM       │                          │  Tesseract OCR Vision     │
│  Partitioned Disk Storage │                          │  Cloudflare Edge Tunnels  │
└───────────────────────────┘                          └───────────────────────────┘
```

### A. Frontend Architecture
* **React 18 (SPA)**:
  * Component-driven modular architecture using modern React Hooks (`useState`, `useEffect`, `useRef`).
  * Instant single-page navigation without full page reloads.
  * Role-conditioned views (Chief Administrator, Faculty Administrator, Senior Student, Junior Student).
* **Vite 5**:
  * Next-generation build tool featuring native ESM (ECMAScript Modules) Hot Module Replacement (HMR).
  * Rollup-powered production bundling with **automated content hashing** (`assets/index-[hash].js`) to eliminate browser stale cache issues.
* **Tailwind CSS v3**:
  * Utility-first CSS engine with custom dark-mode glassmorphic theme (indigo/slate palette).
  * Responsive Flexbox and Grid layouts optimized across smartphone viewports, tablets, and desktop laptops.
* **Progressive Web App (PWA)**:
  * `manifest.json`: Configures standalone full-screen mobile app display, custom icons, and theme branding.
  * `sw.js` (Service Worker): Cache-First strategy for static assets, network fallback, and automatic cache invalidation.
* **HTML5 Geolocation API**:
  * `navigator.geolocation.getCurrentPosition` with high-accuracy GPS configuration for the real-time **WhatsApp-style Live Location sharing** in AskUp and Purpose Groups.
* **Web Audio API**:
  * Pure mathematical synthesizer audio chime oscillator (`AudioContext`) generating low-latency notification tones without any heavy external MP3/WAV dependencies.

---

### B. Backend Architecture
* **Python 3.11+ / 3.14**:
  * High-efficiency asynchronous programming language.
* **FastAPI**:
  * Modern, lightning-fast Python web framework built on top of Starlette and Pydantic.
  * Fully asynchronous request handling (`async`/`await`) capable of high concurrency.
  * Automatic OpenAPI/Swagger interactive documentation generation at `/docs`.
* **Uvicorn**:
  * Production-grade ASGI (Asynchronous Server Gateway Interface) web server.
* **Pydantic V2**:
  * Strict schema validation, automatic serialization, and request/response sanitization.
* **Authentication & Cryptography**:
  * **Passlib + Bcrypt**: Irreversible, salted cryptographic password hashing with adaptive work factor.
  * **Python-Jose (JWT)**: Stateless JSON Web Token authentication using HMAC-SHA256 signatures, carrying user role and claims.
  * **Device-Scoped OTP Engine**: 6-digit cryptographic verification codes for registration and password recovery.
* **WebSockets**:
  * Native bidirectional full-duplex WebSocket connections for live notifications, message delivery, and student-to-student DMs (`/ws/chat/{thread_id}` and `/ws/live/{user_id}`).
* **Starlette & Middlewares**:
  * **CORS Middleware**: Dynamic regex origin matching (`allow_origin_regex=r"https?://.*"`) allowing cross-origin requests from LAN Wi-Fi IPs, mobile hotspots, Cloudflare tunnels, and Vercel.
  * **Live Request Logger Middleware**: Custom HTTP middleware that intercepts requests and prints live incoming traffic with client IP to the server console.

---

### C. Database & Data Persistence
* **Database Engine**:
  * **SQLite 3 (`campusconnect.db`)**: Self-contained, zero-configuration, ACID-compliant relational database.
  * **Production PostgreSQL Compatibility**: Architecture uses standard SQL constructs and can switch to PostgreSQL (Neon, Supabase, or AWS RDS) by changing the single `DATABASE_URL` environment variable.
* **SQLAlchemy 2.0 (ORM)**:
  * Declarative database models with foreign key constraints, indexes, cascading deletes, and session management.
* **20 Relational Tables**:
  1. `users` — Student, Faculty, and Chief Admin institutional accounts.
  2. `id_verifications` — Roll number, college ID cards, OCR extraction, and verification workflow.
  3. `problem_box_messages` — Confidential grievances with role-based routing (Faculty vs. Administrator).
  4. `threads` — 1-on-1 AskUp direct message conversation rooms.
  5. `messages` — Chat messages, attachments, emoji reactions, and live GPS location links.
  6. `campus_groups` & `group_members` & `group_messages` — Institutional purpose task forces and committee directives.
  7. `queries` & `query_answers` — Year-locked academic mentorship questions and senior peer answers.
  8. `ratings` & `points_ledger` — Anti-abuse karma points, reputation scores, and badge allocations.
  9. `notifications` & `user_notification_reads` — WhatsApp-style unread notification tracking.
  10. `admin_audit_log` — Tamper-evident institutional audit trail logging administrator views, forwardings, and approvals.
  11. `chief_faculty_messages` — Secure, executive-only line between Chief Administrator and Faculty.

---

### D. Artificial Intelligence & Computer Vision Integration
* **Gemma 4 Multimodal & Gemini Engine**:
  * **Physical ID Card Verification**: Multimodal vision pipeline analyzing college ID photos to verify student names, roll numbers (CRN), and college affiliation seals.
  * **PII-Free Grievance Safety Screening**: Pre-screens Problem Box submissions to detect harassment, bullying, or mental health emergencies *without passing any student identity details* to preserve absolute privacy.
  * **Reputation & Anti-Abuse AI**: Analyzes senior answers to prevent academic plagiarism, toxicity, or gaming of points.
  * **Resilient Adapter Pattern**: Fallback logic ensures full app functionality even when cloud AI APIs have network timeouts or run offline.
* **Tesseract OCR (`pytesseract`)**:
  * Local image optical character recognition extracting alphanumeric enrollment numbers from uploaded card scans.

---

### E. Networking, Tunneling & Deployment
* **Cloudflare Tunnel (`cloudflared`)**:
  * Creates an outbound-only encrypted tunnel from port 8000 to Cloudflare edge networks without requiring router port-forwarding, static public IPs, or firewall holes.
  * Pre-ping DNS resolution verification to eliminate browser `NXDOMAIN` negative caching.
* **Vercel Cloud Deployment**:
  * Production deployment on Vercel's global CDN (`https://campus-hub-kappa.vercel.app`).
  * Serverless routing via `vercel.json` and resilient polling fallback for cloud serverless environments.
* **LAN Multi-Device Access**:
  * Dual-homed network binding on `0.0.0.0:8000`, allowing instant access across campus Wi-Fi or mobile hotspots (`http://192.168.x.x:8000`).

---

## 3. Top Interview Questions & How to Answer Them

### Q1: "Why did you choose FastAPI over Django or Flask?"
> **Answer**:
> *"FastAPI was selected for three technical reasons: first, its native asynchronous (`async`/`await`) architecture handles concurrent WebSocket connections and polling with extremely low overhead. Second, Pydantic integration enforces strict runtime schema validation, preventing malformed payloads. Third, FastAPI's built-in OpenAPI generator accelerates integration testing and documentation."*

### Q2: "How does real-time messaging work in your application?"
> **Answer**:
> *"We implemented a dual-layer messaging pipeline:
> 1. **Primary Layer**: Full-duplex WebSockets using Starlette's `WebSocketEndpoint`. Each active conversation room connects to `/ws/chat/{thread_id}`, while each logged-in student maintains a personal listener on `/ws/live/{user_id}` for incoming alerts and chimes.
> 2. **Fallback Layer**: A 2.5-second polling interval in the React client that ensures messages and unread badges synchronize seamlessly even when clients are on restrictive firewalls, mobile data, or low-power background tabs."*

### Q3: "How did you ensure student privacy in the Problem Box?"
> **Answer**:
> *"We designed a zero-leakage role-based privacy separation:
> When a problem is submitted to **Faculty**, the backend strips all student identifiers—name, email, roll number, and year—returning `Anonymous Student` and `[Protected]`. Only the **Chief Administrator** possesses clearance to view student identification, ensuring students can report sensitive academic issues without fear of retaliation."*

### Q4: "How does the live location feature work?"
> **Answer**:
> *"We utilized the browser's HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`) configured with high accuracy (`enableHighAccuracy: true`). When triggered, it grabs latitude and longitude coordinates, formats them into a standardized Google Maps location payload, and sends it over the chat WebSocket. The frontend recognizes the location format and renders an interactive WhatsApp-style Live Location Card with a direct navigation link."*

### Q5: "How does your notification system mimic WhatsApp?"
> **Answer**:
> *"Instead of static badge counts, the backend calculates dynamic unread records. In the React navbar, we maintain state-tracked view events (`seenSections`). When a user clicks or navigates into a section (like AskUp or Problem Box), that section's unread counter instantly resets to 0 and the badge completely disappears from view—reappearing only when a genuine new event occurs."*
