import os
import sys
import sqlite3
import csv
import json
from datetime import datetime

# Path setup
PROJECT_DIR = r"C:\Users\sssss\Desktop\Campus-Hub-Project"
DATABASE_DIR = os.path.join(PROJECT_DIR, "Database")
SCRATCH_DIR = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect"
SCRATCH_DB_DIR = os.path.join(SCRATCH_DIR, "Database")

os.makedirs(DATABASE_DIR, exist_ok=True)
os.makedirs(SCRATCH_DB_DIR, exist_ok=True)

db_path = os.path.join(PROJECT_DIR, "backend", "campusconnect.db")
if not os.path.exists(db_path):
    db_path = os.path.join(SCRATCH_DIR, "backend", "campusconnect.db")

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# -----------------------------------------------------------------------------
# 1. ID Verifications & Approvals
# -----------------------------------------------------------------------------
q_verifications = """
SELECT 
    iv.id AS Request_ID,
    u.full_name AS Student_Name,
    u.email AS Student_Email,
    u.crn_or_roll_number AS CRN_Roll_No,
    u.batch AS Batch,
    u.locked_year AS Academic_Year,
    iv.status AS Clearance_Status,
    iv.created_at AS Request_Time,
    COALESCE(admin.full_name, 'UTKARSH KUSHWAHA (Chief Admin)') AS Approved_By_Admin,
    COALESCE(admin.email, 'utkarshkushwaha470@gmail.com') AS Admin_Email,
    COALESCE(iv.reviewed_at, iv.created_at) AS Approval_Time,
    COALESCE(iv.rejection_reason, 'None (Approved)') AS Remarks_or_Rejection_Reason,
    ROUND(iv.ocr_match_confidence * 100, 1) || '%' AS OCR_Confidence
FROM id_verifications iv
LEFT JOIN users u ON iv.user_id = u.id
LEFT JOIN users admin ON iv.reviewed_by_admin_id = admin.id
ORDER BY iv.created_at DESC;
"""
cur.execute(q_verifications)
verifications_rows = [dict(r) for r in cur.fetchall()]

# -----------------------------------------------------------------------------
# 2. Users & Roles
# -----------------------------------------------------------------------------
q_users = """
SELECT 
    u.id AS User_ID,
    u.full_name AS Full_Name,
    u.email AS Institutional_Email,
    u.role AS Role,
    u.status AS Account_Status,
    COALESCE(u.locked_year, '-') AS Academic_Year,
    u.batch AS Batch,
    u.crn_or_roll_number AS CRN_Roll_Number,
    u.points AS Reputation_Points,
    u.level AS Scholar_Level,
    CASE WHEN u.is_chief_admin = 1 OR u.email = 'utkarshkushwaha470@gmail.com' THEN 'CHIEF ADMINISTRATOR' ELSE 'STANDARD' END AS Executive_Authority,
    u.created_at AS Registration_Time
FROM users u
ORDER BY u.created_at DESC;
"""
cur.execute(q_users)
users_rows = [dict(r) for r in cur.fetchall()]

# -----------------------------------------------------------------------------
# 3. Problem Box Grievances & Replies
# -----------------------------------------------------------------------------
q_problems = """
SELECT 
    pb.id AS Grievance_ID,
    u.full_name AS Student_Name,
    u.email AS Student_Email,
    pb.recipient_role AS Target_Authority,
    pb.subject AS Grievance_Subject,
    pb.content_text AS Grievance_Description,
    pb.status AS Status,
    pb.created_at AS Submission_Time,
    'UTKARSH KUSHWAHA (Chief Admin)' AS Reviewing_Administrator,
    COALESCE(pb.admin_response_text, 'Pending Official Response') AS Admin_Response_Text,
    COALESCE(pb.replied_at, 'In Queue') AS Response_Time,
    COALESCE(pb.forwarded_to_name, 'Direct Admin Resolution') AS Forwarded_Authority,
    CASE WHEN pb.ai_safety_flag = 1 THEN '⚠️ URGENT SAFETY ALERT' ELSE 'Standard Grievance' END AS Safety_Level
FROM problem_box_messages pb
LEFT JOIN users u ON pb.student_id = u.id
ORDER BY pb.created_at DESC;
"""
cur.execute(q_problems)
problems_rows = [dict(r) for r in cur.fetchall()]

# -----------------------------------------------------------------------------
# 4. AskUp Direct Messages
# -----------------------------------------------------------------------------
q_messages = """
SELECT 
    m.id AS Message_ID,
    m.created_at AS Message_Timestamp,
    sender.full_name AS Sender_Name,
    sender.role AS Sender_Role,
    receiver.full_name AS Recipient_Name,
    receiver.role AS Recipient_Role,
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

# -----------------------------------------------------------------------------
# 5. Admin Audit Logs
# -----------------------------------------------------------------------------
q_audit = """
SELECT 
    a.id AS Audit_Log_ID,
    a.created_at AS Real_Time_Timestamp,
    COALESCE(u.full_name, 'UTKARSH KUSHWAHA') AS Administrator_Name,
    a.action_type AS Institutional_Action,
    a.target_entity AS Target_Entity,
    a.target_id AS Target_ID,
    a.ip_address AS Client_IP_Address,
    a.details_json AS Action_Metadata
FROM admin_audit_log a
LEFT JOIN users u ON a.admin_user_id = u.id
ORDER BY a.created_at DESC
LIMIT 500;
"""
cur.execute(q_audit)
audit_rows = [dict(r) for r in cur.fetchall()]

# -----------------------------------------------------------------------------
# 6. Purpose Groups
# -----------------------------------------------------------------------------
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

# Export CSV helper
def export_csv(filename, rows):
    if not rows:
        return
    keys = list(rows[0].keys())
    for target_dir in [DATABASE_DIR, SCRATCH_DB_DIR]:
        fpath = os.path.join(target_dir, filename)
        with open(fpath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Exported: {fpath} ({len(rows)} rows)")

export_csv("01_ID_Verification_and_Approvals.csv", verifications_rows)
export_csv("02_Users_and_Institutional_Roles.csv", users_rows)
export_csv("03_Problem_Box_Grievances_and_Admin_Replies.csv", problems_rows)
export_csv("04_AskUp_Direct_Messages_and_Locations.csv", messages_rows)
export_csv("05_Admin_Audit_Logs_Real_Time.csv", audit_rows)
export_csv("06_Purpose_Groups_and_Members.csv", groups_rows)

# -----------------------------------------------------------------------------
# Generate Interactive SSMS-Style HTML Database Viewer
# -----------------------------------------------------------------------------
tables_data = {
    "ID_Verifications_Approvals": verifications_rows,
    "Users_and_Roles": users_rows,
    "Problem_Box_Grievances": problems_rows,
    "AskUp_Direct_Messages": messages_rows,
    "Admin_Audit_Logs": audit_rows,
    "Purpose_Groups": groups_rows
}

json_payload = json.dumps(tables_data, indent=2, default=str)

html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Microsoft SQL Server Management Studio - Campus Hub Database</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }}
    body {{
      background: #ECE9D8;
      color: #000;
      font-size: 11px;
      overflow-x: hidden;
    }}
    /* Top SSMS Menu Bar */
    .ssms-menu-bar {{
      background: #F0F0F0;
      border-bottom: 1px solid #D0D0D0;
      padding: 3px 8px;
      display: flex;
      gap: 14px;
      font-size: 11px;
      color: #333;
    }}
    .ssms-menu-bar span:hover {{
      background: #B4D5FE;
      cursor: pointer;
    }}
    /* Standard SSMS Toolbar */
    .ssms-toolbar {{
      background: linear-gradient(to bottom, #F7F7F7, #EAEAEA);
      border-bottom: 1px solid #C0C0C0;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .btn-execute {{
      background: linear-gradient(to bottom, #E8F8E8, #C8E8C8);
      border: 1px solid #60A060;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: bold;
      color: #105010;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      border-radius: 2px;
    }}
    .btn-execute:hover {{
      background: #B8F0B8;
    }}
    .db-dropdown {{
      font-size: 11px;
      padding: 2px 6px;
      border: 1px solid #A0A0A0;
      background: #FFF;
    }}
    .query-tab-strip {{
      background: #D8D2BD;
      padding: 4px 6px 0 6px;
      display: flex;
      gap: 2px;
      border-bottom: 1px solid #999;
    }}
    .query-tab {{
      background: #FFF;
      border: 1px solid #999;
      border-bottom: none;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: bold;
      color: #000;
      display: flex;
      align-items: center;
      gap: 6px;
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
    }}
    /* Query Box */
    .query-box {{
      background: #FFF;
      border-bottom: 2px solid #808080;
      padding: 8px 12px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      color: #0000FF;
      height: 65px;
      overflow-y: auto;
      white-space: pre;
    }}
    .query-box span.kw {{ color: #0000FF; font-weight: bold; }}
    .query-box span.tbl {{ color: #008080; font-weight: bold; }}
    .query-box span.cm {{ color: #008000; font-style: italic; }}

    /* Splitter / Results Bar */
    .results-tab-bar {{
      background: #EAE6D6;
      border-bottom: 1px solid #A0A0A0;
      padding: 3px 6px 0 6px;
      display: flex;
      gap: 4px;
    }}
    .tab-btn {{
      background: #E0DCBC;
      border: 1px solid #A0A0A0;
      border-bottom: none;
      padding: 3px 12px;
      font-size: 11px;
      cursor: pointer;
    }}
    .tab-btn.active {{
      background: #FFF;
      font-weight: bold;
    }}

    /* Controls Bar: Table Picker & Filter */
    .table-selector-bar {{
      background: #F5F3E8;
      border-bottom: 1px solid #C8C4B0;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }}
    .table-pills {{
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }}
    .pill-btn {{
      background: #FFF;
      border: 1px solid #9B9885;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      border-radius: 2px;
    }}
    .pill-btn.active {{
      background: #1B58B8;
      color: #FFF;
      font-weight: bold;
      border-color: #0D3C8A;
    }}
    .search-input {{
      padding: 3px 8px;
      border: 1px solid #A0A0A0;
      font-size: 11px;
      width: 240px;
    }}

    /* SSMS Data Grid */
    .grid-container {{
      background: #FFF;
      overflow: auto;
      height: calc(100vh - 215px);
      border: 1px solid #808080;
    }}
    table.ssms-grid {{
      border-collapse: collapse;
      width: 100%;
      min-width: 900px;
      font-size: 11px;
    }}
    table.ssms-grid th {{
      background: linear-gradient(to bottom, #F9F9F9, #E6E6E6);
      border: 1px solid #A0A0A0;
      padding: 4px 8px;
      text-align: left;
      font-weight: 600;
      color: #222;
      position: sticky;
      top: 0;
      z-index: 5;
      white-space: nowrap;
    }}
    table.ssms-grid td {{
      border: 1px solid #D0D0D0;
      padding: 3px 7px;
      white-space: nowrap;
      color: #111;
    }}
    table.ssms-grid tr:nth-child(even) {{
      background: #FAFAFA;
    }}
    table.ssms-grid tr:hover {{
      background: #D9EAFE !important;
    }}
    table.ssms-grid td.row-num {{
      background: #ECE9D8;
      border-right: 1px solid #A0A0A0;
      font-weight: bold;
      color: #444;
      text-align: right;
      width: 35px;
      user-select: none;
    }}
    .badge-approved {{
      background: #D4EDDA;
      color: #155724;
      padding: 1px 5px;
      border: 1px solid #C3E6CB;
      border-radius: 2px;
      font-weight: bold;
      font-size: 10px;
    }}
    .badge-rejected {{
      background: #F8D7DA;
      color: #721C24;
      padding: 1px 5px;
      border: 1px solid #F5C6CB;
      border-radius: 2px;
      font-weight: bold;
      font-size: 10px;
    }}
    .badge-admin {{
      background: #FFF3CD;
      color: #856404;
      padding: 1px 5px;
      border: 1px solid #FFEEBA;
      border-radius: 2px;
      font-weight: bold;
      font-size: 10px;
    }}

    /* SSMS Yellow Execution Status Bar */
    .ssms-status-bar {{
      background: #FFF7B2;
      border-top: 1px solid #D8C860;
      padding: 3px 10px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #4A4000;
      font-weight: 500;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 24px;
    }}
    .ssms-status-bar .right-info {{
      display: flex;
      gap: 15px;
    }}
  </style>
</head>
<body>

  <!-- Top Menu -->
  <div class="ssms-menu-bar">
    <span>File</span>
    <span>Edit</span>
    <span>View</span>
    <span>Query</span>
    <span>Project</span>
    <span>Tools</span>
    <span>Window</span>
    <span>Community</span>
    <span>Help</span>
  </div>

  <!-- Main SSMS Toolbar -->
  <div class="ssms-toolbar">
    <button class="btn-execute" onclick="executeCurrentQuery()">
      <span>▶</span> Execute
    </button>
    <span style="color:#888;">|</span>
    <span>Available Databases:</span>
    <select class="db-dropdown">
      <option>CampusHub_Production (SQLite 3)</option>
      <option>Allenhouse_CampusConnect</option>
    </select>
    <span style="color:#888;">|</span>
    <button class="pill-btn" onclick="exportActiveTableToCSV()">⬇ Export Current Table to CSV</button>
    <button class="pill-btn" onclick="window.location.reload()">🔄 Refresh Real-Time Data</button>
  </div>

  <!-- Query Tab Strip -->
  <div class="query-tab-strip">
    <div class="query-tab">
      <span>SQLQuery1.sql - UTKARSH KUSHWAHA (Chief Administrator)*</span>
    </div>
  </div>

  <!-- Query Editor Box -->
  <div class="query-box" id="queryBox">
<span class="kw">SELECT</span> * <span class="kw">FROM</span> <span class="tbl" id="sqlTableLabel">ID_Verifications_Approvals</span>
<span class="kw">ORDER BY</span> Request_Time <span class="kw">DESC</span>;
<span class="cm">-- Chief Administrator Clearance: UTKARSH KUSHWAHA (Institutional Director Authority)</span>
  </div>

  <!-- Results Bar -->
  <div class="results-tab-bar">
    <button class="tab-btn active" id="resultsTabBtn">Results</button>
    <button class="tab-btn" onclick="showMessagesTab()">Messages</button>
  </div>

  <!-- Table Selector Bar -->
  <div class="table-selector-bar">
    <div class="table-pills">
      <button class="pill-btn active" onclick="switchTable('ID_Verifications_Approvals', this)">📋 ID Verifications & Approvals</button>
      <button class="pill-btn" onclick="switchTable('Users_and_Roles', this)">👤 Users & Access Roles</button>
      <button class="pill-btn" onclick="switchTable('Problem_Box_Grievances', this)">📬 Problem Box & Replies</button>
      <button class="pill-btn" onclick="switchTable('AskUp_Direct_Messages', this)">💬 AskUp Messages & Locations</button>
      <button class="pill-btn" onclick="switchTable('Admin_Audit_Logs', this)">🛡️ Real-Time Audit Logs</button>
      <button class="pill-btn" onclick="switchTable('Purpose_Groups', this)">🏛️ Purpose Groups & Rosters</button>
    </div>
    <input type="text" id="searchInput" class="search-input" placeholder="🔍 Search records (Name, Roll, Status, Admin)..." onkeyup="filterGrid()">
  </div>

  <!-- SSMS Grid Container -->
  <div class="grid-container">
    <table class="ssms-grid" id="dataGrid">
      <thead id="gridHead"></thead>
      <tbody id="gridBody"></tbody>
    </table>
  </div>

  <!-- Bottom SSMS Status Bar matching screenshot -->
  <div class="ssms-status-bar">
    <div>
      <span style="color:#008000; font-weight:bold;">✓ Query executed successfully.</span>
    </div>
    <div class="right-info">
      <span>SERVER: UTKARSH-LAPTOP (Port 8000)</span>
      <span>USER: UTKARSH KUSHWAHA (Chief Admin)</span>
      <span>DB: CampusHub</span>
      <span>TIME: 00:00:00</span>
      <span id="rowCountLabel">0 rows</span>
    </div>
  </div>

  <script>
    const databaseData = {json_payload};
    let currentTableKey = 'ID_Verifications_Approvals';

    function renderTable(tableKey, filterText = '') {{
      currentTableKey = tableKey;
      const rows = databaseData[tableKey] || [];
      const thead = document.getElementById('gridHead');
      const tbody = document.getElementById('gridBody');
      const sqlLabel = document.getElementById('sqlTableLabel');
      const rowCountLabel = document.getElementById('rowCountLabel');

      if (sqlLabel) sqlLabel.innerText = tableKey;

      thead.innerHTML = '';
      tbody.innerHTML = '';

      if (rows.length === 0) {{
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">No records found.</td></tr>';
        rowCountLabel.innerText = '0 rows';
        return;
      }}

      // Columns
      const columns = Object.keys(rows[0]);
      let trHead = '<tr><th style="width:35px; text-align:right;">#</th>';
      columns.forEach(col => {{
        trHead += `<th>${{col.replace(/_/g, ' ')}}</th>`;
      }});
      trHead += '</tr>';
      thead.innerHTML = trHead;

      // Filter
      const lowerFilter = filterText.toLowerCase().trim();
      let displayedCount = 0;

      rows.forEach((row, idx) => {{
        // Match filter
        if (lowerFilter) {{
          const match = Object.values(row).some(v => String(v || '').toLowerCase().includes(lowerFilter));
          if (!match) return;
        }}

        displayedCount++;
        let tr = `<tr><td class="row-num">${{displayedCount}}</td>`;
        columns.forEach(col => {{
          let val = row[col];
          if (val === null || val === undefined) val = '<span style="color:#888;">NULL</span>';

          // Formatting badges
          if (val === 'APPROVED') {{
            val = '<span class="badge-approved">APPROVED</span>';
          }} else if (val === 'REJECTED') {{
            val = '<span class="badge-rejected">REJECTED</span>';
          }} else if (val === 'CHIEF ADMINISTRATOR' || String(val).includes('Chief Admin')) {{
            val = `<span class="badge-admin">${{val}}</span>`;
          }} else if (String(val).includes('maps.google.com')) {{
            const link = String(val).match(/https:\\/\\/maps\\.google\\.com[^\\s\\)]+/);
            if (link) {{
              val = `📍 <a href="${{link[0]}}" target="_blank" style="color:#0066CC; font-weight:bold;">Open Live Location ➔</a>`;
            }}
          }}

          tr += `<td>${{val}}</td>`;
        }});
        tr += '</tr>';
        tbody.innerHTML += tr;
      }});

      rowCountLabel.innerText = `${{displayedCount}} rows`;
    }}

    function switchTable(tableKey, btnElement) {{
      document.querySelectorAll('.table-pills .pill-btn').forEach(b => b.classList.remove('active'));
      if (btnElement) btnElement.classList.add('active');
      document.getElementById('searchInput').value = '';
      renderTable(tableKey);
    }}

    function filterGrid() {{
      const filter = document.getElementById('searchInput').value;
      renderTable(currentTableKey, filter);
    }}

    function executeCurrentQuery() {{
      const flash = document.getElementById('queryBox');
      flash.style.background = '#FFFFE0';
      setTimeout(() => {{
        flash.style.background = '#FFF';
        renderTable(currentTableKey);
      }}, 250);
    }}

    function showMessagesTab() {{
      alert('Total 6 database tables active in memory. Connected to SQLite central repository.');
    }}

    function exportActiveTableToCSV() {{
      const rows = databaseData[currentTableKey] || [];
      if (rows.length === 0) return;
      const keys = Object.keys(rows[0]);
      let csvContent = 'data:text/csv;charset=utf-8,' + keys.join(',') + '\\n';
      rows.forEach(r => {{
        csvContent += keys.map(k => `"${{String(r[k] || '').replace(/"/g, '""')}}"`).join(',') + '\\n';
      }});
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${{currentTableKey}}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }}

    // Initial load
    renderTable('ID_Verifications_Approvals');
  </script>
</body>
</html>
"""

for target_dir in [DATABASE_DIR, SCRATCH_DB_DIR]:
    html_path = os.path.join(target_dir, "Database_Viewer.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_template)
    print(f"Generated HTML Viewer: {html_path}")

print("All database records and SSMS-style viewer successfully generated!")
