import React, { useState, useEffect } from 'react';

/* ── Animated score gauge ──────────────────────────────────── */
function ScoreGauge({ score }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let v = 0;
    const iv = setInterval(() => {
      v = Math.min(v + 1.5, score);
      setDisplay(Math.round(v));
      if (v >= score) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [score]);

  const r = 70, circ = 2 * Math.PI * r;
  const sc = Math.round(score);
  const color = sc >= 70 ? 'var(--success)' : sc >= 45 ? 'var(--warning)' : 'var(--danger)';
  const offset = circ - (display / 100) * circ;

  const tier = sc >= 70
    ? { label: 'Strong match — likely to pass ATS screening', cls: 'tier-strong', icon: '✅' }
    : sc >= 45
    ? { label: 'Partial match — keyword improvements recommended', cls: 'tier-partial', icon: '⚡' }
    : { label: 'Weak match — significant gaps to address before applying', cls: 'tier-weak', icon: '⚠️' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--bg4)" strokeWidth="12"/>
          <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 42, fontWeight: 700, color, lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>% match</span>
        </div>
      </div>
      <div>
        <span className={tier.cls}>{tier.icon} {tier.label}</span>
      </div>
    </div>
  );
}

/* ── Keyword gap table row ─────────────────────────────────── */
function GapRow({ keyword, context, freq, type }) {
  const typeStyle = {
    missing: { bg: 'color-mix(in srgb,#ef4444 6%,transparent)', border: 'color-mix(in srgb,#ef4444 20%,transparent)', color: 'var(--danger)',  tag: 'Missing' },
    weak:    { bg: 'color-mix(in srgb,#f59e0b 6%,transparent)', border: 'color-mix(in srgb,#f59e0b 20%,transparent)', color: 'var(--warning)', tag: 'Weak' },
  }[type] || {};

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: typeStyle.bg, border: `1px solid ${typeStyle.border}`,
      marginBottom: 5
    }}>
      <span style={{ fontWeight: 600, fontSize: 12, color: typeStyle.color, minWidth: 120 }}>{keyword}</span>
      <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{context}</span>
      {freq > 1 && <span style={{ fontSize: 10, color: typeStyle.color, flexShrink: 0 }}>{freq}× in JD</span>}
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
        background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`
      }}>{typeStyle.tag}</span>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function MatchDashboard({ analysis, gapData, onContinue, onBack, onRunGaps }) {
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError,   setGapError]   = useState('');
  const [tab,        setTab]        = useState('overview');

  const sc  = Math.round(analysis?.matchScore || 0);
  const matched = analysis?.matchedSkills  || [];
  const missing = analysis?.missingSkills  || [];
  const ecoGaps = analysis?.ecosystemGaps  || [];

  const missingKw = gapData?.missingKeywords || [];
  const weakKw    = gapData?.weakKeywords    || [];
  const presentKw = gapData?.presentKeywords || [];

  const handleRunGaps = async () => {
    setGapLoading(true); setGapError('');
    try { await onRunGaps(); }
    catch(e) { setGapError(e.message); }
    finally { setGapLoading(false); }
  };

  return (
    <div className="fade-up">

      {/* Header */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="section-title">Match &amp; gap dashboard</div>
            <div className="section-sub" style={{ marginBottom: 0 }}>Full analysis of your resume against the job description</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onBack}>← Back</button>
            <button className="btn btn-primary" onClick={onContinue}>Select points →</button>
          </div>
        </div>
      </div>

      {/* Score + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
          <ScoreGauge score={sc}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { v: matched.length, l: 'Matched skills',   c: 'var(--success)', icon: '✓' },
            { v: missing.length, l: 'Missing skills',   c: 'var(--danger)',  icon: '✗' },
            { v: ecoGaps.length, l: 'Ecosystem gaps',   c: 'var(--warning)', icon: '⚡' },
            { v: (analysis?.roleAnalysis||[]).reduce((s,r)=>s+(r.suggestedPoints||[]).length,0), l: 'Points generated', c: 'var(--accent)', icon: '✦' },
          ].map(m => (
            <div key={m.l} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb,${m.c} 12%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{m.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.l}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '0.75rem', background: 'var(--bg3)', borderRadius: 12, padding: 4 }}>
        {[
          { id: 'overview', label: '📊 Skills overview' },
          { id: 'gaps',     label: '🔑 Keyword gaps' },
          { id: 'ecosystem',label: '🏗️ Ecosystem gaps' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? 'white' : 'var(--text2)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="card fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Matched skills ✓</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {matched.map(s => <span key={s} className="badge badge-green">{s}</span>)}
              {matched.length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>None detected</span>}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Missing skills ✗</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {missing.map(s => <span key={s} className="badge badge-red">{s}</span>)}
              {missing.length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>None — great!</span>}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Ecosystem gaps</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ecoGaps.map(s => <span key={s} className="badge badge-amber">{s}</span>)}
              {ecoGaps.length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>None — great!</span>}
            </div>
          </div>
        </div>
      )}

      {tab === 'gaps' && (
        <div className="card fade-up">
          <div className="label" style={{ marginBottom: 12 }}>Keyword gap analysis</div>
          {!gapData && !gapLoading && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔑</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                Run a deep keyword analysis to see exactly which ATS terms are missing or underused
              </div>
              <button className="btn btn-primary" onClick={handleRunGaps}>Run keyword gap analysis →</button>
              {gapError && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>{gapError}</div>}
            </div>
          )}
          {gapLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2rem 0' }}>
              <div className="spinner spinner-lg"/>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Analyzing keyword gaps...</div>
            </div>
          )}
          {gapData && !gapLoading && (
            <>
              {missingKw.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Missing keywords ({missingKw.length})</div>
                  {missingKw.map((k,i) => <GapRow key={i} keyword={k.kw||k.keyword||k} context={k.ctx||k.context||''} freq={k.freq||k.frequency||1} type="missing"/>)}
                </div>
              )}
              {weakKw.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Weak / underused ({weakKw.length})</div>
                  {weakKw.map((k,i) => <GapRow key={i} keyword={k.kw||k.keyword||k} context={k.ctx||k.context||''} freq={1} type="weak"/>)}
                </div>
              )}
              {presentKw.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Present &amp; strong ({presentKw.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {presentKw.map(k => <span key={k} className="badge badge-green">{k}</span>)}
                  </div>
                </div>
              )}
              {gapData.overallRecommendation && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'color-mix(in srgb,var(--success) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--success) 20%,transparent)', fontSize: 12, color: 'var(--success)' }}>
                  💡 {gapData.overallRecommendation}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'ecosystem' && (
        <div className="card fade-up">
          <div className="label" style={{ marginBottom: 12 }}>Ecosystem gap analysis</div>
          {!gapData && !gapLoading && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                Run a deep ecosystem analysis to find missing technology stacks
              </div>
              <button className="btn btn-primary" onClick={handleRunGaps}>Run ecosystem analysis →</button>
            </div>
          )}
          {gapLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1.5rem 0' }}>
              <div className="spinner"/><span style={{ fontSize: 13, color: 'var(--text2)' }}>Running analysis...</span>
            </div>
          )}
          {gapData && !gapLoading && (
            <>
              {(gapData.topPriorities||[]).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Top priorities</div>
                  {gapData.topPriorities.map((p,i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                      <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {(gapData.ecosystemGaps||[]).map((g,i) => {
                const sev = g.sev || g.severity || 'MEDIUM';
                return (
                  <div key={i} className={`sev-${sev}`} style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name||g.ecosystem||g}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{sev}</span>
                    </div>
                    {(g.gap||g.description) && <div style={{ fontSize: 11, opacity: 0.85 }}>{g.gap||g.description}</div>}
                    {(g.fix||g.suggestion) && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, fontStyle: 'italic' }}>💡 {g.fix||g.suggestion}</div>}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <button className="btn" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onContinue}>Continue to preview →</button>
      </div>
    </div>
  );
}
