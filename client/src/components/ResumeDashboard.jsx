import React, { useState } from 'react';

/* ── Tiny arc score chart ──────────────────────────────────── */
function ArcScore({ score, label, color }) {
  const r = 26, circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg4)" strokeWidth="6"/>
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{pct}</span>
        </div>
      </div>
      <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}

/* ── Duration bar ──────────────────────────────────────────── */
function DurationBar({ dates, maxMonths }) {
  function toMonths(d) {
    if (!d) return 0;
    const parts = d.split(/\s*[-–]\s*/);
    const parse = s => {
      if (!s) return null;
      const n = s.toLowerCase().trim();
      if (/present|current|now/.test(n)) return new Date();
      const y = n.match(/\b(19|20)\d{2}\b/);
      if (!y) return null;
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      let m = 0;
      for (let i = 0; i < months.length; i++) if (n.includes(months[i])) { m = i; break; }
      return new Date(+y[0], m);
    };
    const start = parse(parts[0]), end = parse(parts[1]) || new Date();
    if (!start || !end) return 0;
    return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
  }
  const months = toMonths(dates);
  const pct    = maxMonths > 0 ? (months / maxMonths) * 100 : 0;
  const label  = months >= 12
    ? `${Math.floor(months/12)}y${months%12>0?` ${months%12}mo`:''}`
    : `${months}mo`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 1s ease' }}/>
      </div>
      <span style={{ fontSize: 10, color: 'var(--text3)', minWidth: 40, textAlign: 'right' }}>{label}</span>
    </div>
  );
}

/* ── Section health scorer ─────────────────────────────────── */
function scoreSections(parsed) {
  const summary  = parsed.summary  && parsed.summary.split(' ').length > 8 ? 85 : 45;
  const skills   = Math.min(100, ((parsed.skills||[]).length / 15) * 100);
  const exp      = Math.min(100, ((parsed.experiences||[]).length / 5) * 100);
  const edu      = parsed.education && parsed.education.length > 5 ? 90 : 40;
  return { summary: Math.round(summary), skills: Math.round(skills), exp: Math.round(exp), edu: Math.round(edu) };
}

/* ── Main component ────────────────────────────────────────── */
export default function ResumeDashboard({ parsed }) {
  const [showAll, setShowAll] = useState(false);
  if (!parsed) return null;

  const scores  = scoreSections(parsed);
  const exps    = parsed.experiences || [];
  const skills  = parsed.skills      || [];
  const maxMo   = Math.max(...exps.map(e => {
    const m = e.dates; if (!m) return 0;
    const parts = m.split(/\s*[-–]\s*/);
    const parse = s => { if(!s) return null; const n=s.toLowerCase().trim(); if(/present|current|now/.test(n)) return new Date(); const y=n.match(/\b(19|20)\d{2}\b/); if(!y) return null; return new Date(+y[0],0); };
    const s=parse(parts[0]),en=parse(parts[1])||new Date(); if(!s||!en) return 0;
    return Math.max(0,(en.getFullYear()-s.getFullYear())*12+en.getMonth()-s.getMonth());
  }), 1);

  // ATS readiness overall
  const atsScore = Math.round((scores.summary + scores.skills + scores.exp + scores.edu) / 4);
  const atsColor = atsScore >= 70 ? 'var(--success)' : atsScore >= 45 ? 'var(--warning)' : 'var(--danger)';

  const displayExps = showAll ? exps : exps.slice(0, 4);

  return (
    <div className="fade-up" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Identity */}
      <div className="card-inner" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, flexShrink: 0,
          background: `linear-gradient(135deg, var(--accent) 0%, var(--success) 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 20, fontWeight: 700
        }}>
          {(parsed.name || 'U')[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{parsed.name || 'Candidate'}</div>
          <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 2 }}>{parsed.title || ''}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
            {parsed.email    && <span>✉ {parsed.email}</span>}
            {parsed.phone    && <span>📞 {parsed.phone}</span>}
            {parsed.location && <span>📍 {parsed.location}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 700 }} className="gradient-text">{parsed.years || '?'}y</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>total exp</div>
        </div>
      </div>

      {/* Summary */}
      {parsed.summary && (
        <div className="card-inner" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>
          "{parsed.summary}"
        </div>
      )}

      {/* Section health scores */}
      <div className="card-inner">
        <div className="label" style={{ marginBottom: 12 }}>Resume section health</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
          <ArcScore score={scores.summary} label="Summary"   color="var(--accent)"/>
          <ArcScore score={scores.skills}  label="Skills"    color="var(--success)"/>
          <ArcScore score={scores.exp}     label="Experience" color="var(--warning)"/>
          <ArcScore score={scores.edu}     label="Education" color="#a855f7"/>
          <ArcScore score={atsScore}       label="ATS Ready" color={atsColor}/>
        </div>
      </div>

      {/* Experience timeline with duration bars */}
      <div className="card-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="label">Experience — {exps.length} roles</div>
          {exps.length > 4 && (
            <button className="btn btn-sm" onClick={() => setShowAll(s => !s)}>
              {showAll ? 'Show less' : `+${exps.length - 4} more`}
            </button>
          )}
        </div>
        {displayExps.map((exp, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot"/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{exp.role || 'Not specified'}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>{exp.company}</div>
                {exp.client && exp.client !== exp.company && (
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>Client: {exp.client}</div>
                )}
              </div>
              <span className="badge badge-gray" style={{ flexShrink: 0, fontSize: 10 }}>{exp.dates || 'N/A'}</span>
            </div>
            <DurationBar dates={exp.dates} maxMonths={maxMo}/>
          </div>
        ))}
      </div>

      {/* Skills cloud */}
      {skills.length > 0 && (
        <div className="card-inner">
          <div className="label" style={{ marginBottom: 8 }}>Skills detected ({skills.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {skills.map(s => <span key={s} className="badge badge-indigo">{s}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
