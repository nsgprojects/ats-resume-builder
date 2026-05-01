import React, { useState, useEffect } from 'react';
import UploadStep      from './components/UploadStep';
import JDStep          from './components/JDStep';
import AnalysisStep    from './components/AnalysisStep';
import MatchDashboard  from './components/MatchDashboard';
import PreviewStep     from './components/PreviewStep';
import GapAnalysisStep from './components/GapAnalysisStep';
import ExportStep      from './components/ExportStep';
import ThemeToggle     from './components/ThemeToggle';
import { useTheme }    from './hooks/useTheme';
import { SVK_LOGO }    from './lib/svkLogo';
import { healthApi, gapsApi } from './lib/api';

const TABS = [
  { id:1,   label:'Resume',          icon:'📄' },
  { id:2,   label:'Job Description', icon:'💼' },
  { id:3,   label:'AI Analysis',     icon:'🧠' },
  { id:3.5, label:'Dashboard',       icon:'📊' },
  { id:4,   label:'Preview & Select',icon:'✅' },
  { id:6,   label:'Export',          icon:'🚀' },
];

export default function App() {
  const { dark, toggle }                    = useTheme();
  const [step,             setStep]         = useState(1);
  const [health,           setHealth]       = useState(null);
  const [resumeParsed,     setResumeParsed] = useState(null);
  const [resumeText,       setResumeText]   = useState('');
  const [resumeDocxBase64, setResumeDocx]   = useState(null);
  const [jdParsed,         setJdParsed]     = useState(null);
  const [jdText,           setJdText]       = useState('');
  const [analysis,         setAnalysis]     = useState(null);
  const [gapData,          setGapData]      = useState(null);
  const [selectedByRole,   setSelected]     = useState([]);
  const [extractedExps,    setExtractedExps] = useState([]);
  const [detectedFormat,   setDetectedFormat]= useState('E');

  useEffect(() => {
    healthApi.check().then(setHealth).catch(() => setHealth({ status:'error' }));
  }, []);

  const go = n => setStep(n);

  const runGapAnalysis = async () => {
    const res = await gapsApi.run({ resumeText, resumeParsed, jdText, jdParsed });
    setGapData(res.data);
  };

  // Init theme on body background immediately
  useEffect(() => {
    document.body.style.background = 'var(--bg)';
  }, [dark]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', transition:'background 0.5s' }}>

      {/* Subtle background decoration */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:0, left:'25%', width:400, height:400, background:`color-mix(in srgb,var(--accent) 4%,transparent)`, borderRadius:'50%', filter:'blur(80px)' }}/>
        <div style={{ position:'absolute', bottom:'25%', right:'20%', width:300, height:300, background:`color-mix(in srgb,var(--success) 3%,transparent)`, borderRadius:'50%', filter:'blur(80px)' }}/>
      </div>

      {/* Header */}
      <header className="glass" style={{ position:'sticky', top:0, zIndex:20 }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 1rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'0.75rem', paddingBottom:'0.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <img src={SVK_LOGO} alt="SVK Systems" style={{ height:40, objectFit:'contain' }}/>
              <div style={{ borderLeft:'1px solid var(--border)', paddingLeft:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>ATS Resume Builder</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>v2.0 · Powered by Claude AI</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {resumeDocxBase64 && <span className="badge badge-green" style={{ fontSize:10 }}>DOCX ✓</span>}
              {health && (
                <span className={`badge ${health.status==='ok'&&health.ai==='configured'?'badge-green':'badge-red'}`} style={{ fontSize:10 }}>
                  {health.status==='ok'?(health.ai==='configured'?'● AI ready':'⚠ API key missing'):'✗ Server error'}
                </span>
              )}
              <ThemeToggle dark={dark} onToggle={toggle}/>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display:'flex', overflowX:'auto', marginBottom:'-1px' }}>
            {TABS.map(tab => {
              const done   = tab.id < step;
              const active = tab.id === step;
              return (
                <button key={tab.id}
                  onClick={() => done ? go(tab.id) : undefined}
                  className={`tab-item${active?' active':done?' done':''}`}>
                  <span className="tab-num" style={{
                    background: active ? 'var(--accent)' : done ? 'color-mix(in srgb,var(--success) 15%,transparent)' : 'var(--bg3)',
                    color: active ? 'white' : done ? 'var(--success)' : 'var(--text3)'
                  }}>
                    {done ? '✓' : tab.id === 3.5 ? '📊' : tab.id}
                  </span>
                  <span className="hidden-mobile">{tab.label}</span>
                  <span className="show-mobile">{tab.icon}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:2, background:'var(--border)' }}>
          <div style={{
            height:'100%',
            background:'linear-gradient(90deg,var(--accent),var(--success))',
            transition:'width 0.5s ease',
            width: `${(([1,2,3,3.5,4,6].indexOf(step)) / 5) * 100}%`
          }}/>
        </div>
      </header>

      {/* API key warning */}
      {health?.ai === 'missing' && (
        <div style={{ maxWidth:1280, margin:'1rem auto', padding:'0 1rem' }}>
          <div style={{ padding:'12px 16px', borderRadius:12, background:'color-mix(in srgb,var(--warning) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--warning) 25%,transparent)', fontSize:12, color:'var(--warning)' }}>
            <strong>Setup required:</strong> Add your Anthropic API key to <code style={{ background:'color-mix(in srgb,var(--warning) 15%,transparent)', padding:'1px 5px', borderRadius:4 }}>server/.env</code> as <code style={{ background:'color-mix(in srgb,var(--warning) 15%,transparent)', padding:'1px 5px', borderRadius:4 }}>ANTHROPIC_API_KEY</code>.
            {' '}Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:'var(--warning)', textDecoration:'underline' }}>console.anthropic.com</a>
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'1.25rem 1rem', position:'relative', zIndex:1 }}>
        {step===1 && (
          <UploadStep onComplete={(p,raw,docx,exps,fmt) => { setResumeParsed(p); setResumeText(raw); setResumeDocx(docx||null); setExtractedExps(exps||[]); setDetectedFormat(fmt||'E'); go(2); }}/>
        )}
        {step===2 && (
          <JDStep onComplete={(p,raw) => { setJdParsed(p); setJdText(raw); go(3); }} onBack={() => go(1)}/>
        )}
        {step===3 && (
          <AnalysisStep
            resumeText={resumeText} resumeParsed={resumeParsed}
            jdText={jdText} jdParsed={jdParsed}
            onComplete={r => { setAnalysis(r); go(3.5); }}
            onBack={() => go(2)}/>
        )}
        {step===3.5 && analysis && (
          <MatchDashboard
            analysis={analysis}
            gapData={gapData}
            onRunGaps={runGapAnalysis}
            onContinue={() => go(4)}
            onBack={() => go(3)}/>
        )}
        {step===4 && analysis && (
          <PreviewStep
            analysis={analysis}
            onComplete={pts => { setSelected(pts); go(6); }}
            onBack={() => go(3.5)}
            onGapAnalysis={() => go(3.5)}/>
        )}
        {step===6 && (
          <ExportStep
            resumeText={resumeText}
            resumeParsed={resumeParsed}
            originalDocxBase64={resumeDocxBase64}
            extractedExperiences={extractedExps}
            detectedFormat={detectedFormat}
            selectedPointsByRole={selectedByRole}
            analysis={analysis}
            onBack={() => go(4)}/>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        position:'relative', zIndex:1,
        borderTop:'1px solid var(--border)',
        background:'var(--bg2)',
        marginTop:'2rem', padding:'1rem 1.5rem',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:12
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={SVK_LOGO} alt="SVK Systems" style={{ height:28, objectFit:'contain' }}/>
          <span style={{ fontSize:11, color:'var(--text3)' }}>
            © {new Date().getFullYear()} SVK Systems IT Experts. All rights reserved.
          </span>
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', textAlign:'right' }}>
          ATS Resume Builder v2.0 · Powered by Claude AI · Built by SVK Systems
        </div>
      </footer>
    </div>
  );
}
