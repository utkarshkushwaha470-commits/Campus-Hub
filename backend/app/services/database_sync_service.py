import os
import sys
import sqlite3
import csv
import json
import threading
import time
import shutil
from datetime import datetime

_export_lock = threading.Lock()
_last_exported_mtime = 0.0

def get_target_directories():
    base_user = os.path.expanduser("~")
    dirs = [
        os.path.join(base_user, "Desktop", "Campus-Hub-Project", "Database"),
        r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\Database"
    ]
    brogrammers_dir = os.path.join(base_user, "Desktop", "Brogrammers-Allenhouse-Project", "Database")
    if os.path.exists(os.path.dirname(brogrammers_dir)):
        dirs.append(brogrammers_dir)
    return dirs

def get_database_path():
    candidates = [
        r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\backend\campusconnect.db",
        r"C:\Users\sssss\Desktop\Campus-Hub-Project\backend\campusconnect.db",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "campusconnect.db")
    ]
    # Pick the existing candidate with the latest modification time
    best = None
    best_mtime = -1
    for c in candidates:
        if os.path.exists(c):
            mt = os.path.getmtime(c)
            if mt > best_mtime:
                best_mtime = mt
                best = c
    return best or candidates[0]

def export_database_now():
    """
    Exports all active database tables directly to the File Explorer Database folder
    as CSV files and regenerates the SSMS (Microsoft SQL Server Management Studio)
    interactive HTML viewer with live timestamps.
    """
    global _last_exported_mtime
    if not _export_lock.acquire(blocking=False):
        return False

    try:
        db_path = get_database_path()
        if not os.path.exists(db_path):
            return False

        current_mtime = os.path.getmtime(db_path)
        target_dirs = get_target_directories()
        for d in target_dirs:
            os.makedirs(d, exist_ok=True)

        # Synchronize SQLite database file to Desktop project
        desktop_db = r"C:\Users\sssss\Desktop\Campus-Hub-Project\backend\campusconnect.db"
        if os.path.abspath(db_path) != os.path.abspath(desktop_db):
            try:
                os.makedirs(os.path.dirname(desktop_db), exist_ok=True)
                shutil.copy2(db_path, desktop_db)
            except Exception:
                pass

        conn = sqlite3.connect(db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # 1. ID Verifications & Approvals
        q_verifications = """
        SELECT 
            iv.id AS Request_ID,
            COALESCE(u.full_name, 'Unknown Student') AS Student_Name,
            COALESCE(u.email, '-') AS Student_Email,
            COALESCE(u.crn_or_roll_number, '-') AS CRN_Roll_No,
            COALESCE(u.batch, '-') AS Batch,
            COALESCE(u.locked_year, '-') AS Academic_Year,
            iv.status AS Clearance_Status,
            iv.created_at AS Request_Time,
            COALESCE(admin.full_name, 'UTKARSH KUSHWAHA (Chief Admin)') AS Approved_By_Admin,
            COALESCE(admin.email, 'utkarshkushwaha470@gmail.com') AS Admin_Email,
            COALESCE(iv.reviewed_at, iv.created_at) AS Approval_Time,
            COALESCE(iv.rejection_reason, 'None (Approved)') AS Remarks_or_Rejection_Reason,
            ROUND(COALESCE(iv.ocr_match_confidence, 0.95) * 100, 1) || '%' AS OCR_Confidence
        FROM id_verifications iv
        LEFT JOIN users u ON iv.user_id = u.id
        LEFT JOIN users admin ON iv.reviewed_by_admin_id = admin.id
        ORDER BY iv.created_at DESC;
        """
        cur.execute(q_verifications)
        verifications_rows = [dict(r) for r in cur.fetchall()]

        # 2. Users & Roles
        q_users = """
        SELECT 
            u.id AS User_ID,
            u.full_name AS Full_Name,
            u.email AS Institutional_Email,
            u.role AS Role,
            u.status AS Account_Status,
            COALESCE(u.locked_year, '-') AS Academic_Year,
            COALESCE(u.batch, '-') AS Batch,
            COALESCE(u.crn_or_roll_number, '-') AS CRN_Roll_Number,
            COALESCE(u.points, 0) AS Reputation_Points,
            COALESCE(u.level, 1) AS Scholar_Level,
            CASE WHEN u.is_chief_admin = 1 OR u.email = 'utkarshkushwaha470@gmail.com' THEN 'CHIEF ADMINISTRATOR' ELSE 'STANDARD' END AS Executive_Authority,
            u.created_at AS Registration_Time
        FROM users u
        ORDER BY u.created_at DESC;
        """
        cur.execute(q_users)
        users_rows = [dict(r) for r in cur.fetchall()]

        # 3. Problem Box Grievances & Replies
        q_problems = """
        SELECT 
            pb.id AS Grievance_ID,
            COALESCE(u.full_name, 'Student') AS Student_Name,
            COALESCE(u.email, '-') AS Student_Email,
            pb.recipient_role AS Target_Authority,
            pb.subject AS Grievance_Subject,
            pb.content_text AS Grievance_Description,
            pb.status AS Status,
            pb.created_at AS Submission_Time,
            'UTKARSH KUSHWAHA (Chief Admin)' AS Reviewing_Administrator,
            COALESCE(pb.admin_response_text, 'Pending Official Response') AS Admin_Response_Text,
            COALESCE(pb.replied_at, 'In Queue') AS Response_Time,
            COALESCE(pb.forwarded_to_name, 'Direct Admin Resolution') AS Forwarded_Authority,
            CASE WHEN pb.recipient_role = 'ADMINISTRATOR' THEN '🛡️ Administrator Only (Strictly Inaccessible to Faculty)' ELSE '🏫 Faculty Review (Student Identity Concealed)' END AS Privacy_Access_Rule,
            CASE WHEN pb.ai_safety_flag = 1 THEN '⚠️ URGENT SAFETY ALERT' ELSE 'Standard Grievance' END AS Safety_Level
        FROM problem_box_messages pb
        LEFT JOIN users u ON pb.student_id = u.id
        ORDER BY pb.created_at DESC;
        """
        cur.execute(q_problems)
        problems_rows = [dict(r) for r in cur.fetchall()]

        # 4. Ask_Up Direct Messages
        q_messages = """
        SELECT 
            m.id AS Message_ID,
            m.created_at AS Message_Timestamp,
            COALESCE(sender.full_name, 'Unknown Sender') AS Sender_Name,
            COALESCE(sender.role, 'STUDENT') AS Sender_Role,
            COALESCE(receiver.full_name, 'Recipient') AS Recipient_Name,
            COALESCE(receiver.role, 'STUDENT') AS Recipient_Role,
            m.content_text AS Message_Content,
            CASE WHEN m.content_text LIKE '%maps.google.com%' THEN '📍 LIVE GPS LOCATION' ELSE 'Text / Media' END AS Message_Type,
            CASE WHEN m.is_read = 1 THEN 'Seen / Read' ELSE 'Delivered' END AS Delivery_Status
        FROM messages m
        LEFT JOIN threads t ON m.thread_id = t.id
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON (CASE WHEN m.sender_id = t.student_id THEN t.senior_id ELSE t.student_id END) = receiver.id
        ORDER BY m.created_at DESC;
        """
        cur.execute(q_messages)
        messages_rows = [dict(r) for r in cur.fetchall()]

        # 5. Admin Audit Logs (Includes Login Requests, Approvals, System Events)
        q_audit = """
        SELECT 
            a.id AS Audit_Log_ID,
            a.created_at AS Real_Time_Timestamp,
            COALESCE(u.full_name, 'UTKARSH KUSHWAHA') AS Administrator_or_User_Name,
            a.action_type AS Institutional_Action,
            a.target_entity AS Target_Entity,
            COALESCE(a.target_id, '-') AS Target_ID,
            COALESCE(a.ip_address, '127.0.0.1') AS Client_IP_Address,
            COALESCE(a.details_json, '{}') AS Action_Metadata
        FROM admin_audit_log a
        LEFT JOIN users u ON a.admin_user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 500;
        """
        cur.execute(q_audit)
        audit_rows = [dict(r) for r in cur.fetchall()]

        # 6. Purpose Groups
        q_groups = """
        SELECT 
            g.id AS Group_ID,
            g.name AS Purpose_Group_Name,
            g.category AS Category,
            g.purpose AS Institutional_Mandate,
            g.created_at AS Created_Time,
            COALESCE(creator.full_name, 'UTKARSH KUSHWAHA (Chief Admin)') AS Founded_By,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS Active_Members_Count
        FROM campus_groups g
        LEFT JOIN users creator ON g.created_by_admin_id = creator.id
        ORDER BY g.created_at DESC;
        """
        cur.execute(q_groups)
        groups_rows = [dict(r) for r in cur.fetchall()]

        conn.close()

        def write_csv(filename, rows):
            if not rows:
                return
            keys = list(rows[0].keys())
            for target_dir in target_dirs:
                fpath = os.path.join(target_dir, filename)
                try:
                    with open(fpath, "w", newline="", encoding="utf-8") as f:
                        writer = csv.DictWriter(f, fieldnames=keys)
                        writer.writeheader()
                        writer.writerows(rows)
                except Exception:
                    pass

        write_csv("01_ID_Verification_and_Approvals.csv", verifications_rows)
        write_csv("02_Users_and_Institutional_Roles.csv", users_rows)
        write_csv("03_Problem_Box_Grievances_and_Admin_Replies.csv", problems_rows)
        write_csv("04_Ask_Up_Direct_Messages_and_Locations.csv", messages_rows)
        write_csv("05_Admin_Audit_Logs_Real_Time.csv", audit_rows)
        write_csv("06_Purpose_Groups_and_Members.csv", groups_rows)

        # Generate SSMS HTML Viewer
        tables_data = {
            "ID_Verifications_Approvals": verifications_rows,
            "Users_and_Roles": users_rows,
            "Problem_Box_Grievances": problems_rows,
            "Ask_Up_Direct_Messages": messages_rows,
            "Admin_Audit_Logs": audit_rows,
            "Purpose_Groups": groups_rows
        }

        json_payload = json.dumps(tables_data, indent=2, default=str)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="5">
<title>Microsoft SQL Server Management Studio - Campus Hub Central Database</title>
<style>
  * {{ box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; font-size: 11px; }}
  body {{ background-color: #ECE9D8; color: #000; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }}
  .title-bar {{ background: linear-gradient(to right, #0055EA 0%, #0864FF 50%, #3B8AFE 100%); color: white; padding: 3px 6px; font-weight: bold; font-size: 11px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #002D80; }}
  .menu-bar {{ background: #ECE9D8; border-bottom: 1px solid #D4D0C8; padding: 2px 4px; display: flex; gap: 8px; }}
  .menu-item {{ padding: 2px 5px; cursor: pointer; color: #000; }}
  .toolbar {{ background: #ECE9D8; border-bottom: 1px solid #999; padding: 3px 6px; display: flex; align-items: center; gap: 6px; }}
  .btn-tb {{ background: #ECE9D8; border: 1px solid #C4C0B8; padding: 2px 8px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border-radius: 2px; }}
  .btn-tb:hover {{ background: #DDE4EE; border-color: #316AC5; }}
  .tab-bar {{ display: flex; background: #D4D0C8; border-bottom: 1px solid #999; padding-left: 4px; gap: 2px; }}
  .tab {{ padding: 4px 10px; background: #ECE9D8; border: 1px solid #999; border-bottom: none; cursor: pointer; border-radius: 3px 3px 0 0; font-weight: normal; }}
  .tab.active {{ background: #FFF; font-weight: bold; border-top: 2px solid #D88000; }}
  .sql-editor {{ background: #FFF; border-bottom: 1px solid #999; padding: 6px 10px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; color: #000; height: 58px; overflow-y: auto; white-space: pre; line-height: 1.4; }}
  .sql-kw {{ color: #0000FF; font-weight: bold; }}
  .sql-fn {{ color: #FF00FF; }}
  .sql-str {{ color: #FF0000; }}
  .split-bar {{ background: #D4D0C8; height: 4px; cursor: row-resize; border-top: 1px solid #FFF; border-bottom: 1px solid #808080; }}
  .results-header {{ background: #ECE9D8; padding: 3px 8px; border-bottom: 1px solid #999; display: flex; align-items: center; justify-content: space-between; }}
  .results-tabs {{ display: flex; gap: 2px; }}
  .rtab {{ padding: 2px 8px; background: #FFF; border: 1px solid #999; border-bottom: none; font-weight: bold; }}
  .grid-container {{ flex: 1; background: #FFF; overflow: auto; position: relative; }}
  table {{ border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; }}
  th {{ background: #ECE9D8; color: #000; font-weight: 600; text-align: left; padding: 4px 8px; border-right: 1px solid #D4D0C8; border-bottom: 1px solid #999; position: sticky; top: 0; z-index: 2; white-space: nowrap; user-select: none; }}
  td {{ padding: 3px 8px; border-right: 1px solid #E0E0E0; border-bottom: 1px solid #E0E0E0; white-space: nowrap; max-width: 380px; overflow: hidden; text-overflow: ellipsis; }}
  tr:nth-child(even) {{ background: #F9F9F9; }}
  tr:hover {{ background: #DCE8F6 !important; }}
  .row-num {{ background: #ECE9D8; text-align: center; color: #444; width: 35px; border-right: 1px solid #999; font-weight: 500; }}
  .status-bar {{ background: #ECE9D8; border-top: 1px solid #999; padding: 2px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; }}
  .status-left {{ display: flex; align-items: center; gap: 6px; color: #006600; font-weight: bold; }}
  .status-right {{ display: flex; gap: 15px; color: #000; }}
  .live-badge {{ background: #28a745; color: white; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }}
</style>
</head>
<body>

<div class="title-bar">
  <div>Microsoft SQL Server Management Studio - [SQLQuery1.sql - CAMPUS-HUB-CENTRAL.master (UTKARSH KUSHWAHA (51))*]</div>
  <div style="font-size:10px;">Allenhouse Institute of Technology</div>
</div>

<div class="menu-bar">
  <div class="menu-item">File</div>
  <div class="menu-item">Edit</div>
  <div class="menu-item">View</div>
  <div class="menu-item">Query</div>
  <div class="menu-item">Project</div>
  <div class="menu-item">Tools</div>
  <div class="menu-item">Window</div>
  <div class="menu-item">Help</div>
</div>

<div class="toolbar">
  <button class="btn-tb" onclick="location.reload();"><b>! Execute (F5)</b></button>
  <button class="btn-tb" onclick="exportActiveToCsv();">💾 Export Selected CSV</button>
  <span style="border-left: 1px solid #999; height: 16px; margin: 0 4px;"></span>
  <span>Database: <b style="background:#FFF; padding:2px 6px; border:1px solid #999;">campusconnect_prod</b></span>
  <span style="border-left: 1px solid #999; height: 16px; margin: 0 4px;"></span>
  <span class="live-badge">● LIVE REAL-TIME SYNC: ACTIVE (5s)</span>
  <span style="color:#555; font-size:10px; margin-left:auto;">Last Synchronized: <b>{now_str}</b></span>
</div>

<div class="tab-bar">
  <div class="tab active" id="tab_ID_Verifications_Approvals" onclick="switchTable('ID_Verifications_Approvals')">01_ID_Verifications_Approvals</div>
  <div class="tab" id="tab_Users_and_Roles" onclick="switchTable('Users_and_Roles')">02_Users_and_Roles</div>
  <div class="tab" id="tab_Problem_Box_Grievances" onclick="switchTable('Problem_Box_Grievances')">03_Problem_Box_Grievances</div>
  <div class="tab" id="tab_Ask_Up_Direct_Messages" onclick="switchTable('Ask_Up_Direct_Messages')">04_Ask_Up_Direct_Messages</div>
  <div class="tab" id="tab_Admin_Audit_Logs" onclick="switchTable('Admin_Audit_Logs')">05_Admin_Audit_Logs</div>
  <div class="tab" id="tab_Purpose_Groups" onclick="switchTable('Purpose_Groups')">06_Purpose_Groups</div>
</div>

<div class="sql-editor" id="sqlBox"></div>

<div class="split-bar"></div>

<div class="results-header">
  <div class="results-tabs">
    <div class="rtab">Results</div>
  </div>
  <div id="recordCount" style="color:#333; font-weight:bold;">Loading records...</div>
</div>

<div class="grid-container">
  <table id="dataTable">
    <thead id="tableHead"></thead>
    <tbody id="tableBody"></tbody>
  </table>
</div>

<div class="status-bar">
  <div class="status-left">
    <span>✔ Query executed successfully.</span>
  </div>
  <div class="status-right">
    <span>HOST: <b>UTKARSH-LAPTOP</b></span>
    <span>ADMIN: <b>UTKARSH KUSHWAHA</b></span>
    <span>ROWS: <b id="statusRows">0</b></span>
    <span>TIME: <b>00:00:00</b></span>
  </div>
</div>

<script>
  const DB_DATA = {json_payload};
  let currentKey = "ID_Verifications_Approvals";

  const QUERIES = {{
    "ID_Verifications_Approvals": "<span class='sql-kw'>SELECT</span> iv.Request_ID, u.Student_Name, u.Student_Email, u.CRN_Roll_No, iv.Clearance_Status, iv.Request_Time, admin.Approved_By_Admin, iv.Approval_Time\\n<span class='sql-kw'>FROM</span> id_verifications iv <span class='sql-kw'>LEFT JOIN</span> users u <span class='sql-kw'>ON</span> iv.user_id = u.id\\n<span class='sql-kw'>ORDER BY</span> iv.created_at <span class='sql-kw'>DESC</span>;",
    "Users_and_Roles": "<span class='sql-kw'>SELECT</span> User_ID, Full_Name, Institutional_Email, Role, Account_Status, Academic_Year, CRN_Roll_Number, Executive_Authority, Registration_Time\\n<span class='sql-kw'>FROM</span> users\\n<span class='sql-kw'>ORDER BY</span> created_at <span class='sql-kw'>DESC</span>;",
    "Problem_Box_Grievances": "<span class='sql-kw'>SELECT</span> Grievance_ID, Student_Name, Target_Authority, Grievance_Subject, Status, Submission_Time, Reviewing_Administrator, Admin_Response_Text\\n<span class='sql-kw'>FROM</span> problem_box_messages\\n<span class='sql-kw'>ORDER BY</span> created_at <span class='sql-kw'>DESC</span>;",
    "Ask_Up_Direct_Messages": "<span class='sql-kw'>SELECT</span> Message_ID, Message_Timestamp, Sender_Name, Sender_Role, Recipient_Name, Message_Content, Message_Type, Delivery_Status\\n<span class='sql-kw'>FROM</span> messages\\n<span class='sql-kw'>ORDER BY</span> created_at <span class='sql-kw'>DESC</span>;",
    "Admin_Audit_Logs": "<span class='sql-kw'>SELECT</span> Audit_Log_ID, Real_Time_Timestamp, Administrator_or_User_Name, Institutional_Action, Target_Entity, Client_IP_Address, Action_Metadata\\n<span class='sql-kw'>FROM</span> admin_audit_log\\n<span class='sql-kw'>ORDER BY</span> created_at <span class='sql-kw'>DESC</span>;",
    "Purpose_Groups": "<span class='sql-kw'>SELECT</span> Group_ID, Purpose_Group_Name, Category, Institutional_Mandate, Founded_By, Active_Members_Count, Created_Time\\n<span class='sql-kw'>FROM</span> campus_groups\\n<span class='sql-kw'>ORDER BY</span> created_at <span class='sql-kw'>DESC</span>;"
  }};

  function switchTable(key) {{
    currentKey = key;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const t = document.getElementById('tab_' + key);
    if (t) t.classList.add('active');
    document.getElementById('sqlBox').innerHTML = QUERIES[key] || "<span class='sql-kw'>SELECT</span> * <span class='sql-kw'>FROM</span> " + key;
    renderGrid(key);
  }}

  function renderGrid(key) {{
    const rows = DB_DATA[key] || [];
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    const countEl = document.getElementById('recordCount');
    const statusRows = document.getElementById('statusRows');

    thead.innerHTML = '';
    tbody.innerHTML = '';
    countEl.innerText = rows.length + " rows in dataset (Real-Time Live)";
    statusRows.innerText = rows.length;

    if (rows.length === 0) {{
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">No records in table yet.</td></tr>';
      return;
    }}

    const cols = Object.keys(rows[0]);
    let headHtml = '<tr><th class="row-num"></th>';
    cols.forEach(c => {{
      headHtml += '<th>' + c + '</th>';
    }});
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    let bodyHtml = '';
    rows.forEach((r, idx) => {{
      bodyHtml += '<tr><td class="row-num">' + (idx + 1) + '</td>';
      cols.forEach(c => {{
        const val = r[c] !== null && r[c] !== undefined ? String(r[c]) : '';
        bodyHtml += '<td title="' + val.replace(/"/g, '&quot;') + '">' + val + '</td>';
      }});
      bodyHtml += '</tr>';
    }});
    tbody.innerHTML = bodyHtml;
  }}

  function exportActiveToCsv() {{
    const rows = DB_DATA[currentKey] || [];
    if (!rows.length) return alert('No data to export!');
    const keys = Object.keys(rows[0]);
    let csvContent = 'data:text/csv;charset=utf-8,' + keys.join(',') + '\\n';
    rows.forEach(r => {{
      const line = keys.map(k => '"' + String(r[k] || '').replace(/"/g, '""') + '"').join(',');
      csvContent += line + '\\n';
    }});
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', currentKey + '_Live_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}

  switchTable(currentKey);
</script>
</body>
</html>
"""
        for target_dir in target_dirs:
            html_path = os.path.join(target_dir, "Database_Viewer.html")
            try:
                with open(html_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
            except Exception:
                pass

        _last_exported_mtime = current_mtime
        return True
    except Exception as e:
        print(f"[Database Sync] Error during live export: {e}", flush=True)
        return False
    finally:
        _export_lock.release()

def trigger_async_database_sync():
    threading.Thread(target=export_database_now, daemon=True).start()

def start_continuous_database_watcher():
    def _watcher_loop():
        global _last_exported_mtime
        time.sleep(1)
        export_database_now()
        while True:
            try:
                time.sleep(2.0)
                db_path = get_database_path()
                if os.path.exists(db_path):
                    mtime = os.path.getmtime(db_path)
                    if mtime > _last_exported_mtime:
                        export_database_now()
            except Exception:
                pass

    t = threading.Thread(target=_watcher_loop, daemon=True)
    t.start()
