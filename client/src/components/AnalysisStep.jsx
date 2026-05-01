import React, { useState } from 'react';
import { analysisApi } from '../lib/api';

// ── Score ring ───────────────────────────────────────────────
function ScoreRing({ score, size = 130 }) {
  const r = size * 0.38, circ = 2 * Math.PI * r;
  const sc = Math.round(score);
  const color = sc >= 70 ? 'var(--success)' : sc >= 45 ? 'var(--warning)' : 'var(--danger)';
  const offset = circ - (sc / 100) * circ;
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={size*0.08}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.08}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:size*0.24, fontWeight:700, color, lineHeight:1 }}>{sc}%</span>
        <span style={{ fontSize:size*0.11, color:'var(--text3)' }}>match</span>
      </div>
    </div>
  );
}

// ── Priority badge ───────────────────────────────────────────
function PriorityBadge({ p }) {
  const m = { HIGH:['badge-red','🔴'], MEDIUM:['badge-amber','🟡'], LOW:['badge-gray','⚪'] };
  const [cls, icon] = m[p] || m.LOW;
  return <span className={`badge ${cls}`}>{icon} {p}</span>;
}

// ── Confidence badge ─────────────────────────────────────────
function ConfBadge({ c }) {
  const m = { HIGH:'badge-green', MEDIUM:'badge-amber', LOW:'badge-gray' };
  return <span className={`badge ${m[c]||'badge-gray'}`}>{c}</span>;
}

// ── Loading stepper ──────────────────────────────────────────
function Stepper({ steps, current, label }) {
  return (
    <div style={{ padding:'3rem 0', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
      <div className="spinner spinner-lg"/>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:6 }}>{steps[current]?.icon}</div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{steps[current]?.text}</div>
        {label && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{label}</div>}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {steps.map((_,i) => (
          <div key={i} style={{ width:8, height:8, borderRadius:'50%', transition:'background 0.3s',
            background: i <= current ? 'var(--accent)' : 'var(--bg4)' }}/>
        ))}
      </div>
    </div>
  );
}

const GAP_STEPS = [
  { icon:'📄', text:'Reading full resume…' },
  { icon:'💼', text:'Reading full JD…' },
  { icon:'🔍', text:'Identifying skill gaps…' },
  { icon:'📊', text:'Computing match score…' },
];
const GEN_STEPS = [
  { icon:'🧠', text:'Analysing role context…' },
  { icon:'✍️', text:'Generating targeted bullets…' },
  { icon:'🔗', text:'Combining ecosystems…' },
  { icon:'✅', text:'Finalising 30 bullets…' },
];

// ════════════════════════════════════════════════════════════

export default function AnalysisStep({ resumeText, resumeParsed, jdText, jdParsed, onComplete, onBack }) {
  // Phase: 'idle' → 'gap-loading' → 'gap-review' → 'gen-loading' → 'done'
  const [phase,      setPhase]      = useState('idle');
  const [loadStep,   setLoadStep]   = useState(0);
  const [error,      setError]      = useState('');
  const [gapData,    setGapData]    = useState(null);   // Call 1 result
  const [editedGaps, setEditedGaps] = useState([]);     // user-confirmed gaps
  const [genResult,  setGenResult]  = useState(null);   // Call 2 result

  // ── Call 1 — gap analysis ────────────────────────────────
  const runGapAnalysis = async () => {
    setError(''); setPhase('gap-loading'); setLoadStep(0);
    const iv = setInterval(() => setLoadStep(s => Math.min(s+1, 3)), 2800);
    try {
      const res = await analysisApi.gaps({ resumeText, resumeParsed, jdText, jdParsed });
      setGapData(res.data);
      // Pre-select all HIGH + MEDIUM gaps for the user to review
      const preSelected = (res.data.missingSkills || [])
        .filter(g => g.priority !== 'LOW')
        .map(g => g.skill || g);
      setEditedGaps(preSelected);
      setPhase('gap-review');
    } catch(e) {
      setError(e.message);
      setPhase('idle');
    } finally { clearInterval(iv); }
  };

  // ── Call 2 — bullet generation ───────────────────────────
  const runGeneration = async () => {
    setError(''); setPhase('gen-loading'); setLoadStep(0);
    const iv = setInterval(() => setLoadStep(s => Math.min(s+1, 3)), 3000);
    try {
      const res = await analysisApi.generate({
        gapAnalysis:    gapData,
        resumeText,
        jdText,
        confirmedGaps:  editedGaps
      });
      const combined = {
        matchScore:    gapData.matchScore    || 0,
        industry:      gapData.industry      || '',
        yearsInResume: gapData.yearsInResume || 0,
        yearsInJD:     gapData.yearsInJD     || 0,
        matchedSkills: gapData.matchedSkills || [],
        missingSkills: (gapData.missingSkills||[]).map(g=>g.skill||g),
        gapDetails:    gapData.missingSkills || [],
        ecosystemGaps: (gapData.ecosystemGaps||[]).map(g=>g.name||g),
        keyThemes:     gapData.keyThemes     || [],
        roleAnalysis:  (res.data.roles||[]).map(r => ({
          roleIndex:       r.roleIndex,
          company:         r.company,
          roleName:        r.roleName,
          dates:           r.dates,
          existingBullets: (resumeParsed?.experiences||[])[r.roleIndex]?.bullets || [],
          suggestedPoints: r.suggestedPoints || []
        }))
      };
      setGenResult(combined);
      setPhase('done');
    } catch(e) {
      setError(e.message);
      setPhase('gap-review');
    } finally { clearInterval(iv); }
  };

  const toggleGap = (skill) => {
    setEditedGaps(prev =>
      prev.includes(skill) ? prev.filter(g => g !== skill) : [...prev, skill]
    );
  };

  const sc    = Math.round(gapData?.matchScore || 0);
  const total = (genResult?.roleAnalysis||[]).reduce((s,r)=>s+(r.suggestedPoints||[]).length,0);
  const yrsResume = gapData?.yearsInResume || 0;
  const yrsJD     = gapData?.yearsInJD    || 0;
  const yrsDiff   = yrsJD > 0 && yrsResume > 0 ? yrsJD - yrsResume : 0;

  return (
    <div className="card fade-up">
      <div className="section-title">AI analysis</div>
      <div className="section-sub">
        Two-step process: first identifies skill gaps, then generates targeted bullets per role.
      </div>

      {/* ── IDLE ─────────────────────────────────────────── */}
      {phase === 'idle' && (
        <>
          <div className="card-inner" style={{ marginBottom:'1rem' }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ fontSize:24 }}>🔍</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Step 1 — Gap Analysis</div>
                <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
                  Reads your full resume and full JD. Returns matched skills, missing skills with priority,
                  ecosystem gaps, and your ATS match score. You review and confirm the gap list before any bullets are generated.
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ fontSize:24 }}>✍️</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Step 2 — Bullet Generation</div>
                <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
                  Uses the confirmed gaps, your role-specific tech, and JD themes to generate
                  10 gap-targeted bullets per role with evidence-based confidence scores.
                </div>
              </div>
            </div>
          </div>
          {error && <div style={{ marginBottom:'0.75rem', padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--danger) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--danger) 25%,transparent)', fontSize:12, color:'var(--danger)' }}>{error}</div>}
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.75rem' }} onClick={runGapAnalysis}>
            Step 1 — Run gap analysis →
          </button>
          <div style={{ marginTop:'0.75rem', display:'flex', justifyContent:'space-between' }}>
            <button className="btn" onClick={onBack}>← Back</button>
          </div>
        </>
      )}

      {/* ── LOADING: GAP ─────────────────────────────────── */}
      {phase === 'gap-loading' && <Stepper steps={GAP_STEPS} current={loadStep} label={`Sending full resume (${Math.min((resumeText||'').length, 8000)} chars) + full JD`}/>}

      {/* ── GAP REVIEW ───────────────────────────────────── */}
      {phase === 'gap-review' && gapData && (
        <div className="fade-up">

          {/* Score + years */}
          <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
            <div className="card-inner" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ScoreRing score={sc}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {/* Years gap warning */}
              {yrsDiff > 0 && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--warning) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--warning) 25%,transparent)' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--warning)', marginBottom:2 }}>
                    ⚠ Experience gap: JD requires {yrsJD}+ years — your resume shows {yrsResume} years
                  </div>
                  <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.5 }}>
                    You are {yrsDiff} years short. The generated bullets will emphasise depth, scale,
                    and strategic ownership to compensate. This has been factored into the match score.
                  </div>
                </div>
              )}
              {yrsDiff <= 0 && yrsJD > 0 && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--success) 6%,transparent)', border:'1px solid color-mix(in srgb,var(--success) 20%,transparent)', fontSize:11, color:'var(--success)' }}>
                  ✓ Experience: {yrsResume} years (JD requires {yrsJD}+) — you meet the requirement
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  { v:(gapData.matchedSkills||[]).length, l:'Matched skills',  c:'var(--success)' },
                  { v:(gapData.missingSkills||[]).length, l:'Skill gaps',       c:'var(--danger)'  },
                  { v:(gapData.ecosystemGaps||[]).length, l:'Ecosystem gaps',  c:'var(--warning)' },
                  { v:(gapData.keyThemes||[]).length,     l:'JD themes',       c:'var(--accent)'  },
                ].map(m => (
                  <div key={m.l} className="card-inner" style={{ textAlign:'center', padding:'8px' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:m.c }}>{m.v}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{m.l}</div>
                  </div>
                ))}
              </div>
              {gapData.industry && (
                <div style={{ fontSize:11, color:'var(--text2)' }}>
                  Detected domain: <strong style={{ color:'var(--accent)' }}>{gapData.industry}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Matched skills */}
          <div className="card-inner" style={{ marginBottom:'0.625rem' }}>
            <div className="label" style={{ marginBottom:6 }}>Matched skills ✓</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {(gapData.matchedSkills||[]).map(s => <span key={s} className="badge badge-green">{s}</span>)}
            </div>
          </div>

          {/* Gap review — user can toggle */}
          <div className="card-inner" style={{ marginBottom:'0.625rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="label">Skill gaps — review &amp; confirm ({editedGaps.length} selected)</div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-sm" onClick={() => setEditedGaps((gapData.missingSkills||[]).map(g=>g.skill||g))}>All</button>
                <button className="btn btn-sm" onClick={() => setEditedGaps([])}>None</button>
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>
              Checked gaps drive bullet generation. Uncheck any that aren't relevant to you.
            </div>
            {(gapData.missingSkills||[]).map((g, i) => {
              const skill   = g.skill || g;
              const checked = editedGaps.includes(skill);
              return (
                <div key={i} onClick={() => toggleGap(skill)} style={{
                  display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px',
                  borderRadius:8, marginBottom:4, cursor:'pointer', transition:'all 0.15s',
                  background: checked ? 'color-mix(in srgb,var(--accent) 6%,transparent)' : 'var(--bg3)',
                  border: `1px solid ${checked ? 'color-mix(in srgb,var(--accent) 25%,transparent)' : 'var(--border)'}`
                }}>
                  <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, marginTop:1,
                    background: checked ? 'var(--accent)' : 'var(--bg4)',
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border2)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:10
                  }}>{checked && '✓'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{skill}</span>
                      {g.priority && <PriorityBadge p={g.priority}/>}
                    </div>
                    {g.context && <div style={{ fontSize:11, color:'var(--text2)' }}>{g.context}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ecosystem gaps */}
          {(gapData.ecosystemGaps||[]).length > 0 && (
            <div className="card-inner" style={{ marginBottom:'0.625rem' }}>
              <div className="label" style={{ marginBottom:6 }}>Ecosystem gaps</div>
              {(gapData.ecosystemGaps||[]).map((g,i) => (
                <div key={i} style={{ padding:'6px 10px', borderRadius:8, marginBottom:4, background:'color-mix(in srgb,var(--warning) 6%,transparent)', border:'1px solid color-mix(in srgb,var(--warning) 20%,transparent)' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--warning)' }}>{g.name||g}</div>
                  {g.description && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{g.description}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Overall recommendation */}
          {gapData.overallRecommendation && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--accent) 6%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 20%,transparent)', fontSize:11, color:'var(--text2)', lineHeight:1.6, marginBottom:'0.75rem' }}>
              💡 <strong>Strategy:</strong> {gapData.overallRecommendation}
            </div>
          )}

          {error && <div style={{ marginBottom:'0.75rem', padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--danger) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--danger) 25%,transparent)', fontSize:12, color:'var(--danger)' }}>{error}</div>}

          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <button className="btn" onClick={() => setPhase('idle')}>← Back</button>
            <button className="btn btn-primary" onClick={runGeneration} disabled={editedGaps.length === 0}>
              Step 2 — Generate {editedGaps.length} gap-targeted bullets →
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING: GENERATION ──────────────────────────── */}
      {phase === 'gen-loading' && <Stepper steps={GEN_STEPS} current={loadStep} label={`Targeting ${editedGaps.length} confirmed gaps across 3 roles`}/>}

      {/* ── DONE ─────────────────────────────────────────── */}
      {phase === 'done' && genResult && (
        <div className="fade-up">
          <div className="card-inner" style={{ display:'flex', alignItems:'center', gap:20, marginBottom:'1rem', padding:'1.25rem' }}>
            <ScoreRing score={genResult.matchScore} size={120}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>
                Analysis complete
              </div>
              {genResult.industry && (
                <div style={{ fontSize:12, color:'var(--accent)', marginBottom:8 }}>
                  Domain: {genResult.industry}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[
                  { v:(genResult.matchedSkills||[]).length, l:'Matched',    c:'var(--success)' },
                  { v:(genResult.missingSkills||[]).length, l:'Gaps found', c:'var(--danger)'  },
                  { v:total,                                l:'Bullets',    c:'var(--accent)'  },
                ].map(m => (
                  <div key={m.l} style={{ background:'var(--bg3)', borderRadius:10, padding:'8px', textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:m.c }}>{m.v}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-role preview */}
          {(genResult.roleAnalysis||[]).map((role, ri) => (
            <div key={ri} className="card-inner" style={{ marginBottom:'0.625rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{role.roleName}</div>
                  <div style={{ fontSize:11, color:'var(--accent)' }}>{role.company}</div>
                </div>
                <span className="badge badge-indigo">{(role.suggestedPoints||[]).length} bullets</span>
              </div>
              {(role.suggestedPoints||[]).slice(0,2).map((p,i) => (
                <div key={i} style={{ display:'flex', gap:6, marginBottom:4, fontSize:11, color:'var(--text2)', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', gap:4, flexShrink:0, marginTop:1 }}>
                    <ConfBadge c={p.confidence}/>
                  </div>
                  <span style={{ flex:1 }}>{p.text}</span>
                </div>
              ))}
              {(role.suggestedPoints||[]).length > 2 && (
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>
                  +{(role.suggestedPoints||[]).length - 2} more bullets — view all in Preview step
                </div>
              )}
            </div>
          ))}

          {error && <div style={{ marginBottom:'0.75rem', padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--danger) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--danger) 25%,transparent)', fontSize:12, color:'var(--danger)' }}>{error}</div>}

          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <button className="btn" onClick={() => setPhase('gap-review')}>← Edit gaps</button>
            <button className="btn btn-primary" onClick={() => onComplete(genResult)}>
              View full dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
