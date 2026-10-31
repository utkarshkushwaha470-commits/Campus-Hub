# 🌐 How to Connect to Chief Administrator UTKARSH KUSHWAHA's Live Server

**Project:** Campus Hub  
**Institution:** Allenhouse Institute of Technology  
**Chief Administrator:** UTKARSH KUSHWAHA (`utkarshkushwaha470@gmail.com`)  

---

## 🚀 Overview
When Chief Administrator **UTKARSH KUSHWAHA** runs the Campus Hub server on his laptop, anyone anywhere in the world can connect to it. All student registrations, faculty accounts, AskUp direct messages, live GPS location pins, and Problem Box grievances will sync directly to Utkarsh's database in real time.

---

## Method 1: Instant 1-Click Access (No Installation Required!)
You do **not** need to install Python, Node.js, or Git to access Campus Hub.

1. Open the live public link shared by Utkarsh Kushwaha in any browser (mobile phone, laptop, or tablet):
   ```text
   https://<assigned-name>.trycloudflare.com
   ```
2. **Sign In or Register** with your college details.
3. Every message you send in **AskUp**, problem you report in **Problem Box**, or location you share will appear on Utkarsh Kushwaha's screen instantly!

---

## Method 2: If You Cloned This Repository from GitHub
If you downloaded or cloned this GitHub repository onto your laptop:

1. Look in the main folder for `LIVE_SERVER_URL.txt` or get Utkarsh's active link.
2. Double-click:
   ```cmd
   Connect_To_Chief_Admin_Server.bat
   ```
3. The script will automatically detect Utkarsh's live link, configure your frontend `.env`, and launch Campus Hub in your browser connected to Utkarsh's live database.

---

## Method 3: Same Wi-Fi / Hotspot (Campus / Classroom)
If you are connected to the same Wi-Fi router or mobile hotspot as Utkarsh's laptop:
- Open your phone or laptop browser and go to:
  ```text
  http://<UTKARSH_LAN_IP>:8000
  ```
  *(Example: `http://192.168.31.46:8000`)*
- Zero internet data consumed; 100% instant local network speed!

---

## 🗄️ Database Inspection & Real-Time Records
All real-time submissions are recorded in the central database:
- Open the `Database` folder to inspect the live CSV exports:
  - `01_ID_Verification_and_Approvals.csv` (Student requests, approver `UTKARSH KUSHWAHA`, and timestamps)
  - `02_Users_and_Institutional_Roles.csv`
  - `03_Problem_Box_Grievances_and_Admin_Replies.csv`
  - `04_AskUp_Direct_Messages_and_Locations.csv`
  - `05_Admin_Audit_Logs_Real_Time.csv`
- Double-click `Open_Database_Viewer.bat` to launch the **SQL Server Management Studio (SSMS)** style interactive grid viewer!
