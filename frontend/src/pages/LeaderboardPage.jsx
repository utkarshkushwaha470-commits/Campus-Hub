import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function LeaderboardPage({ user }) {
  const [category, setCategory] = useState('overall');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLeaderboard(category);
  }, [category]);

  const loadLeaderboard = async (cat) => {
    setLoading(true);
    try {
      const data = await api.getLeaderboard(cat);
      setRankings(data.rankings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/40">
            Verified Academic Mentorship
          </span>
          <span className="text-xs text-emerald-400 font-semibold">• Anti-Abuse Protected</span>
        </div>
        <h2 className="text-xl font-bold text-white">Campus Mentor Leaderboard</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Rankings are updated dynamically based on star ratings from juniors after verified doubt resolution. Reciprocal star trading, burst velocity, and self-ratings are filtered by the abuse engine.
        </p>

        {/* Category Filter Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[
            { id: 'overall', label: 'Overall Campus' },
            { id: 'year_4', label: '4th Year Seniors' },
            { id: 'year_3', label: '3rd Year Seniors' },
            { id: 'year_2', label: '2nd Year Sophomores' },
            { id: 'pg_faculty', label: 'PG & Faculty' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                category === cat.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white text-base mb-4">Top Academic Mentors</h3>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Calculating rankings...</div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs italic">
            No rated mentors in this category yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {rankings.map((r) => {
              const isCurrentUser = user && user.id === r.user_id;
              return (
                <div
                  key={r.user_id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    isCurrentUser
                      ? 'bg-blue-950/40 border-blue-600 shadow-md'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                      r.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : r.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : r.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {r.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{r.full_name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <span className="text-blue-400 font-semibold">{r.role}</span>
                        {r.locked_year && <span>• Year {r.locked_year}</span>}
                        <span>• Batch {r.batch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-black text-amber-400 flex items-center justify-end gap-1">
                        <span>{r.points}</span>
                        <span className="text-xs">★</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Level {r.level}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
