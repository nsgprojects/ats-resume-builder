import React, { useState } from 'react';
import { integrateApi, exportApi } from '../lib/api';
import BeforeAfterDashboard from './BeforeAfterDashboard';

export default function ExportStep({
  resumeText, resumeParsed, originalDocxBase64,
  extractedExperiences, detectedFormat,
  selectedPointsByRole, analysis, onBack
}) {
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [dlDocx,    setDlDocx]    = useState(false);

  const totalPoints = (selectedPointsByRole||[]).reduce((s,r) => s+(r.bullets||[]).length, 0);

  const integrate = async () => {
    setError(''); setLoading(true);
    try {
      const res = await integrateApi.run({
        resumeText, resumeParsed, selectedPointsByRole,
        extractedExperiences, detectedFormat,
        ...(originalDocxBase64 && { originalDocxBase64 })
      });
      setResult(res.data);
    } catch(e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const downloadDocx = async () => {
    if (!result) return;
    setDlDocx(true);
    try {
      if (result.resultDocxBase64) {
        await exportApi.docxFromBase64(result.resultDocxBase64);
      } else if (result.integratedResume) {
        await exportApi.docxFromText(result.integratedResume, result.insertedBullets||[]);
      }
    } catch(e) { setError('Download failed: ' + e.message); }
    finally { setDlDocx(false); }
  };

  const downloadTxt = () => {
    if (!result?.integratedResume) return;
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(result.integratedResume);
    a.download = 'optimized_resume.txt';
    a.click();
  };

  const copy = () => {
    if (result?.integratedResume)
      navigator.clipboard.writeText(result.integratedResume).then(() => alert('Copied!'));
  };

  // ── After integration: Dashboard 3 ───────────────────────
  if (result) {
    return (
      <BeforeAfterDashboard
        originalText={resumeText}
        result={result}                        /* pass full result, not just integratedResume */
        selectedPointsByRole={selectedPointsByRole}
        analysis={analysis}
        dlDocx={dlDocx}
        onDownloadDocx={downloadDocx}
        onDownloadTxt={downloadTxt}
        onCopy={copy}
        error={error}
      />
    );
  }

  // ── Confirm view ──────────────────────────────────────────
  return (
    <div className="card fade-up">
      <div className="section-title">Confirm &amp; integrate</div>
      <div className="section-sub">
        {originalDocxBase64
          ? 'Your original DOCX will be used — fonts, spacing, tables, and layout preserved exactly.'
          : 'Text mode — no original DOCX found. Points will be appended as plain text.'}
      </div>

      {!confirmed ? (
        <>
          {/* DOCX present — green confirmation */}
          {originalDocxBase64 && (
            <div style={{ marginBottom:'1rem', padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--success) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--success) 20%,transparent)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>📄</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--success)' }}>DOCX mode active</div>
                <div style={{ fontSize:11, color:'var(--text2)' }}>Points inserted directly into original file — no formatting changes</div>
              </div>
            </div>
          )}

          {/* DOCX missing — amber warning, explains what will happen */}
          {!originalDocxBase64 && (
            <div style={{ marginBottom:'1rem', padding:'12px 16px', borderRadius:10, background:'color-mix(in srgb,var(--warning) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--warning) 25%,transparent)' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--warning)', marginBottom:4 }}>
                ⚠ Original DOCX not found in session
              </div>
              <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
                Your resume was uploaded as a DOCX but the original binary is no longer in session state.
                This usually happens if the page was refreshed mid-flow.<br/>
                <strong>Recommended:</strong> Go back to step 1, re-upload your DOCX file, and run through the flow again without refreshing.
                The output will then preserve your original fonts, tables, and layout exactly.
              </div>
            </div>
          )}

          <div style={{ marginBottom:'1rem', padding:'12px 16px', borderRadius:10, background:'color-mix(in srgb,var(--accent) 6%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 20%,transparent)' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>
              {totalPoints} points ready across {(selectedPointsByRole||[]).filter(r=>r.bullets?.length).length} roles
            </div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>
              Scattered at random positions within each role's responsibilities section
            </div>
          </div>

          {(selectedPointsByRole||[]).map((role,ri) => role.bullets?.length > 0 && (
            <div key={ri} className="card-inner" style={{ marginBottom:'0.625rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:4, height:20, background:'var(--accent)', borderRadius:99, flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{role.roleName}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{role.company}{role.dates ? ` · ${role.dates}` : ''}</div>
                </div>
                <span className="badge badge-indigo" style={{ marginLeft:'auto' }}>{role.bullets.length} pts</span>
              </div>
              {role.bullets.map((b,bi) => (
                <div key={bi} style={{ display:'flex', gap:8, padding:'6px 10px', borderRadius:8, border:'1px solid color-mix(in srgb,var(--success) 20%,transparent)', background:'color-mix(in srgb,var(--success) 5%,transparent)', color:'var(--success)', fontSize:11, lineHeight:1.5, marginBottom:4 }}>
                  <span style={{ flexShrink:0 }}>✦</span><span>{b}</span>
                </div>
              ))}
            </div>
          ))}

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1rem' }}>
            <button className="btn" onClick={onBack}>← Back</button>
            {originalDocxBase64
              ? <button className="btn btn-primary" onClick={() => setConfirmed(true)}>Looks good →</button>
              : <button className="btn" style={{ opacity:0.5, cursor:'not-allowed' }} disabled title="Re-upload your DOCX first to preserve formatting">
                  Re-upload DOCX to continue
                </button>
            }
          </div>
        </>
      ) : (
        <>
          <div className="card-inner" style={{ display:'flex', alignItems:'center', gap:12, padding:'1rem', marginBottom:'1rem' }}>
            <div style={{ fontSize:28 }}>🚀</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Generating optimized resume</div>
              <div style={{ fontSize:11, color:'var(--text2)' }}>
                {originalDocxBase64
                  ? `Inserting ${totalPoints} points into original DOCX — all formatting preserved`
                  : `Inserting ${totalPoints} points into text resume`}
              </div>
            </div>
          </div>
          {error && (
            <div style={{ marginBottom:'0.75rem', padding:'10px 14px', borderRadius:10, background:'color-mix(in srgb,var(--danger) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--danger) 25%,transparent)', fontSize:12, color:'var(--danger)' }}>
              {error}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <button className="btn" onClick={() => setConfirmed(false)}>← Back</button>
            <button className="btn btn-primary" onClick={integrate} disabled={loading}>
              {loading ? <><span className="spinner"/> Integrating…</> : 'Generate final resume →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
