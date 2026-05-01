import React, { useState, useRef } from 'react';
import { resumeApi } from '../lib/api';
import ResumeDashboard from './ResumeDashboard';

export default function UploadStep({ onComplete }) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [fileInfo,setFileInfo]= useState(null);
  const [dragging,setDragging]= useState(false);
  const [parsed,    setParsed]    = useState(null);
  const [docxB64,   setDocxB64]   = useState(null);
  const [extracted, setExtracted] = useState([]);
  const [fmt,       setFmt]       = useState('E');
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['docx','txt','pdf'].includes(ext)) { setError('Only .docx, .pdf, .txt supported'); return; }
    setFileInfo({ name: file.name, size: (file.size/1024).toFixed(0)+' KB' });
    setError(''); setParsed(null); setDocxB64(null); setLoading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await resumeApi.parse(fd);
      setText(res.rawText || '');
      setParsed(res.data);
      setDocxB64(res.docxBase64 || null);
      setExtracted(res.extractedExperiences || []);
      setFmt(res.detectedFormat || 'E');
    } catch(e) { setError(e.message); setFileInfo(null); }
    finally { setLoading(false); }
  };

  const handleParseText = async () => {
    const t = text.trim();
    if (!t || t.length < 80) { setError('Please add resume text (80+ characters)'); return; }
    setError(''); setParsed(null); setDocxB64(null); setLoading(true);
    try {
      const res = await resumeApi.parseText(t);
      setParsed(res.data);
      setExtracted(res.extractedExperiences || []);
      setFmt(res.detectedFormat || 'E');
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card fade-up">
      <div className="section-title">Upload your resume</div>
      <div className="section-sub">
        Supports DOCX, PDF, TXT — and multiple resume formats (Client/Duration, Company|Title|Date, plain text, and more).
      </div>

      {!parsed && (
        <>
          <label
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            style={{ marginBottom: '1rem' }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}>
            <input ref={fileRef} type="file" style={{ display:'none' }} accept=".docx,.txt,.pdf"
              onChange={e => handleFile(e.target.files[0])}/>
            {loading && fileInfo ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <div className="spinner spinner-lg"/>
                <div style={{ fontSize:13, color:'var(--text2)' }}>Parsing {fileInfo.name}…</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <div style={{ fontSize:36, marginBottom:4 }}>📄</div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text2)' }}>
                  {fileInfo ? `${fileInfo.name} · ${fileInfo.size}` : 'Drop file here or click to browse'}
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>
                  .docx (recommended for format preservation) · .pdf · .txt
                </div>
              </div>
            )}
          </label>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'0.75rem' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }}/>
            <span style={{ fontSize:11, color:'var(--text3)' }}>or paste text</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }}/>
          </div>

          {!fileInfo && (
            <textarea className="input" rows={8} style={{ resize:'vertical', marginBottom:'0.75rem', fontFamily:'monospace', fontSize:12, lineHeight:1.5 }}
              placeholder="Paste your full resume here…" value={text}
              onChange={e => setText(e.target.value)}/>
          )}

          {error && (
            <div style={{ background:'color-mix(in srgb,var(--danger) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--danger) 25%,transparent)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--danger)', marginBottom:'0.75rem' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text3)' }}>
              Supports: Client/Duration, Company|Title|Date, table formats, plain text
            </span>
            {!fileInfo && (
              <button className="btn btn-primary" onClick={handleParseText} disabled={loading || !text.trim()}>
                {loading ? <><span className="spinner"/> Parsing…</> : 'Parse resume →'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Dashboard 1 — Resume Health */}
      {parsed && <ResumeDashboard parsed={parsed}/>}

      {parsed && (
        <div style={{ marginTop:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button className="btn btn-sm" onClick={() => { setParsed(null); setFileInfo(null); setText(''); setDocxB64(null); setExtracted([]); setFmt('E'); }}>
            ← Re-upload
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {docxB64 && <span className="badge badge-green" style={{ fontSize:10 }}>DOCX — format will be preserved</span>}
            <button className="btn btn-success" onClick={() => onComplete(parsed, text, docxB64, extracted, fmt)}>
              Continue to JD →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
