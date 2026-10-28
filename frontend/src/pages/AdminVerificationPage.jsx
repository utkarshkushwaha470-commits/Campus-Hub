import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminVerificationPage({ user }) {
  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'students' | 'groups' | 'problem-box' | 'notifications' | 'audit'
  
  // ID Verification Queue State
  const [verifications, setVerifications] = useState([]);
  const [verifFilter, setVerifFilter] = useState('PENDING');
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [overrideYears, setOverrideYears] = useState({});
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);

  // Student Directory & Termination State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('ALL');
  const [studentYearFilter, setStudentYearFilter] = useState('');
  const [selectedStudentForTerm, setSelectedStudentForTerm] = useState(null);
  const [termReason, setTermReason] = useState('');
  const [studentPromoteYears, setStudentPromoteYears] = useState({});

  // Purpose Groups State
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMsgText, setGroupMsgText] = useState('');
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPurpose, setNewGroupPurpose] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('SPECIAL_PURPOSE');
  const [newGroupSelectedMembers, setNewGroupSelectedMembers] = useState([]);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  // Problem Box Queue State
  const [problemMessages, setProblemMessages] = useState([]);
  const [forwardTargets, setForwardTargets] = useState({});
  const [replyTexts, setReplyTexts] = useState({});

  // Broadcast Alert State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTargetType, setNotifTargetType] = useState('ALL');
  const [notifTargetYear, setNotifTargetYear] = useState(1);
  const [notifTargetBatch, setNotifTargetBatch] = useState('2026-2030');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (activeTab === 'verifications') loadVerifications();
    else if (activeTab === 'students') loadStudents();
    else if (activeTab === 'groups') loadGroups();
    else if (activeTab === 'problem-box') loadProblemBoxQueue();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, verifFilter, studentStatusFilter, studentYearFilter]);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const data = await api.listAdminVerifications(verifFilter);
      setVerifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.listAllStudents(
        studentSearch,
        studentStatusFilter,
        studentYearFilter,
        'ALL'
      );
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await api.listGroups();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (groupId) => {
    try {
      const details = await api.getGroupDetails(groupId);
      setSelectedGroup(details);
      const msgs = await api.getGroupMessages(groupId);
      setGroupMessages(msgs);
    } catch (err) {
      alert(err.message || 'Error loading group details');
    }
  };

  const loadProblemBoxQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getProblemBoxAdminQueue();
      setProblemMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await api.getAdminAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ID Verification Handlers
  const handleReview = async (verifId, action) => {
    try {
      const reason = rejectionReasons[verifId] || '';
      const year = overrideYears[verifId] || null;
      const res = await api.reviewVerification(verifId, action, reason, year);
      showStatus(res.message);
      loadVerifications();
    } catch (err) {
      alert(err.message || 'Verification action error');
    }
  };

  // Student Management & Termination Handlers
  const handleTerminateStudent = async () => {
    if (!selectedStudentForTerm) return;
    if (!termReason.trim()) {
      alert('Please state a valid institutional reason for account termination.');
      return;
    }
    try {
      const res = await api.terminateStudent(selectedStudentForTerm.id, termReason);
      showStatus(`✓ ${res.message}`);
      setSelectedStudentForTerm(null);
      setTermReason('');
      loadStudents();
    } catch (err) {
      alert(err.message || 'Failed to terminate student account.');
    }
  };

  const handleReinstateStudent = async (student) => {
    if (!confirm(`Reinstate ${student.full_name} (${student.crn_or_roll_number}) back to APPROVED status?`)) return;
    try {
      const res = await api.reinstateStudent(student.id, 'Administrative review reinstatement');
      showStatus(`✓ ${res.message}`);
      loadStudents();
    } catch (err) {
      alert(err.message || 'Failed to reinstate student.');
    }
  };

  const handlePromoteStudentYear = async (studentId) => {
    const targetYear = studentPromoteYears[studentId];
    if (!targetYear) {
      alert('Please select the target academic year.');
      return;
    }
    try {
      const res = await api.promoteStudentYear(studentId, targetYear);
      showStatus(`✓ ${res.message}`);
      loadStudents();
    } catch (err) {
      alert(err.message || 'Year promotion failed.');
    }
  };

  // Group Creation & Messaging Handlers
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupPurpose.trim()) {
      alert('Please provide both a group name and a specific purpose directive.');
      return;
    }
    try {
      const res = await api.createGroup({
        name: newGroupName.trim(),
        purpose: newGroupPurpose.trim(),
        category: newGroupCategory,
        member_ids: newGroupSelectedMembers
      });
      showStatus(`✓ ${res.message}`);
      setCreateGroupModalOpen(false);
      setNewGroupName('');
      setNewGroupPurpose('');
      setNewGroupSelectedMembers([]);
      loadGroups();
    } catch (err) {
      alert(err.message || 'Error creating purpose group');
    }
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !groupMsgText.trim()) return;
    try {
      await api.postGroupMessage(selectedGroup.id, groupMsgText.trim());
      setGroupMsgText('');
      const msgs = await api.getGroupMessages(selectedGroup.id);
      setGroupMessages(msgs);
    } catch (err) {
      alert(err.message || 'Failed to post message');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !addMemberUserId) return;
    try {
      const res = await api.addGroupMember(selectedGroup.id, addMemberUserId);
      showStatus(`✓ ${res.message}`);
      setAddMemberUserId('');
      loadGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err.message || 'Error adding member');
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!selectedGroup) return;
    if (!confirm('Remove this student from the purpose group?')) return;
    try {
      const res = await api.removeGroupMember(selectedGroup.id, memberUserId);
      showStatus(`✓ ${res.message}`);
      loadGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err.message || 'Error removing member');
    }
  };

  // Problem Box Handlers
  const handleForwardProblem = async (msgId) => {
    const target = forwardTargets[msgId] || 'Dean of Academics';
    try {
      await api.forwardProblemBox(msgId, target);
      showStatus(`✓ Anonymized content dispatched to ${target}. Student identity concealed.`);
      loadProblemBoxQueue();
    } catch (err) {
      alert(err.message || 'Forward error');
    }
  };

  const handleReplyProblem = async (msgId) => {
    const text = replyTexts[msgId] || '';
    if (!text.trim()) {
      alert('Reply message cannot be empty.');
      return;
    }
    try {
      await api.replyProblemBox(msgId, text);
      showStatus('✓ Official institutional reply dispatched to student inbox.');
      setReplyTexts({ ...replyTexts, [msgId]: '' });
      loadProblemBoxQueue();
    } catch (err) {
      alert(err.message || 'Reply error');
    }
  };

  // Publish Alert Handler
  const handlePublishNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) {
      alert('Please fill in alert title and content.');
      return;
    }
    try {
      const payload = {
        title: notifTitle,
        body: notifBody,
        target_type: notifTargetType,
        target_year: notifTargetType === 'YEAR' ? notifTargetYear : null,
        target_batch: notifTargetType === 'BATCH' ? notifTargetBatch : null,
        is_broadcast: notifTargetType === 'ALL'
      };
      await api.publishNotification(payload);
      showStatus('✓ Broadcast alert published and transmitted across campus WebSockets.');
      setNotifTitle('');
      setNotifBody('');
    } catch (err) {
      alert(err.message || 'Notification error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/40">
              Administrative Control Deck
            </span>
            <span className="text-xs text-slate-400 font-semibold">• 2FA Authenticated</span>
          </div>
          <h2 className="text-xl font-bold text-white">College Admin Management Portal</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Student Management & Termination • Purpose Groups • ID OCR Review • Problem Box • WebSocket Alerts
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'verifications' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🪪 ID Queue
          </button>
          <button
            onClick={() => { setActiveTab('students'); loadStudents(); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'students' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 All Students
          </button>
          <button
            onClick={() => { setActiveTab('groups'); loadGroups(); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'groups' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏛️ Purpose Groups
          </button>
          <button
            onClick={() => setActiveTab('problem-box')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'problem-box' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📬 Problem Box
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'notifications' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📢 Alerts
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Audit Logs
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/60 text-amber-300 text-xs shadow-lg flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {/* ================= TAB 1: ID VERIFICATION QUEUE ================= */}
      {activeTab === 'verifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Pending Student ID Verifications</h3>
              <p className="text-xs text-slate-400">
                Gemma 4 assists with OCR extraction and matching hints. Admin makes the binding approval decision.
              </p>
            </div>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setVerifFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    verifFilter === st ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading ID queue...</div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No verification records in {verifFilter} status.
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map((v) => (
                <div key={v.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{v.student_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Email: {v.student_email}</span>
                        <span>•</span>
                        <span>CRN: <strong className="text-slate-200">{v.claimed_crn}</strong></span>
                        <span>•</span>
                        <span>Batch: <strong className="text-slate-200">{v.claimed_batch}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        v.ocr_hint_status === 'MATCH'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
                      }`}>
                        Gemma 4 OCR Hint: {v.ocr_hint_status} ({Math.round((v.ocr_match_confidence || 0) * 100)}% conf)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>OCR Extracted Name: <strong className="text-white">{v.ocr_extracted_name || 'N/A'}</strong></div>
                    <div>OCR Extracted Batch: <strong className="text-white">{v.ocr_extracted_batch || 'N/A'}</strong></div>
                    <div>OCR Detected Year: <strong className="text-white">Year {v.ocr_extracted_year || 1}</strong></div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoModal(`/api/admin/verifications/${v.id}/photo`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      Inspect Decrypted ID Photo
                    </button>

                    {v.status === 'PENDING' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={overrideYears[v.id] || v.ocr_extracted_year || 1}
                          onChange={(e) => setOverrideYears({ ...overrideYears, [v.id]: Number(e.target.value) })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
                        >
                          <option value={1}>Lock Year 1</option>
                          <option value={2}>Lock Year 2</option>
                          <option value={3}>Lock Year 3</option>
                          <option value={4}>Lock Year 4</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleReview(v.id, 'APPROVE')}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Approve & Lock Year
                        </button>

                        <input
                          type="text"
                          placeholder="Rejection reason..."
                          value={rejectionReasons[v.id] || ''}
                          onChange={(e) => setRejectionReasons({ ...rejectionReasons, [v.id]: e.target.value })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs w-44"
                        />

                        <button
                          type="button"
                          onClick={() => handleReview(v.id, 'REJECT')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ALL STUDENTS & TERMINATION CONTROL ================= */}
      {activeTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>👥 Campus Student Directory & Account Authority</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {students.length} Total
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Full institutional access: view student profiles, academic years, CRNs, promote years, or terminate accounts.
              </p>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search name, CRN, email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadStudents()}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs w-48 focus:border-amber-500 outline-none"
              />
              <button
                onClick={loadStudents}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Search
              </button>

              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="TERMINATED">Terminated</option>
                <option value="PENDING">Pending Verification</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={studentYearFilter}
                onChange={(e) => setStudentYearFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold"
              >
                <option value="">All Academic Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
          </div>

          {/* Student Roster Table */}
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500">Loading student directory...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No students found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">CRN / Roll</th>
                    <th className="py-3 px-3">Locked Year</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Points</th>
                    <th className="py-3 px-3 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                            {st.full_name ? st.full_name[0] : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm leading-tight">{st.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{st.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 font-semibold">{st.crn_or_roll_number}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {st.locked_year ? (
                          <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 font-bold">
                            Year {st.locked_year}
                          </span>
                        ) : (
                          <span className="text-slate-500">{st.role}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{st.batch}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          st.status === 'APPROVED' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' :
                          st.status === 'TERMINATED' || st.status === 'BANNED' ? 'bg-rose-950 text-rose-300 border-rose-800 font-extrabold' :
                          st.status === 'PENDING' ? 'bg-amber-950/60 text-amber-300 border-amber-800/40' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {st.status === 'TERMINATED' ? '⛔ TERMINATED' : st.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-mono font-bold">
                        ⭐ {st.points} (Lv {st.level})
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Year Promotion Selector for approved students */}
                          {st.status === 'APPROVED' && st.locked_year && (
                            <div className="flex items-center gap-1">
                              <select
                                value={studentPromoteYears[st.id] || st.locked_year + 1}
                                onChange={(e) => setStudentPromoteYears({ ...studentPromoteYears, [st.id]: Number(e.target.value) })}
                                className="px-1.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300"
                              >
                                <option value={1}>Y1</option>
                                <option value={2}>Y2</option>
                                <option value={3}>Y3</option>
                                <option value={4}>Y4</option>
                              </select>
                              <button
                                onClick={() => handlePromoteStudentYear(st.id)}
                                title="Promote Student Academic Year"
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                              >
                                Promote
                              </button>
                            </div>
                          )}

                          {/* Terminate vs Reinstate Button */}
                          {st.status === 'TERMINATED' ? (
                            <button
                              onClick={() => handleReinstateStudent(st)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                            >
                              ♻️ Reinstate
                            </button>
                          ) : st.role !== 'ADMIN' ? (
                            <button
                              onClick={() => setSelectedStudentForTerm(st)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow"
                            >
                              ⛔ Terminate Student
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PURPOSE GROUPS HUB ================= */}
      {activeTab === 'groups' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>🏛️ Campus Purpose Groups & Task Forces</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {groups.length} Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Form targeted groups for specific purposes (Placement Cell, Committees, Club Core, Disciplinary). Assign students and communicate directives.
              </p>
            </div>

            <button
              onClick={() => {
                setCreateGroupModalOpen(true);
                loadStudents();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 flex items-center gap-1.5 self-start"
            >
              <span>+</span>
              <span>Create New Group for Specific Purpose</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Groups List */}
            <div className="lg:col-span-1 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">All College Groups</h4>
              {groups.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 italic">
                  No groups created yet. Click above to create one.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => loadGroupDetails(g.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedGroup?.id === g.id
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-amber-300">
                          {g.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          👥 {g.member_count} Members
                        </span>
                      </div>
                      <h5 className="font-bold text-white text-sm">{g.name}</h5>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{g.purpose}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Group Workspace & Discussion Feed */}
            <div className="lg:col-span-2">
              {selectedGroup ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  {/* Group Header Banner */}
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {selectedGroup.category}
                          </span>
                          <span className="text-[11px] text-slate-400">Created by: {selectedGroup.created_by_name}</span>
                        </div>
                        <h4 className="text-lg font-bold text-white mt-1">{selectedGroup.name}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={addMemberUserId}
                          onChange={(e) => setAddMemberUserId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                        >
                          <option value="">+ Add Student to Group</option>
                          {students.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.full_name} ({st.crn_or_roll_number})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddMember}
                          disabled={!addMemberUserId}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Purpose Callout */}
                    <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <strong className="text-amber-400 font-semibold block mb-0.5">Specific Group Purpose & Directive:</strong>
                      <p className="text-slate-300 leading-relaxed">{selectedGroup.purpose}</p>
                    </div>

                    {/* Enrolled Members Chip List */}
                    <div className="mt-3">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1.5">Enrolled Group Roster:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedGroup.members?.map((m) => (
                          <div
                            key={m.membership_id}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
                          >
                            <span className="font-semibold text-white">{m.full_name}</span>
                            <span className="text-[10px] text-slate-400">({m.crn_or_roll_number || m.role})</span>
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-amber-300 font-bold uppercase">{m.role_in_group}</span>
                            {m.user_id !== user.id && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                title="Remove member"
                                className="text-slate-500 hover:text-rose-400 text-xs font-bold ml-1"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Group Discussion Feed */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Group Communication & Directives</h5>
                    <div className="h-64 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      {groupMessages.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-xs italic">
                          No messages in this group yet. Post an announcement or discussion topic below.
                        </div>
                      ) : (
                        groupMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl text-xs max-w-[85%] ${
                              m.sender_role === 'ADMIN'
                                ? 'bg-amber-950/40 border border-amber-800/60 text-slate-200 mr-auto'
                                : m.is_me
                                ? 'bg-blue-600 text-white ml-auto'
                                : 'bg-slate-800 text-slate-200 mr-auto'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-[11px] text-amber-300">
                                {m.sender_name} {m.sender_role === 'ADMIN' ? '👑 (Admin Directive)' : ''}
                              </span>
                              <span className="text-[10px] opacity-60">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="leading-relaxed">{m.content_text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Post Message Input Form */}
                    <form onSubmit={handleSendGroupMessage} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Post group message, directive, or announcement..."
                        value={groupMsgText}
                        onChange={(e) => setGroupMsgText(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={!groupMsgText.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs"
                      >
                        Send Post
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-2xl mb-2">🏛️</div>
                  <h4 className="font-bold text-white text-sm">Select a Group to Inspect</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Select any purpose group from the left panel to review its members, directives, and participate in discussion.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PROBLEM BOX QUEUE ================= */}
      {activeTab === 'problem-box' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">Confidential Problem Box (Admin Eyes Only)</h3>
            <p className="text-xs text-slate-400">
              Only the admin can see student identity. Forwarding anonymizes student details before reaching Dean/Director.
            </p>
          </div>

          <div className="space-y-4">
            {problemMessages.map((msg) => (
              <div key={msg.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800/40">
                      Target: {msg.recipient_role}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{msg.subject}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-amber-400 font-bold block">Sender: {msg.sender_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({msg.sender_email} • {msg.sender_crn})</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60 text-xs text-slate-200 whitespace-pre-wrap">
                  {msg.content_text}
                </div>

                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300 flex items-center justify-between">
                  <span>Gemma 4 Privacy Analysis: {msg.ai_urgency_summary}</span>
                  <span className="font-bold">Urgency: {msg.ai_urgency_level}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={forwardTargets[msg.id] || 'Dean of Academics'}
                      onChange={(e) => setForwardTargets({ ...forwardTargets, [msg.id]: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                    >
                      <option value="Dean of Academics">Dean of Academics</option>
                      <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                      <option value="College Director">College Director</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleForwardProblem(msg.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      Forward Anonymized
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                    <input
                      type="text"
                      placeholder="Official direct reply to student..."
                      value={replyTexts[msg.id] || ''}
                      onChange={(e) => setReplyTexts({ ...replyTexts, [msg.id]: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleReplyProblem(msg.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: BROADCAST NOTIFICATIONS ================= */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Broadcast Campus Alerts</h3>
          <form onSubmit={handlePublishNotification} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alert Title</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g., Campus Placement Drive Circular"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alert Message</label>
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                rows={4}
                placeholder="Official college directive details..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <select
                  value={notifTargetType}
                  onChange={(e) => setNotifTargetType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                >
                  <option value="ALL">Entire Campus (All Verified)</option>
                  <option value="YEAR">Specific Academic Year</option>
                  <option value="BATCH">Specific Batch</option>
                </select>
              </div>

              {notifTargetType === 'YEAR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Year</label>
                  <select
                    value={notifTargetYear}
                    onChange={(e) => setNotifTargetYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  >
                    <option value={1}>1st Year Students</option>
                    <option value={2}>2nd Year Students</option>
                    <option value={3}>3rd Year Students</option>
                    <option value={4}>4th Year Students</option>
                  </select>
                </div>
              )}

              {notifTargetType === 'BATCH' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Batch Code</label>
                  <input
                    type="text"
                    value={notifTargetBatch}
                    onChange={(e) => setNotifTargetBatch(e.target.value)}
                    placeholder="2026-2030"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
            >
              Publish & Broadcast in Real-Time
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 6: AUDIT LOGS ================= */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Immutable Administrative Audit Log</h3>
          <p className="text-xs text-slate-400">
            Every administrative view, year promotion, student termination, group creation, and approval is recorded for institutional accountability.
          </p>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-400">{log.action_type}</span>
                  <span className="text-slate-400 ml-2">Entity: {log.target_entity}</span>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">{log.details_json}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {new Date(log.created_at).toLocaleString()} • IP: {log.ip_address}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: TERMINATE STUDENT CONFIRMATION ================= */}
      {selectedStudentForTerm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Terminate Student Account</h4>
                <p className="text-xs text-rose-400">Irrevocable action: access revoked immediately</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div>Student: <strong className="text-white">{selectedStudentForTerm.full_name}</strong></div>
              <div>CRN: <strong className="text-slate-300 font-mono">{selectedStudentForTerm.crn_or_roll_number}</strong></div>
              <div>Email: <span className="text-slate-400 font-mono">{selectedStudentForTerm.email}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Institutional Justification Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={termReason}
                onChange={(e) => setTermReason(e.target.value)}
                placeholder="e.g. Forged ID documents, gross exam malpractice, or violation of campus ethics code..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setSelectedStudentForTerm(null); setTermReason(''); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTerminateStudent}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE NEW PURPOSE GROUP ================= */}
      {createGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>🏛️ Form New Purpose Group</span>
              </h4>
              <button
                onClick={() => setCreateGroupModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Campus Placement Preparation Cell 2026"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Specific Purpose & Mandate</label>
                <textarea
                  rows={3}
                  value={newGroupPurpose}
                  onChange={(e) => setNewGroupPurpose(e.target.value)}
                  placeholder="Describe the institutional goal, tasks, or guidelines for this group..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                >
                  <option value="SPECIAL_PURPOSE">Special Purpose Task Force</option>
                  <option value="PLACEMENT">Placement & Career Cell</option>
                  <option value="COMMITTEE">Institutional Committee</option>
                  <option value="CLUB">Student Technical Club</option>
                  <option value="DISCIPLINARY">Disciplinary & Governance</option>
                  <option value="ACADEMIC">Academic Project Team</option>
                </select>
              </div>

              {/* Select Initial Members */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Initial Student Members</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {students.map((st) => (
                    <label key={st.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={newGroupSelectedMembers.includes(st.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGroupSelectedMembers([...newGroupSelectedMembers, st.id]);
                          } else {
                            setNewGroupSelectedMembers(newGroupSelectedMembers.filter((id) => id !== st.id));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span className="font-semibold text-white">{st.full_name}</span>
                      <span className="text-slate-500 font-mono">({st.crn_or_roll_number} • Year {st.locked_year || 'PG'})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  Create & Launch Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ID PHOTO DECRYPTION ================= */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full text-center">
            <h4 className="font-bold text-white text-sm mb-3">Decrypted College Student ID Card</h4>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 mb-4 flex items-center justify-center">
              <img
                src={selectedPhotoModal}
                alt="Decrypted ID"
                className="max-h-72 object-contain rounded"
              />
            </div>
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
