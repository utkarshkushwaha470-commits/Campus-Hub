import os
import re

page_path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\pages\AdminVerificationPage.jsx"
with open(page_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Faculty Modal States
state_insert = """  // Faculty Appointment State (Chief Admin Exclusive)
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [facultyDept, setFacultyDept] = useState('Computer Science & Engineering');
  const [showFacultyPassword, setShowFacultyPassword] = useState(false);
  const [facultyActionLoading, setFacultyActionLoading] = useState(false);
"""

if "showFacultyModal" not in code:
    code = code.replace("  const [showAdminModal, setShowAdminModal] = useState(false);",
                        "  const [showAdminModal, setShowAdminModal] = useState(false);\n" + state_insert)

# 2. Add handleAppointFaculty function
handler_code = """  const handleAppointFaculty = async (e) => {
    e.preventDefault();
    if (!facultyName.trim() || !facultyEmail.trim() || !facultyPassword) {
      alert('Please fill in Name, Email, and Password for the Faculty member.');
      return;
    }
    setFacultyActionLoading(true);
    try {
      const res = await api.appointFaculty({
        full_name: facultyName.trim(),
        email: facultyEmail.trim(),
        password: facultyPassword,
        department: facultyDept.trim()
      });
      showStatus(res.message);
      setFacultyName('');
      setFacultyEmail('');
      setFacultyPassword('');
      setShowFacultyModal(false);
      loadAdmins();
    } catch (err) {
      alert(err.message || 'Failed to appoint faculty member.');
    } finally {
      setFacultyActionLoading(false);
    }
  };
"""

if "handleAppointFaculty" not in code:
    code = code.replace("  const handleCreateAdmin = async (e) => {", handler_code + "\n  const handleCreateAdmin = async (e) => {")

# 3. Add Appoint Faculty Button in header
buttons_target = """              <button
                onClick={() => setShowAdminModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <span>+</span>
                <span>Appoint New Administrator</span>
              </button>"""

buttons_replacement = """              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowFacultyModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>🎓</span>
                  <span>Appoint Faculty Directly</span>
                </button>
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>👑</span>
                  <span>Appoint New Administrator</span>
                </button>
              </div>"""

if "Appoint Faculty Directly" not in code:
    code = code.replace(buttons_target, buttons_replacement)

# 4. Add Faculty Modal at the end of the page (next to Admin modal)
faculty_modal = """      {/* ================= MODAL: APPOINT FACULTY MEMBER (CHIEF ADMIN EXCLUSIVE) ================= */}
      {showFacultyModal && isChiefAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎓</span>
                <h4 className="font-bold text-white text-sm">Appoint Faculty Member Directly</h4>
              </div>
              <button
                onClick={() => setShowFacultyModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              As Chief Administrator, appointing faculty gives them verified institutional mentor status to guide students and oversee academic queries.
            </p>

            <form onSubmit={handleAppointFaculty} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Faculty Legal Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="e.g. Dr. Arvind Verma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Institutional Email Address <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  placeholder="e.g. arvind.verma@allenhouse.local"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department / Academic Branch <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={facultyDept}
                  onChange={(e) => setFacultyDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Artificial Intelligence & ML">Artificial Intelligence & ML</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Applied Sciences & Humanities">Applied Sciences & Humanities</option>
                  <option value="Management & Commerce">Management & Commerce</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Temporary Password <span className="text-emerald-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFacultyPassword(!showFacultyPassword)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono"
                  >
                    {showFacultyPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <input
                  type={showFacultyPassword ? 'text' : 'password'}
                  required
                  value={facultyPassword}
                  onChange={(e) => setFacultyPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  The faculty member can change their password anytime after signing in.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFacultyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={facultyActionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {facultyActionLoading ? 'Appointing...' : 'Appoint & Activate Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""

if "MODAL: APPOINT FACULTY MEMBER" not in code:
    code = code.replace("{/* ================= MODAL: APPOINT NEW ADMINISTRATOR (CHIEF ADMIN EXCLUSIVE) ================= */}",
                        faculty_modal + "\n      {/* ================= MODAL: APPOINT NEW ADMINISTRATOR (CHIEF ADMIN EXCLUSIVE) ================= */}")

with open(page_path, "w", encoding="utf-8") as f:
    f.write(code)

print("AdminVerificationPage updated with Appoint Faculty feature!")
