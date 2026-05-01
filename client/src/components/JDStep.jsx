import React, { useState } from 'react';
import { jdApi } from '../lib/api';

const SAMPLE_JD = `Cloud Engineer - Merrimack NH - Hybrid - Contract W2/C2C

Responsibilities:
- Developing cloud infrastructure, spin up EC2, deploying databases onto VMs
- Adding automation scripts for deployment of tools
- Enabling automation for Oracle functions (observer, oracle auditing, OEM)
- Developing shell scripts for automation via Jenkins
- CloudFormation, Terraform going to OpenTofu, Jenkins, GIT, Artifactory
- Python is a nice to have

Requirements:
- Experience in large database hybrid environment on-prem and public cloud
- DevOps pipelines and automation experience
- AWS and Azure IAAS including migrating databases from on-prem to cloud
- Oracle RAC and Exadata design and implementation
- DataDog, OEM, OTEL monitoring and alerting
- 12+ years Oracle DBA Performance Engineering Replication Engineering
- Golden Gate replication on Oracle RAC and Exadata
- CI/CD with GitHub, Artifactory, Jenkins
- Python, Groovy, Java, shell scripting`;

export default function JDStep({ onComplete, onBack }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null);

  const handleParse = async () => {
    if (!text.trim() || text.length < 30) { setError('Please paste a job description'); return; }
    setError(''); setLoading(true);
    try {
      const res = await jdApi.parse(text);
      setParsed(res.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card fade-up">
      <div className="section-title">Paste job description</div>
      <div className="section-sub">Claude extracts required skills, preferred skills, and key responsibilities.</div>

      <textarea
        className="input resize-y mb-3 text-sm leading-relaxed"
        rows={10}
        placeholder="Paste the full job description here..."
        value={text}
        onChange={e => { setText(e.target.value); setParsed(null); }}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-3">{error}</div>
      )}

      <div className="flex justify-between items-center mb-5">
        <button className="btn btn-sm" onClick={() => { setText(SAMPLE_JD); setParsed(null); }}>Load sample JD</button>
        <button className="btn btn-primary" onClick={handleParse} disabled={loading || !text.trim()}>
          {loading ? <><span className="spinner" /> Parsing...</> : 'Parse JD →'}
        </button>
      </div>

      {parsed && (
        <div className="fade-up space-y-4">
          <div className="card-inner">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500
                              flex items-center justify-center text-white text-lg">💼</div>
              <div>
                <div className="font-semibold text-slate-100">{parsed.title || 'Role'}</div>
                {parsed.company && <div className="text-xs text-slate-400">{parsed.company}</div>}
              </div>
              {parsed.yearsRequired > 0 && (
                <span className="badge badge-purple ml-auto">{parsed.yearsRequired}+ yrs required</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="label mb-2">Required skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {(parsed.required || []).map(s => <span key={s} className="badge badge-red">{s}</span>)}
                </div>
              </div>
              <div>
                <div className="label mb-2">Preferred skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {(parsed.preferred || []).map(s => <span key={s} className="badge badge-blue">{s}</span>)}
                </div>
              </div>
            </div>

            {(parsed.responsibilities || []).length > 0 && (
              <div className="mt-4">
                <div className="label mb-2">Key responsibilities</div>
                {parsed.responsibilities.slice(0, 4).map((r, i) => (
                  <div key={i} className="text-xs text-slate-400 flex gap-2 mb-1">
                    <span className="text-indigo-500 flex-shrink-0">▸</span>{r}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button className="btn" onClick={onBack}>← Back</button>
            <button className="btn btn-primary" onClick={() => onComplete(parsed, text)}>Run AI analysis →</button>
          </div>
        </div>
      )}

      {!parsed && (
        <div className="flex justify-between">
          <button className="btn" onClick={onBack}>← Back</button>
        </div>
      )}
    </div>
  );
}
