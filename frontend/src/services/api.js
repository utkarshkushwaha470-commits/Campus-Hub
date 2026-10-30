const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('cc_token');
export const setAuthToken = (token) => localStorage.setItem('cc_token', token);
export const removeAuthToken = () => localStorage.removeItem('cc_token');

export const getCurrentUser = () => {
  const user = localStorage.getItem('cc_user');
  return user ? JSON.parse(user) : null;
};
export const setCurrentUser = (user) => localStorage.setItem('cc_user', JSON.stringify(user));
export const removeCurrentUser = () => localStorage.removeItem('cc_user');

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = options.headers || {};

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if body is FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.detail || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  sendOtp: (email) => request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  signup: (formData) => request('/auth/signup', {
    method: 'POST',
    body: formData
  }),
  login: (email, password, twoFactorCode, isAdminMode = false, adminProof = '') => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      two_factor_code: twoFactorCode,
      is_admin_mode: isAdminMode,
      admin_proof: adminProof
    })
  }),
  adminSignup: (data) => request('/auth/admin-signup', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  forgotPasswordLogin: (data) => request('/auth/forgot-password-login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  changePassword: (data) => request('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateAdminProof: (currentProof, newProof) => request('/auth/admin-proof', {
    method: 'PUT',
    body: JSON.stringify({ current_proof: currentProof, new_proof: newProof })
  }),
  resubmitId: (formData) => request('/auth/resubmit-id', {
    method: 'POST',
    body: formData
  }),
  getMe: () => request('/auth/me'),

  // Dashboard & Sections
  getDashboardSummary: () => request('/dashboard/summary'),
  getYearSection: (year) => request(`/dashboard/section/${year}`),
  getPremiumSection: () => request('/dashboard/premium-section'),

  // Queries & Answers
  ocrPreCheck: (formData) => request('/queries/ocr-pre-check', {
    method: 'POST',
    body: formData
  }),
  postQuery: (formData) => request('/queries/', {
    method: 'POST',
    body: formData
  }),
  listQueries: (params = '') => request(`/queries/${params}`),
  getQueryDetail: (id) => request(`/queries/${id}`),
  postAnswer: (queryId, formData) => request(`/queries/${queryId}/answers`, {
    method: 'POST',
    body: formData
  }),
  requestAiHint: (queryId) => request(`/queries/${queryId}/ai-hint`, {
    method: 'POST'
  }),

  // Instagram-Style Chat & DMs
  getChatInbox: () => request('/chat/inbox'),
  searchCampusUsers: (q = '') => request(`/chat/users/search?q=${encodeURIComponent(q)}`),
  startChatThread: (recipientId) => {
    const fd = new FormData();
    fd.append('recipient_id', recipientId);
    return request('/chat/start', { method: 'POST', body: fd });
  },
  getThreadMessages: (threadId) => request(`/chat/threads/${threadId}/messages`),
  sendChatMessage: (threadId, formData) => request(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    body: formData
  }),
  reactToMessage: (messageId, emoji) => {
    const fd = new FormData();
    fd.append('emoji', emoji);
    return request(`/chat/messages/${messageId}/react`, { method: 'POST', body: fd });
  },
  // Admin Chat Super-Access
  getAdminAllChatThreads: () => request('/chat/admin/all-threads'),
  adminDeleteChatMessage: (messageId) => request(`/chat/admin/messages/${messageId}`, {
    method: 'DELETE'
  }),

  // Ratings & Leaderboard
  submitRating: (queryId, stars, comment) => request('/ratings/', {
    method: 'POST',
    body: JSON.stringify({ query_id: queryId, stars, comment })
  }),
  getLeaderboard: (category = 'overall') => request(`/ratings/leaderboard?category=${category}`),

  // Problem Box
  submitProblemBox: (recipientRole, subject, contentText) => request('/problem-box/', {
    method: 'POST',
    body: JSON.stringify({ recipient_role: recipientRole, subject, content_text: contentText })
  }),
  getMyProblemMessages: () => request('/problem-box/my-messages'),
  getProblemBoxAdminQueue: () => request('/problem-box/admin/queue'),
  forwardProblemBox: (id, targetAuthorityName) => request(`/problem-box/admin/${id}/forward`, {
    method: 'POST',
    body: JSON.stringify({ target_authority_name: targetAuthorityName })
  }),
  replyProblemBox: (id, replyText) => request(`/problem-box/admin/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply_text: replyText })
  }),

  // Notifications
  publishNotification: (data) => request('/notifications/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  listNotifications: () => request('/notifications/'),
  markNotificationRead: (id) => request(`/notifications/${id}/mark-read`, {
    method: 'POST'
  }),

  // Admin & Verification
  listAdminVerifications: (status = 'PENDING') => request(`/admin/verifications?status_filter=${status}`),
  reviewVerification: (id, action, rejectionReason, overrideYear) => request(`/admin/verifications/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ action, rejection_reason: rejectionReason, override_year: overrideYear })
  }),
  promoteStudentYear: (userId, newYear) => request(`/admin/users/${userId}/promote-year`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, new_year: newYear })
  }),
  getAdminAuditLogs: () => request('/admin/audit-logs'),

  // Admin Student Management
  listAllStudents: (search = '', status = '', year = '', role = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status_filter', status);
    if (year) params.append('year_filter', year);
    if (role) params.append('role_filter', role);
    const qs = params.toString();
    return request(`/admin/students${qs ? `?${qs}` : ''}`);
  },
  terminateStudent: (userId, reason) => request(`/admin/students/${userId}/terminate`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  reinstateStudent: (userId, reason = 'Administrative reinstatement') => request(`/admin/students/${userId}/reinstate`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),

  // Purpose Groups
  listGroups: (category = '') => request(`/groups${category ? `?category=${category}` : ''}`),
  getGroupDetails: (groupId) => request(`/groups/${groupId}`),
  createGroup: (data) => request('/groups', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  addGroupMember: (groupId, userId, role = 'MEMBER') => request(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role_in_group: role })
  }),
  removeGroupMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, {
    method: 'DELETE'
  }),
  getGroupMessages: (groupId) => request(`/groups/${groupId}/messages`),
  postGroupMessage: (groupId, contentText, attachmentUrl = null) => request(`/groups/${groupId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content_text: contentText, attachment_url: attachmentUrl })
  }),
  deleteGroup: (groupId) => request(`/groups/${groupId}`, {
    method: 'DELETE'
  }),

  // Moderation
  reportContent: (targetType, targetId, reason, details) => request('/moderation/report', {
    method: 'POST',
    body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details })
  }),
  blockUser: (userId) => request(`/moderation/block/${userId}`, {
    method: 'POST'
  }),
  getModeratorQueue: () => request('/moderation/queue'),
  takeModerationAction: (targetUserId, actionType, reason) => request('/moderation/action', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId, action_type: actionType, reason })
  }),

  // Chief Administrator Functions (UTKARSH KUSHWAHA)
  listAdmins: () => request('/admin/admins-list'),
  createAdmin: (data) => request('/admin/create-admin', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteAdmin: (adminId) => request(`/admin/delete-admin/${adminId}`, {
    method: 'DELETE'
  }),
  approveAdminRequest: (adminId) => request(`/admin/approve-admin-request/${adminId}`, {
    method: 'POST'
  }),
  rejectAdminRequest: (adminId) => request(`/admin/reject-admin-request/${adminId}`, {
    method: 'POST'
  }),
  getAdminsWorkDossier: (adminId = '') => request(`/admin/admins-work-dossier${adminId ? `?admin_id=${adminId}` : ''}`),
  sendChiefMessage: (data) => request('/admin/chief-message', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
