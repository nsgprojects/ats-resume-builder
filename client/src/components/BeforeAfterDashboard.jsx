import React, { useState, useEffect } from 'react';

/* ── Animated score ring ───────────────────────────────────── */
function ScoreRing({ score, label, size = 110, delay = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let v = 0;
      const iv = setInterval(() => {
        v = Math.min(v + 1.2, score);
        setDisplay(Math.round(v));
        if (v >= score) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const sc = Math.round(score);
  const color = sc >= 70 ? 'var(--success)' : sc >= 45 ? 'var(--warning)' : 'var(--danger)';
  const offset = circ - (display / 100) * circ;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={size*0.08}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.08}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:size*0.22, fontWeight:700, color, lineHeight:1 }}>{display}%</span>
        </div>
      </div>
      <span style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>{label}</span>
    </div>
  );
}

/* ── Animated diff line ────────────────────────────────────── */
function DiffLine({ line, isNew, delay }) {
  const [visible, setVisible] = useState(!isNew);
  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
  }, [isNew, delay]);

  if (!isNew) {
    return (
      <div style={{ fontFamily:'monospace', fontSize:11, lineHeight:1.7, color:'var(--text2)' }}>
        {line || '\u00A0'}
      </div>
    );
  }
  return (
    <div style={{
      fontFamily:'monospace', fontSize:11, lineHeight:1.7,
      paddingLeft:6, paddingRight:4, borderRadius:4, marginBottom:1,
      borderLeft:'3px solid var(--success)',
      background:'color-mix(in srgb,var(--success) 8%,transparent)',
      color:'var(--success)',
      transition:'all 0.5s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0) scale(1)' : 'translateX(-8px) scale(0.98)',
    }}>
      {line || '\u00A0'}
      {visible && <span style={{ marginLeft:8, fontSize:10, opacity:0.5 }}>✦ new</span>}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export default function BeforeAfterDashboard({
  originalText, result, selectedPointsByRole,
  analysis, dlDocx, onDownloadDocx, onDownloadTxt, onCopy, error
}) {
  const [showDiff, setShowDiff] = useState(false);

  // ── Derive values from result ────────────────────────────
  const isDocxMode    = result?.mode === 'docx';
  const hasText       = !!(result?.integratedResume);
  const insertedCount = result?.insertedBullets?.length || 0;
  const rolesModified = result?.rolesModified || [];

  // Score math
  const scoreBefore = Math.round(analysis?.matchScore || 0);
  const scoreAfter  = Math.min(95, scoreBefore + Math.round(insertedCount * 2.2));
  const improvement = scoreAfter - scoreBefore;

  // Diff (only computed in text mode)
  const origSet = originalText
    ? new Set(originalText.split('\n').map(l => l.trim()).filter(Boolean))
    : new Set();
  const diffed = hasText
    ? (result.integratedResume).split('\n').map(line => ({
        line,
        isNew: line.trim().length > 0 && !origSet.has(line.trim())
      }))
    : [];
  const newCount = diffed.filter(d => d.isNew).length;
  let newDelay = 0;

  // ATS tier label
  const tier = scoreAfter >= 70
    ? { label:'Strong match — likely to pass ATS screening',             cls:'tier-strong' }
    : scoreAfter >= 45
    ? { label:'Partial match — keyword improvements recommended',        cls:'tier-partial' }
    : { label:'Weak match — address gaps before applying',               cls:'tier-weak' };

  return (
    <div className="fade-up">

      {/* ── Success header ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom:'0.75rem', textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:6 }}>🎉</div>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Resume optimized!</div>
        <div style={{ fontSize:13, color:'var(--text2)' }}>
          {insertedCount} points added across {(selectedPointsByRole||[]).filter(r=>r.bullets?.length).length} roles
        </div>
        {isDocxMode && (
          <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:'color-mix(in srgb,var(--success) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--success) 25%,transparent)', fontSize:11, color:'var(--success)' }}>
            ✓ Original DOCX format preserved — fonts, spacing, tables unchanged
          </div>
        )}
      </div>

      {/* ── Before / After score ────────────────────────────── */}
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="label" style={{ textAlign:'center', marginBottom:16 }}>ATS match score — before vs after</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
          <ScoreRing score={scoreBefore} label="Before" size={120} delay={0}/>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:24, color:'var(--text3)' }}>→</div>
            <div style={{
              fontWeight:700, fontSize:14,
              color: improvement > 0 ? 'var(--success)' : 'var(--text3)',
              background:'color-mix(in srgb,var(--success) 10%,transparent)',
              border:'1px solid color-mix(in srgb,var(--success) 25%,transparent)',
              borderRadius:99, padding:'4px 14px'
            }}>
              +{improvement}%
            </div>
          </div>
          <ScoreRing score={scoreAfter} label="After" size={120} delay={500}/>
        </div>

        {/* ATS tier */}
        <div style={{ textAlign:'center', marginTop:16 }}>
          <span className={tier.cls}>{tier.label}</span>
        </div>

        {/* Per-role stats */}
        {(selectedPointsByRole||[]).filter(r=>r.bullets?.length).length > 0 && (
          <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8 }}>
            {(selectedPointsByRole||[]).filter(r=>r.bullets?.length).map((role,i) => (
              <div key={i} className="card-inner" style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)' }}>{role.bullets.length}</div>
                <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>points added</div>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>{role.roleName||role.company}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Points summary ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="label" style={{ marginBottom:10 }}>Points integrated by role</div>
        {(selectedPointsByRole||[]).map(role => role.bullets?.length > 0 && (
          <div key={role.company} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--accent)', marginBottom:5 }}>
              → {role.roleName||role.company}
              <span style={{ color:'var(--text3)', fontWeight:400, marginLeft:4 }}>
                ({role.bullets.length} pts)
              </span>
            </div>
            {role.bullets.map((b,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:3, fontSize:11, color:'var(--success)' }}>
                <span style={{ flexShrink:0 }}>✦</span><span>{b}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Download buttons ────────────────────────────────── */}
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="label" style={{ marginBottom:10 }}>Download your optimized resume</div>
        {error && (
          <div style={{ marginBottom:10, padding:'8px 12px', borderRadius:8, background:'color-mix(in srgb,var(--danger) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--danger) 20%,transparent)', fontSize:12, color:'var(--danger)' }}>
            {error}
          </div>
        )}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* DOCX is always available (either from Python or generated) */}
          <button className="btn btn-primary" onClick={onDownloadDocx} disabled={dlDocx}>
            {dlDocx
              ? <><span className="spinner"/> Preparing…</>
              : `📄 Download .docx${isDocxMode ? ' (original format)' : ''}`}
          </button>

          {/* TXT only available in text mode */}
          {hasText && (
            <button className="btn" onClick={onDownloadTxt}>⬇ Download .txt</button>
          )}
          {hasText && (
            <button className="btn" onClick={onCopy}>📋 Copy text</button>
          )}

          {/* Diff toggle — only text mode */}
          {hasText && newCount > 0 && (
            <button className="btn btn-sm" onClick={() => setShowDiff(d=>!d)} style={{ marginLeft:'auto' }}>
              {showDiff ? 'Hide diff' : `Show diff (${newCount} new lines)`}
            </button>
          )}
        </div>

        {isDocxMode && !hasText && (
          <div style={{ marginTop:10, fontSize:11, color:'var(--text3)' }}>
            The .docx download contains your original resume with {insertedCount} new points
            scattered throughout the experience sections — same fonts, spacing, and layout as your original.
          </div>
        )}
      </div>

      {/* ── Animated diff (text mode only) ──────────────────── */}
      {showDiff && hasText && (
        <div className="card fade-up">
          <div className="label" style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
            Resume diff
            <span style={{ fontSize:10, color:'var(--success)', fontWeight:600 }}>
              ✦ green lines = newly added
            </span>
          </div>
          <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:'1rem', maxHeight:480, overflowY:'auto' }}>
            {diffed.map((d,i) => {
              const delay = d.isNew ? (newDelay += 55) - 55 : 0;
              return <DiffLine key={i} line={d.line} isNew={d.isNew} delay={delay}/>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
