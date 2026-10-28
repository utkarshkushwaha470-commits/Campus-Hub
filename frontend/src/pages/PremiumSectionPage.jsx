import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function PremiumSectionPage({ user }) {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    loadPremiumData();
  }, []);

  const loadPremiumData = async () => {
    try {
      const info = await api.getPremiumSection();
      setAccessInfo(info);
      const list = await api.listQueries('?is_premium=true');
      setQueries(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/40 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-900 text-purple-200 border border-purple-700/50">
            Exclusive Academic Forum
          </span>
          <span className="text-xs text-purple-400 font-semibold">• PG & Faculty Access Only</span>
        </div>
        <h2 className="text-xl font-bold text-white">CampusConnect Premium Section</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Postgraduate students (M.Tech, MS, PhD) and verified college faculty engage in high-level research discussions, thesis formulation, and academic mentorship.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-bold text-white text-base mb-4">Colloquium Discussions ({queries.length})</h3>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Loading premium research threads...</div>
        ) : queries.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs italic">
            No active postgraduate research threads yet.
          </div>
        ) : (
          <div className="space-y-3">
            {queries.map((q) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-800/40 transition-all">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-purple-400">{q.subject}</span>
                  <span className="text-[11px] text-slate-500">{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{q.title}</h4>
                <p className="text-xs text-slate-300 mt-1">{q.content_text}</p>
                <div className="mt-2 text-[11px] text-slate-400">
                  Lead Author: <strong className="text-slate-200">{q.poster_name}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
