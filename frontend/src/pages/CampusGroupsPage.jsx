import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function CampusGroupsPage({ user }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  // Group creation modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPurpose, setNewGroupPurpose] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('SPECIAL_PURPOSE');
  const [students, setStudents] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  const isAdmin = user?.role === 'ADMIN' || Boolean(user?.is_chief_admin) || (user?.email && user.email.toLowerCase().trim() === 'utkarshkushwaha470@gmail.com');

  useEffect(() => {
    loadMyGroups();
  }, []);

  // Poll active group messages every 3.5 seconds
  useEffect(() => {
    if (!selectedGroup) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await api.getGroupMessages(selectedGroup.id);
        setGroupMessages(msgs);
      } catch (err) {}
    }, 3500);
    return () => clearInterval(interval);
  }, [selectedGroup]);

  const showToast = (text, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  const loadMyGroups = async (preferGroupId = null) => {
    setLoading(true);
    try {
      const data = await api.listGroups();
      setGroups(data || []);
      if (preferGroupId) {
        loadGroupDetails(preferGroupId);
      } else if (data && data.length > 0) {
        // Automatically select the first available group so the user isn't left with an empty screen
        loadGroupDetails(data[0].id);
      } else {
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await api.listAllStudents('', 'APPROVED');
      setStudents(data || []);
    } catch (err) {
      setStudents([]);
    }
  };

  const loadGroupDetails = async (groupId) => {
    try {
      const details = await api.getGroupDetails(groupId);
      setSelectedGroup(details);
      try {
        const msgs = await api.getGroupMessages(groupId);
        setGroupMessages(msgs || []);
      } catch (e) {
        setGroupMessages([]);
      }
    } catch (err) {
      console.error('Error loading group details:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !msgInput.trim()) return;
    try {
      await api.postGroupMessage(selectedGroup.id, msgInput.trim());
      setMsgInput('');
      const msgs = await api.getGroupMessages(selectedGroup.id);
      setGroupMessages(msgs || []);
    } catch (err) {
      showToast(err.message || 'Failed to post message', true);
    }
  };

  const handleJoinGroup = async () => {
    if (!selectedGroup) return;
    try {
      const res = await api.joinGroup(selectedGroup.id);
      showToast(res.message || 'Joined group successfully!');
      loadGroupDetails(selectedGroup.id);
      loadMyGroups(selectedGroup.id);
    } catch (err) {
      showToast(err.message || 'Failed to join group', true);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupPurpose.trim()) {
      showToast('Please provide both a group name and a specific purpose directive.', true);
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await api.createGroup({
        name: newGroupName.trim(),
        purpose: newGroupPurpose.trim(),
        description: newGroupPurpose.trim(),
        category: newGroupCategory,
        member_ids: selectedMembers
      });
      showToast(res.message || `Purpose group '${newGroupName.trim()}' successfully launched!`);
      setCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupPurpose('');
      setSelectedMembers([]);
      loadMyGroups(res.id);
    } catch (err) {
      showToast(err.message || 'Error creating purpose group', true);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !addMemberUserId) return;
    try {
      const res = await api.addGroupMember(selectedGroup.id, addMemberUserId);
      showToast(res.message || 'Student added to purpose group!');
      setAddMemberUserId('');
      loadGroupDetails(selectedGroup.id);
      loadMyGroups(selectedGroup.id);
    } catch (err) {
      showToast(err.message || 'Failed to add student', true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Toast Notification Banner */}
      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-between ${
          statusMsg.isError ? 'bg-rose-950/90 border border-rose-700 text-rose-200' : 'bg-emerald-950/90 border border-emerald-700 text-emerald-200'
        }`}>
          <span>{statusMsg.isError ? '⚠️' : '✅'} {statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/40">
              Institutional Task Forces
            </span>
            <span className="text-xs text-indigo-400 font-bold">
              • {groups.length} Active Groups
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Campus Purpose Groups</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Groups formed by college administration and campus leaders for specific tasks, committees, placement prep, and student initiatives.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateModalOpen(true);
            loadStudents();
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>+</span>
          <span>Create New Group for Specific Purpose</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Drawer: Groups List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campus Groups</h4>
            <span className="text-[11px] text-slate-500">{groups.length} available</span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
              <p>No purpose groups have been formed yet.</p>
              <button
                onClick={() => {
                  setCreateModalOpen(true);
                  loadStudents();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                + Launch First Group
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => loadGroupDetails(g.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedGroup?.id === g.id
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300">
                      {g.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      👥 {g.member_count} Members
                    </span>
                  </div>
                  <h5 className="font-bold text-white text-sm">{g.name}</h5>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{g.purpose}</p>
                  {g.is_member && (
                    <span className="inline-block mt-2 text-[10px] text-emerald-400 font-bold">
                      ✓ Enrolled Member
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Group Feed & Workspace */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              {/* Group Banner */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {selectedGroup.category}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Formed by: {selectedGroup.created_by_name}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1.5">{selectedGroup.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {!selectedGroup.is_member && (
                      <button
                        onClick={handleJoinGroup}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        + Join This Group
                      </button>
                    )}

                    {isAdmin && (
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
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purpose Callout */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <strong className="text-indigo-400 font-semibold block mb-0.5">Official Purpose & Directives:</strong>
                  <p className="text-slate-300 leading-relaxed">{selectedGroup.purpose}</p>
                </div>

                {/* Group Members Chip Roster */}
                <div className="mt-3">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1.5">
                    Members ({selectedGroup.members?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {selectedGroup.members?.map((m) => (
                      <div
                        key={m.membership_id}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
                      >
                        <span className="font-semibold text-white">{m.full_name}</span>
                        <span className="text-[10px] text-slate-400">({m.crn_or_roll_number || m.role})</span>
                        <span className="text-[9px] px-1 rounded bg-slate-800 text-indigo-300 font-bold uppercase">{m.role_in_group}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Discussion & Directives Chat */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Group Communication & Directives</h5>
                <div className="h-64 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  {groupMessages.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs italic">
                      No messages in this group yet. Post an update or ask a question below.
                    </div>
                  ) : (
                    groupMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl text-xs max-w-[85%] ${
                          m.sender_role === 'ADMIN'
                            ? 'bg-amber-950/40 border border-amber-800/60 text-slate-200 mr-auto'
                            : m.is_me
                            ? 'bg-indigo-600 text-white ml-auto'
                            : 'bg-slate-800 text-slate-200 mr-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-[11px] text-indigo-300">
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

                {/* Send Message */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={selectedGroup.is_member ? "Post a message or directive to this purpose group..." : "Join group to post updates..."}
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!msgInput.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                  >
                    Send Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-2xl mb-2">🏛️</div>
              <h4 className="font-bold text-white text-sm">Campus Purpose Groups</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Select any enrolled purpose group from the left panel to participate in discussions and view administrative directives.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Form New Purpose Group */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>🏛️ Form New Purpose Group</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Placement & Career Preparation Cell 2026"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Specific Purpose & Mandate *</label>
                <textarea
                  rows={3}
                  required
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

              {students.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Initial Student Members ({selectedMembers.length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {students.map((st) => (
                      <label
                        key={st.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(st.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, st.id]);
                            } else {
                              setSelectedMembers(selectedMembers.filter((id) => id !== st.id));
                            }
                          }}
                          className="rounded border-slate-700 text-amber-500"
                        />
                        <span className="font-semibold text-white">{st.full_name}</span>
                        <span className="text-[10px] text-slate-400">({st.crn_or_roll_number} • Year {st.locked_year})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim() || !newGroupPurpose.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {creatingGroup ? 'Creating...' : 'Create & Launch Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
