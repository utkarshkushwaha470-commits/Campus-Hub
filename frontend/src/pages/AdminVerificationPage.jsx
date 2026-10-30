import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SettingsPage from './SettingsPage';

export default function AdminVerificationPage({ user, onUserUpdated }) {
  const isChiefAdmin = user?.email?.toLowerCase() === 'utkarshkushwaha470@gmail.com' || Boolean(user?.is_chief_admin);

  const [activeTab, setActiveTab] = useState(isChiefAdmin ? 'chief-deck' : 'verifications'); // 'chief-deck' | 'chief-chat' | 'verifications' | 'students' | 'groups' | 'problem-box' | 'notifications' | 'audit' | 'settings'
  
  // Chief Admin Deck State
  const [adminsList, setAdminsList] = useState([]);
  const pendingAdminRequests = adminsList.filter(a => a.status === 'PENDING');
  const activeAdmins = adminsList.filter(a => a.status !== 'PENDING');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminProof, setNewAdminProof] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showNewAdminProof, setShowNewAdminProof] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  // Faculty Dispatches State (Chief Admin Inbox & Faculty Sent View)
  const [dispatchesList, setDispatchesList] = useState([]);
  const [unreadDispatchesCount, setUnreadDispatchesCount] = useState(0);
  const [dispatchesLoading, setDispatchesLoading] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [dispatchReplyText, setDispatchReplyText] = useState('');
  const [replyingDispatch, setReplyingDispatch] = useState(false);
  const [mySentDispatchesList, setMySentDispatchesList] = useState([]);

  // Chief Admin Direct Chat with Faculty State
  const [facultyChatsList, setFacultyChatsList] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [activeFacultyThread, setActiveFacultyThread] = useState(null);
  const [chiefReplyText, setChiefReplyText] = useState('');
  const [facultyChatLoading, setFacultyChatLoading] = useState(false);
  const [sendingChiefReply, setSendingChiefReply] = useState(false);

  // Faculty Appointment State (Chief Admin Exclusive)
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [facultyDept, setFacultyDept] = useState('Computer Science & Engineering');
  const [showFacultyPassword, setShowFacultyPassword] = useState(false);
  const [facultyActionLoading, setFacultyActionLoading] = useState(false);

  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Sub-Admin Direct Chat with Chief Admin State
  const [chiefSubject, setChiefSubject] = useState('');
  const [chiefMessage, setChiefMessage] = useState('');
  const [chiefSending, setChiefSending] = useState(false);
  const [chiefSentDispatches, setChiefSentDispatches] = useState([]);

  // Chief Admin Work Dossier & Oversight State
  const [workDossiers, setWorkDossiers] = useState([]);
  const [selectedAdminIdForDossier, setSelectedAdminIdForDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

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
    loadAdmins();
    if (activeTab === 'work-dossier') loadWorkDossiers();
    else if (activeTab === 'verifications') loadVerifications();
    else if (activeTab === 'students') loadStudents();
    else if (activeTab === 'groups') loadGroups();
    else if (activeTab === 'problem-box') loadProblemBoxQueue();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, verifFilter, studentStatusFilter, studentYearFilter]);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.listAdmins();
      setAdminsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkDossiers = async (adminId = '') => {
    setDossierLoading(true);
    try {
      const data = await api.getAdminsWorkDossier(adminId);
      setWorkDossiers(data);
      if (data.length > 0) {
        if (adminId) {
          setSelectedAdminIdForDossier(adminId);
        } else if (!selectedAdminIdForDossier) {
          setSelectedAdminIdForDossier(data[0].admin_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDossierLoading(false);
    }
  };

  const loadDispatches = async () => {
    setDispatchesLoading(true);
    try {
      const data = await api.getFacultyDispatches();
      setDispatchesList(data.dispatches || []);
      setUnreadDispatchesCount(data.unread_count || 0);
    } catch (err) {
      console.error('Error loading dispatches:', err);
    } finally {
      setDispatchesLoading(false);
    }
  };

  const loadMySentDispatches = async () => {
    try {
      const data = await api.getMySentDispatches();
      setMySentDispatchesList(data || []);
    } catch (err) {
      console.error('Error loading my sent dispatches:', err);
    }
  };

  const handleReplyDispatch = async (dispatchId) => {
    if (!dispatchReplyText.trim() || replyingDispatch) return;
    setReplyingDispatch(true);
    try {
      const res = await api.replyToFacultyDispatch(dispatchId, { reply: dispatchReplyText.trim() });
      showStatus(res.message);
      setDispatchReplyText('');
      setActiveReplyId(null);
      await loadDispatches();
    } catch (err) {
      alert(err.message || 'Failed to dispatch official response.');
    } finally {
      setReplyingDispatch(false);
    }
  };

  const handleMarkDispatchRead = async (dispatchId) => {
    try {
      await api.markDispatchRead(dispatchId);
      loadDispatches();
    } catch (err) {}
  };

  const loadFacultyChats = async () => {
    try {
      const data = await api.getFacultyChatsForChief();
      setFacultyChatsList(data);
      if (data.length > 0 && !selectedFacultyId) {
        openFacultyThread(data[0].faculty_id);
      }
    } catch (err) {
      console.error('Error loading faculty chats:', err);
    }
  };

  const openFacultyThread = async (facId) => {
    setSelectedFacultyId(facId);
    setFacultyChatLoading(true);
    try {
      const thread = await api.getFacultyChatThread(facId);
      setActiveFacultyThread(thread);
    } catch (err) {
      console.error('Error loading faculty thread:', err);
    } finally {
      setFacultyChatLoading(false);
    }
  };

  const handleSendChiefReply = async (e) => {
    e.preventDefault();
    if (!chiefReplyText.trim() || !selectedFacultyId || sendingChiefReply) return;
    setSendingChiefReply(true);
    try {
      await api.replyToFaculty(selectedFacultyId, { message: chiefReplyText.trim() });
      setChiefReplyText('');
      await openFacultyThread(selectedFacultyId);
      await loadFacultyChats();
    } catch (err) {
      alert(err.message || 'Failed to send reply to Faculty member.');
    } finally {
      setSendingChiefReply(false);
    }
  };

  const handleAppointFaculty = async (e) => {
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

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      alert('Please fill in Name, Email, and Password for the new administrator.');
      return;
    }
    setAdminActionLoading(true);
    try {
      const res = await api.createAdmin({
        full_name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        admin_proof: newAdminProof.trim() || 'staffadmin2026'
      });
      showStatus(res.message);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminProof('');
      setShowAdminModal(false);
      loadAdmins();
    } catch (err) {
      alert(err.message || 'Failed to appoint new administrator.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!confirm(`Are you sure you want to revoke administrator access for ${adminName}?`)) return;
    try {
      const res = await api.deleteAdmin(adminId);
      showStatus(res.message);
      loadAdmins();
    } catch (err) {
      alert(err.message || 'Error revoking administrator access.');
    }
  };

  const handleApproveAdmin = async (adminId, adminName) => {
    try {
      const res = await api.approveAdminRequest(adminId);
      showStatus(res.message);
      loadAdmins();
    } catch (err) {
      alert(err.message || 'Failed to approve administrator request.');
    }
  };

  const handleRejectAdmin = async (adminId, adminName) => {
    if (!confirm(`Are you sure you want to reject the administrator clearance request for ${adminName}?`)) return;
    try {
      const res = await api.rejectAdminRequest(adminId);
      showStatus(res.message);
      loadAdmins();
    } catch (err) {
      alert(err.message || 'Failed to reject administrator request.');
    }
  };

  const handleSendChiefMessage = async (e) => {
    e.preventDefault();
    if (!chiefSubject.trim() || !chiefMessage.trim()) {
      alert('Please enter a subject and message for the Chief Administrator.');
      return;
    }
    setChiefSending(true);
    try {
      const res = await api.sendChiefMessage({
        subject: chiefSubject.trim(),
        message: chiefMessage.trim()
      });
      showStatus(`✓ ${res.message}`);
      loadMySentDispatches();
      setChiefSentDispatches([
        {
          id: Date.now(),
          subject: chiefSubject,
          message: chiefMessage,
          time: new Date().toLocaleTimeString()
        },
        ...chiefSentDispatches
      ]);
      setChiefSubject('');
      setChiefMessage('');
    } catch (err) {
      alert(err.message || 'Failed to dispatch message to Chief Admin.');
    } finally {
      setChiefSending(false);
    }
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
        'STUDENT'
      );
      setStudents(data.filter(s => s.role !== 'ADMIN'));
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
            {isChiefAdmin ? (
              <>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm">
                  👑 Chief Administrator Supreme Command
                </span>
                <span className="text-xs text-amber-300 font-bold">• UTKARSH KUSHWAHA (Executive Authority)</span>
              </>
            ) : (
              <>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/40">
                  🛡️ Sub-Administrator Control Deck
                </span>
                <span className="text-xs text-slate-400 font-semibold">• College Administration</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isChiefAdmin ? 'Chief Administrator Command Center' : 'College Administrator Portal'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isChiefAdmin
              ? 'Administrator Appointment & Revocation • Student Terminations • Purpose Groups • ID Verifications'
              : 'Student Management • Purpose Groups • ID OCR Review • Problem Box • Direct Line to Chief Admin'}
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {/* Chief Admin or Sub-Admin exclusive Tab */}
          {isChiefAdmin ? (
            <>
              <button
                onClick={() => { setActiveTab('chief-deck'); loadAdmins(); }}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'chief-deck' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-extrabold' : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>👑</span>
                <span>Manage Admins</span>
                {adminsList.filter(a => a.status === 'PENDING').length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-sm">
                    {adminsList.filter(a => a.status === 'PENDING').length} Pending
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('work-dossier'); loadWorkDossiers(); }}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'work-dossier' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-extrabold' : 'text-blue-400 hover:text-white'
                }`}
              >
                <span>📊</span>
                <span>Admins Work Oversight</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setActiveTab('chief-deck'); loadAdmins(); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'chief-deck' ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>🛡️</span>
                <span>Administrators</span>
              </button>
            </>
          )}

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
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'settings' ? 'bg-amber-500 text-slate-950 shadow-sm font-black' : 'text-amber-400 hover:text-white'
            }`}
          >
            <span>⚙️ Settings & Proof</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/60 text-amber-300 text-xs shadow-lg flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {/* ================= TAB: ADMINISTRATOR DECK (CHIEF & SUB-ADMINS) ================= */}
      {activeTab === 'chief-deck' && (
        <div className="space-y-6">
          {/* Executive Clearance Header */}
          {isChiefAdmin ? (
            <div className="rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/60 border border-amber-500/60 p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                    Platform Director
                  </span>
                  <span className="text-xs text-amber-300 font-bold">• Supreme Governance</span>
                </div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>👑 Institutional Administrator Authority</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Welcome, <strong>UTKARSH KUSHWAHA</strong>. You possess exclusive authority to appoint new college administrators, approve clearance requests, revoke staff credentials, and enforce platform security protocols.
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowFacultyModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>🎓</span>
                  <span>Appoint New Admit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-600/40 p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-600/40">
                    🛡️ Administrator Directory
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• College Administration</span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🛡️ Institutional Administrators Roster</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Official roster of appointed college administrators holding platform credentials. Platform governance and appointments are held exclusively by Chief Administrator <strong>UTKARSH KUSHWAHA</strong>.
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
                <span>👑</span>
                <span>Chief Admin: Utkarsh Kushwaha</span>
              </div>
            </div>
          )}

          {/* ================= SECTION 1: PENDING ADMINISTRATOR CLEARANCE REQUESTS (CHIEF ADMIN ONLY) ================= */}
          {isChiefAdmin && (pendingAdminRequests.length > 0 ? (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-2 border-amber-500/80 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <h4 className="font-black text-amber-300 text-base flex items-center gap-2">
                      <span>⏳ Pending Administrator Clearance Requests</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                        {pendingAdminRequests.length} Required Action
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Staff applicants who registered for administrator clearance. Requires verification & activation by Chief Administrator <strong>UTKARSH KUSHWAHA</strong>.
                  </p>
                </div>
                <button
                  onClick={loadAdmins}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>↻</span>
                  <span>Refresh Queue</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-amber-400 uppercase text-[10px] font-bold border-b border-amber-500/30">
                    <tr>
                      <th className="px-4 py-3">Applicant Name</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Clearance Status</th>
                      <th className="px-4 py-3">Security Passphrase</th>
                      <th className="px-4 py-3 text-right">Chief Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {pendingAdminRequests.map((adm) => (
                      <tr key={adm.id} className="hover:bg-amber-950/20 transition">
                        <td className="px-4 py-3 font-bold text-white flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-sm">
                            👤
                          </div>
                          <div>
                            <div className="font-black text-sm text-slate-100">{adm.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">CRN: {adm.crn_or_roll_number || 'ADM-PENDING'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-200/90 font-medium">{adm.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Awaiting Clearance</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                            •••••••• (Configured)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isChiefAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveAdmin(adm.id, adm.full_name)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                              >
                                <span>✓</span>
                                <span>Approve Administrator</span>
                              </button>
                              <button
                                onClick={() => handleRejectAdmin(adm.id, adm.full_name)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white font-bold text-xs transition flex items-center gap-1"
                              >
                                <span>✕</span>
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end">
                              <span className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Chief Admin Approval Required (Utkarsh Kushwaha)</span>
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <div className="text-xs font-bold text-slate-200">No Pending Administrator Clearance Requests</div>
                  <div className="text-[11px] text-slate-400">All administrator registrations have been processed. New applicant requests will appear here instantly for Chief Admin approval.</div>
                </div>
              </div>
              <button
                onClick={loadAdmins}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ↻ Refresh
              </button>
            </div>
          ))}

          {/* ================= SECTION 2: ACTIVE APPOINTED ADMINISTRATORS ROSTER ================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base">Appointed Administrators Roster ({activeAdmins.length})</h4>
                <p className="text-xs text-slate-400">All registered institutional staff holding active administrative clearance.</p>
              </div>
              <button
                onClick={loadAdmins}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ↻ Refresh List
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Administrator</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Clearance Authority</th>
                    <th className="px-4 py-3 text-right">Executive Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {activeAdmins.map((adm) => {
                    const isChief = adm.email.toLowerCase() === 'utkarshkushwaha470@gmail.com' || adm.is_chief_admin;
                    return (
                      <tr key={adm.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isChief ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {isChief ? '👑' : '🛡️'}
                          </div>
                          <div>
                            <div>{adm.full_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{adm.crn_or_roll_number}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">{adm.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            adm.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950 text-rose-400'
                          }`}>
                            {adm.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isChief ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase shadow-sm">
                              Chief Administrator [Permanent]
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                              Sub-Administrator (Staff)
                            </span>
                          )}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isChiefAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedAdminIdForDossier(adm.id);
                                  setActiveTab('work-dossier');
                                  loadWorkDossiers(adm.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-800/60 text-blue-300 hover:text-white font-bold text-xs transition flex items-center gap-1"
                                title="Inspect this administrator's complete work record"
                              >
                                <span>🔍</span>
                                <span>Work Dossier</span>
                              </button>
                            )}
                            {isChief ? (
                              <span className="text-[11px] text-amber-400 font-semibold italic pl-1">Permanent Director</span>
                            ) : isChiefAdmin ? (
                              <button
                                onClick={() => handleDeleteAdmin(adm.id, adm.full_name)}
                                className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white font-bold text-xs transition"
                              >
                                Revoke
                              </button>
                            ) : (
                              <span className="text-slate-500 text-xs italic px-2">Active Staff</span>
                            )}
                          </div>
                        </td>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: CHIEF ADMIN - ADMINS WORK OVERSIGHT DOSSIER ================= */}
      {activeTab === 'work-dossier' && isChiefAdmin && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <h3 className="text-lg font-black text-white">
                  Administrators Work Dossier & Activity Oversight
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900 text-blue-200 border border-blue-700 font-bold uppercase tracking-wider">
                  Chief Admin Access
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Complete institutional oversight for <strong>Chief Administrator UTKARSH KUSHWAHA</strong>. Monitor all administrators' work productivity, verifications handled, disciplinary bans enacted, groups configured, terminal IP addresses, and detailed chronological activity logs.
              </p>
            </div>
            <button
              onClick={() => loadWorkDossiers()}
              disabled={dossierLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-600/30 self-start sm:self-auto disabled:opacity-50"
            >
              <span>{dossierLoading ? '⏳' : '↻'}</span>
              <span>{dossierLoading ? 'Syncing...' : 'Sync All Work Data'}</span>
            </button>
          </div>

          {/* Admin Selection Carousel / Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap px-1">Select Administrator:</span>
            {workDossiers.map((d) => {
              const isSelected = (selectedAdminIdForDossier === d.admin_id) || (!selectedAdminIdForDossier && workDossiers[0]?.admin_id === d.admin_id);
              const isChief = d.is_chief_admin || d.email.toLowerCase() === 'utkarshkushwaha470@gmail.com';
              return (
                <button
                  key={d.admin_id}
                  onClick={() => setSelectedAdminIdForDossier(d.admin_id)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{isChief ? '👑' : '🛡️'}</span>
                  <span>{d.full_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {d.metrics?.total_actions || 0} acts
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Dossier View */}
          {(() => {
            const currentDossier = workDossiers.find(d => d.admin_id === selectedAdminIdForDossier) || workDossiers[0];
            if (!currentDossier) {
              return (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-sm">
                  {dossierLoading ? 'Loading administrators work dossiers...' : 'No administrator work records found.'}
                </div>
              );
            }

            const isChief = currentDossier.is_chief_admin || currentDossier.email.toLowerCase() === 'utkarshkushwaha470@gmail.com';
            const m = currentDossier.metrics || {};

            return (
              <div className="space-y-6">
                {/* Admin Dossier Profile Card */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg flex-shrink-0 ${
                      isChief ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950' : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                    }`}>
                      {isChief ? '👑' : '🛡️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-white">{currentDossier.full_name}</h4>
                        {isChief ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Chief Administrator (Permanent Director)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-blue-300 border border-blue-500/30">
                            Staff Administrator
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">{currentDossier.email}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span>Staff ID: <strong className="text-slate-200 font-mono">{currentDossier.crn_or_roll_number}</strong></span>
                        <span>•</span>
                        <span>Batch: <strong className="text-slate-200">{currentDossier.batch}</strong></span>
                        <span>•</span>
                        <span>Status: <strong className="text-emerald-400 font-semibold">{currentDossier.status}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 flex flex-col justify-center">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Last Recorded IP:</span>
                      <span className="font-mono text-slate-200 font-semibold">{currentDossier.last_ip_address || '127.0.0.1'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Last Active:</span>
                      <span className="text-slate-200 font-semibold">
                        {currentDossier.last_active_at ? new Date(currentDossier.last_active_at).toLocaleString() : 'Active Recently'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Appointed On:</span>
                      <span className="text-slate-200 font-semibold">
                        {currentDossier.created_at ? new Date(currentDossier.created_at).toLocaleDateString() : 'Initial Deployment'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance & Work Metrics Grid */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <span>📈</span>
                    <span>Administrative Performance & Work Output</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Verifications</div>
                      <div className="text-xl font-black text-amber-400 mt-1">{m.verifications_reviewed || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        <span className="text-emerald-400 font-semibold">✓ {m.verifications_approved || 0}</span> | <span className="text-rose-400 font-semibold">✕ {m.verifications_rejected || 0}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Terminations</div>
                      <div className="text-xl font-black text-rose-400 mt-1">{m.students_terminated || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Accounts Revoked</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Year Promotions</div>
                      <div className="text-xl font-black text-blue-400 mt-1">{m.students_promoted || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Batches Advanced</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Purpose Groups</div>
                      <div className="text-xl font-black text-purple-400 mt-1">{m.groups_created || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Groups Configured</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Alerts Issued</div>
                      <div className="text-xl font-black text-cyan-400 mt-1">{m.alerts_published || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Campus Broadcasts</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Total Actions</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">{m.total_actions || 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Audit Log Events</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Chronological Activity Log */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <span>📜</span>
                        <span>Chronological Work Actions Log ({currentDossier.recent_activities?.length || 0} Events)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Timestamped administrative operations logged for {currentDossier.full_name}
                      </p>
                    </div>
                  </div>

                  {(!currentDossier.recent_activities || currentDossier.recent_activities.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No administrative operations logged yet for this administrator account.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Action Type</th>
                            <th className="px-4 py-3">Target Entity</th>
                            <th className="px-4 py-3">Details / Parameters</th>
                            <th className="px-4 py-3 text-right">Terminal IP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                          {currentDossier.recent_activities.map((act) => {
                            let actionColor = 'bg-slate-800 text-slate-300 border-slate-700';
                            if (act.action_type.includes('APPROVE')) actionColor = 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
                            else if (act.action_type.includes('REJECT') || act.action_type.includes('TERMINATE')) actionColor = 'bg-rose-950 text-rose-300 border-rose-700/60';
                            else if (act.action_type.includes('CREATE') || act.action_type.includes('GROUP')) actionColor = 'bg-purple-950 text-purple-300 border-purple-700/60';
                            else if (act.action_type.includes('NOTIF') || act.action_type.includes('FORWARD')) actionColor = 'bg-cyan-950 text-cyan-300 border-cyan-700/60';

                            return (
                              <tr key={act.id} className="hover:bg-slate-800/40 transition">
                                <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                                  {act.timestamp ? new Date(act.timestamp).toLocaleString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionColor}`}>
                                    {act.action_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                    <span>{act.target_entity === 'USER' ? '👤 STUDENT' : act.target_entity}</span>
                                  </div>
                                  {(act.student_info?.name || act.details?.student_name) ? (
                                    <div className="text-[11px] text-amber-300 font-bold truncate max-w-[160px]">
                                      {act.student_info?.name || act.details?.student_name}
                                    </div>
                                  ) : act.target_id ? (
                                    <span className="text-[10px] text-slate-500 block truncate max-w-[120px] font-mono">{act.target_id}</span>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 text-slate-300 text-[11px] font-sans">
                                  {(act.student_info || act.details?.student_name || act.details?.student_email || act.details?.crn) ? (
                                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 shadow-md">
                                      {/* Student Name & CRN Header */}
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-extrabold text-white text-xs flex items-center gap-1">
                                          <span>🎓</span>
                                          <span className="text-emerald-300">{act.student_info?.name || act.details?.student_name || 'Student'}</span>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-700/60 font-mono text-[10px] font-bold">
                                          CRN: {act.student_info?.crn || act.details?.crn || 'N/A'}
                                        </span>
                                        {(act.student_info?.locked_year || act.details?.locked_year) && (
                                          <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] font-bold">
                                            Year {act.student_info?.locked_year || act.details?.locked_year}
                                          </span>
                                        )}
                                      </div>
                                      {/* Email & Batch */}
                                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 font-mono">
                                        <span className="text-amber-200/90 font-medium">✉️ {act.student_info?.email || act.details?.student_email || 'N/A'}</span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-400">Batch: <strong className="text-slate-200">{act.student_info?.batch || act.details?.batch || 'N/A'}</strong></span>
                                      </div>
                                      {/* Rejection / Note Details */}
                                      {act.details?.rejection_reason && (
                                        <div className="text-[10px] text-rose-300 font-sans italic pt-0.5">
                                          Rejection Reason: {act.details.rejection_reason}
                                        </div>
                                      )}
                                      {act.details?.reason && (
                                        <div className="text-[10px] text-rose-300 font-sans italic pt-0.5">
                                          Reason: {act.details.reason}
                                        </div>
                                      )}
                                    </div>
                                  ) : act.details ? (
                                    <div className="max-w-md truncate" title={JSON.stringify(act.details)}>
                                      {typeof act.details === 'object' ? (
                                        Object.entries(act.details).map(([k, v]) => `${k}: ${v}`).join(' | ')
                                      ) : String(act.details)}
                                    </div>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                  {act.ip_address || '127.0.0.1'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
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

      {/* ================= TAB 7: ADMIN SETTINGS & PROOF ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>⚙️</span>
                <span>Administrator Settings & Security Proof Management</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Update account profile, institutional password, or change the admin security proof passphrase.
              </p>
            </div>
          </div>
          <SettingsPage user={user} onUserUpdated={onUserUpdated} />
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

            {/* ================= MODAL: APPOINT FACULTY MEMBER (CHIEF ADMIN EXCLUSIVE) ================= */}
      {showFacultyModal && isChiefAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎓</span>
                <h4 className="font-bold text-white text-sm">Appoint New Admit</h4>
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
                  Full Legal Name <span className="text-emerald-400">*</span>
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
                  {facultyActionLoading ? 'Appointing...' : 'Appoint & Activate New Admit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: APPOINT NEW ADMINISTRATOR (CHIEF ADMIN EXCLUSIVE) ================= */}
      {showAdminModal && isChiefAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h4 className="font-bold text-white text-sm">Appoint New College Administrator</h4>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              As Chief Administrator, granting administrative clearance gives this user full authority over students, groups, and verifications.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Legal Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Prof. Rajesh Verma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Institutional Email Address <span className="text-amber-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="e.g. staff.admin@apex.edu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Initial Password <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                    className="text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    {showNewAdminPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <input
                  type={showNewAdminPassword ? 'text' : 'password'}
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Assigned Security Proof Passphrase <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewAdminProof(!showNewAdminProof)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-mono"
                  >
                    {showNewAdminProof ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <input
                  type={showNewAdminProof ? 'text' : 'password'}
                  required
                  value={newAdminProof}
                  onChange={(e) => setNewAdminProof(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  The sub-admin must supply this secret proof passphrase whenever authenticating.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminActionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {adminActionLoading ? 'Appointing...' : 'Appoint Administrator'}
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
