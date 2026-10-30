# 1. Update backend/app/routers/admin.py
with open('backend/app/routers/admin.py', 'r', encoding='utf-8') as f:
    backend_content = f.read()

old_backend = '''    admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.created_at.asc()).all()'''

new_backend = '''    is_chief = current_admin.email.lower() == "utkarshkushwaha470@gmail.com" or getattr(current_admin, "is_chief_admin", False)
    query = db.query(User).filter(User.role == UserRole.ADMIN)
    if not is_chief:
        # Normal sub-admins cannot view pending registering admins or clearance queue
        query = query.filter(User.status == AccountStatus.APPROVED)
    admins = query.order_by(User.created_at.asc()).all()'''

assert old_backend in backend_content, "Backend target not found"
backend_content = backend_content.replace(old_backend, new_backend)

with open('backend/app/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(backend_content)

print("Updated backend/app/routers/admin.py successfully.")

# 2. Update frontend/src/pages/AdminVerificationPage.jsx
with open('frontend/src/pages/AdminVerificationPage.jsx', 'r', encoding='utf-8') as f:
    fe_content = f.read()

# Remove pending badge from normal sub-admin tab button
old_subadmin_tab = '''            <>
              <button
                onClick={() => { setActiveTab('chief-deck'); loadAdmins(); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'chief-deck' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>🛡️</span>
                <span>Administrators</span>
                {adminsList.filter(a => a.status === 'PENDING').length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black ml-1">
                    {adminsList.filter(a => a.status === 'PENDING').length} Pending
                  </span>
                )}
              </button>'''

new_subadmin_tab = '''            <>
              <button
                onClick={() => { setActiveTab('chief-deck'); loadAdmins(); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'chief-deck' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>🛡️</span>
                <span>Administrators</span>
              </button>'''

assert old_subadmin_tab in fe_content, "Frontend tab target not found"
fe_content = fe_content.replace(old_subadmin_tab, new_subadmin_tab)

# Update sub-admin header subtitle
old_header_sub = '''                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🛡️ Institutional Administrators & Requests Roster</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Official roster of college administrators and pending registration clearance requests. Clearance approval and appointment authority is held exclusively by Chief Administrator <strong>UTKARSH KUSHWAHA</strong>.
                </p>'''

new_header_sub = '''                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🛡️ Institutional Administrators Roster</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Official roster of appointed college administrators holding platform credentials. Platform governance and appointments are held exclusively by Chief Administrator <strong>UTKARSH KUSHWAHA</strong>.
                </p>'''

assert old_header_sub in fe_content, "Frontend header target not found"
fe_content = fe_content.replace(old_header_sub, new_header_sub)

# Ensure Section 1 (Pending Clearance Queue) is ONLY visible to Chief Admin (Utkarsh Kushwaha)
old_section1_start = '''          {/* ================= SECTION 1: PENDING ADMINISTRATOR CLEARANCE REQUESTS ================= */}
          {pendingAdminRequests.length > 0 ? ('''

new_section1_start = '''          {/* ================= SECTION 1: PENDING ADMINISTRATOR CLEARANCE REQUESTS (CHIEF ADMIN ONLY) ================= */}
          {isChiefAdmin && (pendingAdminRequests.length > 0 ? ('''

assert old_section1_start in fe_content, "Section 1 start target not found"
fe_content = fe_content.replace(old_section1_start, new_section1_start)

old_section1_end = '''              <button
                onClick={loadAdmins}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ↻ Refresh
              </button>
            </div>
          )}'''

new_section1_end = '''              <button
                onClick={loadAdmins}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ↻ Refresh
              </button>
            </div>
          ))}'''

assert old_section1_end in fe_content, "Section 1 end target not found"
fe_content = fe_content.replace(old_section1_end, new_section1_end)

with open('frontend/src/pages/AdminVerificationPage.jsx', 'w', encoding='utf-8') as f:
    f.write(fe_content)

print("Updated frontend/src/pages/AdminVerificationPage.jsx successfully.")
