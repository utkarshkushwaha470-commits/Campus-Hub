import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function YearSectionPage({ user }) {
  const [selectedYear, setSelectedYear] = useState(user.locked_year || 1);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  // New query modal state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSubject, setNewSubject] = useState('Computer Science');
  const [newTags, setNewTags] = useState('["engineering"]');
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrHint, setOcrHint] = useState(null);

  // Answer modal state
  const [activeQuery, setActiveQuery] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [answerPhoto, setAnswerPhoto] = useState(null);

  // Rating modal state
  const [ratingQuery, setRatingQuery] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingStatusMsg, setRatingStatusMsg] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadQueries(selectedYear);
  }, [selectedYear]);

  const loadQueries = async (year) => {
    setLoading(true);
    try {
      const data = await api.listQueries(`?target_year=${year}&is_premium=false`);
      setQueries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));

      // Trigger Gemma 4 OCR & Subject/Tag Assist
      setOcrRunning(true);
      try {
        const fd = new FormData();
        fd.append('photo', file);
        fd.append('text', newTitle + ' ' + newContent);
        const ocrRes = await api.ocrPreCheck(fd);
        setOcrHint(ocrRes);
        if (ocrRes.suggested_subject) setNewSubject(ocrRes.suggested_subject);
        if (ocrRes.suggested_tags) setNewTags(JSON.stringify(ocrRes.suggested_tags));
      } catch (err) {
        console.error('Gemma 4 OCR check error:', err);
      } finally {
        setOcrRunning(false);
      }
    }
  };

  const handleCreateQuery = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', newTitle);
      fd.append('content_text', newContent);
      fd.append('subject', newSubject);
      fd.append('tags', newTags);
      fd.append('target_year', selectedYear);
      fd.append('is_premium', 'false');
      fd.append('visibility', 'PUBLIC');
      if (newPhoto) fd.append('photo', newPhoto);

      await api.postQuery(fd);
      setShowPostModal(false);
      setNewTitle('');
      setNewContent('');
      setNewPhoto(null);
      setPhotoPreview(null);
      setOcrHint(null);
      loadQueries(selectedYear);
    } catch (err) {
      alert(err.message || 'Failed to post query');
    }
  };

  const handlePostAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    try {
      const fd = new FormData();
      fd.append('content_text', answerText);
      if (answerPhoto) fd.append('attachment', answerPhoto);

      await api.postAnswer(activeQuery.id, fd);
      setAnswerText('');
      setAnswerPhoto(null);
      // Reload query details
      const updated = await api.getQueryDetail(activeQuery.id);
      setActiveQuery(updated);
      loadQueries(selectedYear);
    } catch (err) {
      alert(err.message || 'Failed to submit answer');
    }
  };

  const handleAiHint = async (queryId) => {
    setAiLoading(true);
    try {
      const res = await api.requestAiHint(queryId);
      if (activeQuery && activeQuery.id === queryId) {
        setActiveQuery({ ...activeQuery, ai_hint: res.ai_hint });
      }
      loadQueries(selectedYear);
    } catch (err) {
      alert(err.message || 'Error generating Gemma 4 AI solution');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    try {
      const res = await api.submitRating(ratingQuery.id, ratingStars, ratingComment);
      if (res.status === 'PASSED') {
        setRatingStatusMsg('✓ Rating submitted! Verified Karma points awarded to senior mentor.');
      } else {
        setRatingStatusMsg(`⚠ Rating held for moderator review: ${res.abuse_flag_reason || 'Velocity check triggered.'}`);
      }
      setTimeout(() => {
        setRatingQuery(null);
        setRatingStatusMsg(null);
        loadQueries(selectedYear);
      }, 2500);
    } catch (err) {
      alert(err.message || 'Rating submission error');
    }
  };

  const openQueryDetail = async (q) => {
    try {
      const detail = await api.getQueryDetail(q.id);
      setActiveQuery(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const canPostInCurrentSection = (user.locked_year === selectedYear) || (user.role === 'ADMIN');
  const isSenior = (user.role === 'PG' || user.role === 'FACULTY' || user.role === 'ADMIN') || (user.locked_year && user.locked_year > selectedYear);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Year Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Academic Year Sections</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Juniors post doubts in their year • Seniors & Faculty answer to earn verified points
          </p>
        </div>

        {/* Tab Pills 1st to 4th Year */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[1, 2, 3, 4].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedYear === yr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Year {yr}
              {user.locked_year === yr && <span className="ml-1 text-[10px] text-blue-200 font-normal">(Yours)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="text-xs text-slate-300">
          Viewing <strong>Year {selectedYear} Doubts</strong> •{' '}
          {canPostInCurrentSection ? (
            <span className="text-emerald-400 font-semibold">You can ask questions here</span>
          ) : isSenior ? (
            <span className="text-blue-400 font-semibold">You can answer questions as Senior Mentor</span>
          ) : (
            <span className="text-slate-400">Read-only mode</span>
          )}
        </div>

        {canPostInCurrentSection && (
          <button
            onClick={() => setShowPostModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <span>+ Ask Doubt</span>
          </button>
        )}
      </div>

      {/* Doubts List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading queries...</div>
      ) : queries.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
            ?
          </div>
          <h4 className="text-base font-bold text-white">No queries in Year {selectedYear} section yet</h4>
          <p className="text-xs text-slate-400 mt-1">Be the first junior to ask a problem or concept question.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {queries.map((q) => (
            <div
              key={q.id}
              onClick={() => openQueryDetail(q)}
              className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800/40">
                    {q.subject}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {q.answers_count || 0} answers
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm line-clamp-2">{q.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">{q.content_text}</p>
              </div>

              {q.ai_hint && (
                <div className="mt-3 p-2 rounded-lg bg-blue-950/40 border border-blue-900/60 text-[11px] text-blue-300 flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">✨</span>
                  <span className="truncate">Gemma 4 Advisory Hint Attached</span>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>By: {q.poster_name}</span>
                <span>{new Date(q.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Query Detail & Answer Modal */}
      {activeQuery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300">
                  {activeQuery.subject} • Year {activeQuery.target_year}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{activeQuery.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Asked by {activeQuery.poster_name}</p>
              </div>
              <button
                onClick={() => setActiveQuery(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {activeQuery.content_text}
                {activeQuery.photo_storage_path && (
                  <div className="mt-3">
                    <img
                      src={activeQuery.photo_storage_path}
                      alt="Doubt Attachment"
                      className="max-h-60 rounded-lg border border-slate-700 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Gemma 4 AI Academic Solution Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-blue-950/50 border border-indigo-500/40 shadow-xl backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-indigo-500/20 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-300">
                    <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">✨</span>
                    <span className="tracking-wide">Google Gemma 4 AI Academic Solution</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live AI Tutor
                    </span>
                  </div>

                  <button
                    onClick={() => handleAiHint(activeQuery.id)}
                    disabled={aiLoading}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>{aiLoading ? '⏳' : activeQuery.ai_hint ? '🔄' : '✨'}</span>
                    <span>
                      {aiLoading
                        ? 'Gemma 4 Generating...'
                        : activeQuery.ai_hint
                        ? 'Regenerate AI Answer'
                        : 'Generate AI Answer'}
                    </span>
                  </button>
                </div>

                {aiLoading ? (
                  <div className="p-6 text-center rounded-xl bg-slate-950/70 border border-indigo-500/20 space-y-2">
                    <div className="inline-block animate-spin text-2xl">⚙️</div>
                    <p className="text-xs font-semibold text-indigo-200">
                      Google Gemma 4 is analyzing your doubt & generating a comprehensive academic answer...
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Curriculum-aligned multi-step solution for Allenhouse Institute of Technology students.
                    </p>
                  </div>
                ) : activeQuery.ai_hint ? (
                  <div className="space-y-2">
                    <div className="text-xs sm:text-[13px] text-slate-100 leading-relaxed font-sans whitespace-pre-wrap bg-slate-950/80 p-4 rounded-xl border border-indigo-500/30 font-medium">
                      {activeQuery.ai_hint}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
                      <span>✓ Gemma 4 Advisory Solution • Verified Academic Breakdown</span>
                      <span className="italic">AI answers are advisory and excluded from student ranking points.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <p className="text-xs text-slate-300">
                      Need immediate help? Click <strong>"Generate AI Answer"</strong> above to receive a comprehensive Gemma 4 step-by-step academic solution while senior peers review your doubt.
                    </p>
                  </div>
                )}
              </div>

              {/* Answers Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Senior & Faculty Answers ({activeQuery.answers?.length || 0})
                </h4>

                {(!activeQuery.answers || activeQuery.answers.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">No answers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeQuery.answers.map((ans) => (
                      <div key={ans.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{ans.author_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-blue-400 font-semibold">
                              {ans.author_role} {ans.author_year ? `Yr ${ans.author_year}` : ''}
                            </span>
                          </div>
                          {ans.is_accepted && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              ✓ Accepted Solution
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{ans.content_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rate Senior Button (If user is poster & answers exist) */}
              {user.id === activeQuery.poster_id && activeQuery.answers?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 flex items-center justify-between">
                  <div className="text-xs text-amber-200">
                    <strong>Was this senior answer helpful?</strong> Rate the senior to award them verified Karma points.
                  </div>
                  <button
                    onClick={() => setRatingQuery(activeQuery)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Rate Senior ★
                  </button>
                </div>
              )}

              {/* Answer Input (If user is senior/faculty or poster) */}
              <form onSubmit={handlePostAnswer} className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">
                  Write Your Answer / Explanation
                </label>
                <textarea
                  rows={3}
                  required
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Provide step-by-step guidance, equations, or code..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Submit Answer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Post Doubt Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Ask an Academic Doubt</h3>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateQuery} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Doubt Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Difficulty understanding Dijkstra's algorithm priority queue"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Problem Description</label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Explain where you are stuck, steps tried, or key questions..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Photo Upload with Gemma 4 pre-check */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Problem / Equation Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-950 file:text-blue-300 hover:file:bg-blue-900"
                />
                {ocrRunning && (
                  <span className="text-[10px] text-blue-400 animate-pulse mt-1 block">
                    ⚡ Google Gemma 4 Multimodal scanning image for OCR text and auto-tags...
                  </span>
                )}
                {ocrHint && (
                  <div className="mt-2 p-2 rounded-lg bg-blue-950/40 border border-blue-900/60 text-[11px] text-blue-300">
                    <strong>Gemma 4 Detected:</strong> Subject: {ocrHint.suggested_subject} • Tags: {ocrHint.suggested_tags?.join(', ')}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Year</label>
                  <input
                    type="text"
                    disabled
                    value={`Year ${selectedYear}`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20"
              >
                Post Doubt to Year {selectedYear} Section
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Junior Rates Senior Modal (Abuse Engine Protected) */}
      {ratingQuery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Rate Senior Mentor</h3>
            <p className="text-xs text-slate-400 mb-4">
              Your rating directly awards verified Karma points to the senior mentor. Abuse limits and reciprocal trading checks are strictly enforced.
            </p>

            {ratingStatusMsg && (
              <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
                {ratingStatusMsg}
              </div>
            )}

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rating (1 to 5 Stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      className={`flex-1 py-2 rounded-xl text-lg font-black transition-all ${
                        ratingStars >= star
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-950 text-slate-600 border border-slate-800'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback Comment (Optional)</label>
                <textarea
                  rows={2}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="How clear and helpful was the explanation?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Submit & Award Points
                </button>
                <button
                  type="button"
                  onClick={() => setRatingQuery(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
