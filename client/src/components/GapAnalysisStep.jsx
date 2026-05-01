import React, { useState } from 'react';
import { gapsApi } from '../lib/api';

export default function GapAnalysisStep({ resumeText, resumeParsed, jdText, jdParsed, onBack, onContinue }) {
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('ecosystem');

  const run = async () => {
    setError(''); setLoading(true);
    setLoadMsg('Running ecosystem gap analysis...');
    const t = setTimeout(() => setLoadMsg('Running keyword gap analysis...'), 2000);
    try {
      const res = await gapsApi.run({ resumeText, resumeParsed, jdText, jdParsed });
      setResult(res.data);
    } catch (e) { setError(e.message); }
    finally { clearTimeout(t); setLoading(false); }
  };

  const score = result?.overallScore || 0;
  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 45 ? 'text-amber-400' : 'text-red-400';

  const SEV_CLASS = {
    HIGH: 'border-red-500/30 bg-red-500/8',
    MEDIUM: 'border-amber-500/30 bg-amber-500/8',
    LOW: 'border-emerald-500/30 bg-emerald-500/8'
  };
  const SEV_BADGE = { HIGH: 'badge-red', MEDIUM: 'badge-amber', LOW: 'badge-green' };

  return (
    <div className="card fade-up">
      <div className="section-title">Deep gap analysis</div>
      <div className="section-sub">Two dedicated analyses — Ecosystem Gap Analysis and Keyword Gap Analysis.</div>

      {!result && !loading && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { icon: '🏗️', title: 'Ecosystem Gap Analysis', desc: 'Missing technology stacks vs JD requirements' },
              { icon: '🔑', title: 'Keyword Gap Analysis', desc: 'ATS keywords absent or underused in your resume' }
            ].map(c => (
              <div key={c.title} className="card-inner text-center py-5">
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="text-sm font-medium text-slate-200 mb-1">{c.title}</div>
                <div className="text-xs text-slate-500">{c.desc}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary w-full justify-center py-3" onClick={run}>
            Run gap analysis →
          </button>
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mt-3">{error}</div>}
          <div className="mt-4 flex justify-between">
            <button className="btn" onClick={onBack}>← Back</button>
          </div>
        </>
      )}

      {loading && (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="spinner spinner-lg"/>
          <div className="text-sm text-slate-300">{loadMsg}</div>
          <div className="text-xs text-slate-500">Running two independent analyses...</div>
        </div>
      )}

      {result && !loading && (
        <div className="fade-up">
          {/* Score banner */}
          <div className="card-inner mb-5 p-5 flex items-center gap-5">
            <div className="text-center flex-shrink-0">
              <div className={`text-4xl font-bold ${scoreColor}`}>{score}%</div>
              <div className="text-xs text-slate-500 mt-0.5">keyword coverage</div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000"
                  style={{ width: `${score}%` }}/>
              </div>
              {result.overallRecommendation && (
                <div className="text-sm text-slate-300">{result.overallRecommendation}</div>
              )}
            </div>
          </div>

          {/* Top priorities */}
          {(result.topPriorities||[]).length > 0 && (
            <div className="card-inner mb-5">
              <div className="label mb-3">Top priorities</div>
              {result.topPriorities.map((p, i) => (
                <div key={i} className="flex items-start gap-3 mb-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold
                                  flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</div>
                  <div className="text-sm text-slate-300">{p}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-800 rounded-xl p-1">
            {[
              { id: 'ecosystem', label: '🏗️ Ecosystem', count: (result.ecosystemGaps||[]).length },
              { id: 'keywords', label: '🔑 Keywords', count: (result.missingKeywords||[]).length + (result.weakKeywords||[]).length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
                  ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {t.label}
                <span className={`badge ${tab===t.id ? 'bg-white/20 text-white' : 'badge-gray'}`}>{t.count}</span>
              </button>
            ))}
          </div>

          {tab === 'ecosystem' && (
            <div className="space-y-2.5 mb-5 fade-up">
              {(result.ecosystemGaps||[]).length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">No ecosystem gaps found</div>
              )}
              {(result.ecosystemGaps||[]).map((g, i) => {
                const sev = g.sev || g.severity || 'MEDIUM';
                return (
                  <div key={i} className={`rounded-xl p-4 border ${SEV_CLASS[sev] || SEV_CLASS.MEDIUM}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-semibold text-sm text-slate-200">{g.name || g.ecosystem || g}</div>
                      <span className={`badge ${SEV_BADGE[sev] || 'badge-amber'} flex-shrink-0`}>{sev}</span>
                    </div>
                    {(g.gap||g.description) && <div className="text-xs text-slate-400 mb-1">{g.gap||g.description}</div>}
                    {(g.fix||g.suggestion) && <div className="text-xs text-emerald-400/80 italic">💡 {g.fix||g.suggestion}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'keywords' && (
            <div className="mb-5 fade-up">
              {(result.missingKeywords||[]).length > 0 && (
                <div className="mb-4">
                  <div className="label mb-2">Missing keywords</div>
                  {result.missingKeywords.map((k, i) => (
                    <div key={i} className="flex items-start gap-3 border border-red-500/20 bg-red-500/5 rounded-xl px-3 py-2.5 mb-1.5">
                      <span className="badge badge-red flex-shrink-0">{k.kw||k.keyword||k}</span>
                      <div className="text-xs text-slate-400 flex-1">{k.ctx||k.context||''}</div>
                      {(k.freq||k.frequency) > 1 && <span className="text-xs text-red-400 flex-shrink-0">{k.freq||k.frequency}× in JD</span>}
                    </div>
                  ))}
                </div>
              )}
              {(result.weakKeywords||[]).length > 0 && (
                <div className="mb-4">
                  <div className="label mb-2">Weak / underused</div>
                  {result.weakKeywords.map((k, i) => (
                    <div key={i} className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/5 rounded-xl px-3 py-2.5 mb-1.5">
                      <span className="badge badge-amber flex-shrink-0">{k.kw||k.keyword||k}</span>
                      <div className="text-xs text-slate-400 flex-1">{k.ctx||k.context||''}</div>
                    </div>
                  ))}
                </div>
              )}
              {(result.presentKeywords||[]).length > 0 && (
                <div>
                  <div className="label mb-2">Strong keywords ✓</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.presentKeywords.map(k => <span key={k} className="badge badge-green">{k}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}
          <div className="flex justify-between">
            <button className="btn" onClick={onBack}>← Back</button>
            <button className="btn btn-primary" onClick={onContinue}>Confirm &amp; export →</button>
          </div>
        </div>
      )}
    </div>
  );
}
