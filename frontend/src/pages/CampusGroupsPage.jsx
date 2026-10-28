import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function CampusGroupsPage({ user }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyGroups();
  }, []);

  const loadMyGroups = async () => {
    setLoading(true);
    try {
      const data = await api.listGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        loadGroupDetails(data[0].id);
      }
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
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !msgInput.trim()) return;
    try {
      await api.postGroupMessage(selectedGroup.id, msgInput.trim());
      setMsgInput('');
      const msgs = await api.getGroupMessages(selectedGroup.id);
      setGroupMessages(msgs);
    } catch (err) {
      alert(err.message || 'Failed to post message');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/40">
              Institutional Task Forces
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Campus Purpose Groups</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Groups formed by college administration for specific tasks, committees, placement prep, and student leadership.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Drawer: Groups List */}
        <div className="lg:col-span-1 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Enrolled Groups</h4>
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 italic">
              You are not currently enrolled in any institutional purpose groups. The college administration will add you when relevant.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => loadGroupDetails(g.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedGroup?.id === g.id
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md'
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Group Feed & Workspace */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              {/* Group Banner */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    {selectedGroup.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Formed by: {selectedGroup.created_by_name}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1.5">{selectedGroup.name}</h3>

                {/* Purpose Callout */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <strong className="text-indigo-400 font-semibold block mb-0.5">Official Purpose & Directives:</strong>
                  <p className="text-slate-300 leading-relaxed">{selectedGroup.purpose}</p>
                </div>

                {/* Group Members Chip Roster */}
                <div className="mt-3">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1.5">Members ({selectedGroup.members?.length || 0}):</span>
                  <div className="flex flex-wrap gap-1.5">
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

                {/* Send Message */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Post a message or response to this purpose group..."
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!msgInput.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs"
                  >
                    Send Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-2xl mb-2">🏛️</div>
              <h4 className="font-bold text-white text-sm">Select a Group</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Select any enrolled purpose group from the left panel to participate in discussions and view administrative directives.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
