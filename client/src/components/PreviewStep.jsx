import React, { useState, useMemo } from 'react';

const CONF = { HIGH:'badge-green', MEDIUM:'badge-amber', LOW:'badge-gray' };

export default function PreviewStep({ analysis, onComplete, onBack, onGapAnalysis }) {
  const roleAnalysis = analysis.roleAnalysis || [];

  // Deduplicate across all roles
  const deduped = useMemo(() => {
    const seen = new Set();
    return roleAnalysis.map(role => ({
      ...role,
      suggestedPoints: (role.suggestedPoints||[]).filter(p => {
        const k = (p.text||p.t||'').slice(0,80).toLowerCase().replace(/\s+/g,' ');
        if (seen.has(k)||!k) return false;
        seen.add(k); return true;
      })
    }));
  }, [roleAnalysis]);

  const [activeRole, setActiveRole] = useState(0);

  // Start with NOTHING selected — user chooses
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(deduped.map((_,i)=>[i, new Set()]))
  );

  const toggle = (ri,pi) => setSelected(prev => {
    const s = new Set(prev[ri]||[]);
    s.has(pi) ? s.delete(pi) : s.add(pi);
    return { ...prev, [ri]:s };
  });

  const selectAll = ri => setSelected(prev => ({
    ...prev, [ri]: new Set((deduped[ri]?.suggestedPoints||[]).map((_,i)=>i))
  }));

  const clearRole = ri => setSelected(prev => ({ ...prev, [ri]: new Set() }));

  const totalSelected = Object.values(selected).reduce((s,set)=>s+set.size, 0);

  const buildPayload = () =>
    deduped.map((role,ri)=>({
      roleName: role.roleName||`Role ${ri+1}`,
      company:  role.company ||'',
      dates:    role.dates   ||'',
      bullets:  (role.suggestedPoints||[])
        .filter((_,pi)=>(selected[ri]||new Set()).has(pi))
        .map(p=>(p.text||p.t||'').trim())
        .filter(Boolean)
    })).filter(r=>r.bullets.length>0);

  const cur    = deduped[activeRole];
  const curSel = selected[activeRole]||new Set();

  return (
    <div className="card fade-up">
      <div className="section-title">Preview &amp; select points</div>
      <div className="section-sub">
        Click points to select them. Selected points will be scattered throughout each role's section in your resume.
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {deduped.map((role,i)=>{
          const sel   = (selected[i]||new Set()).size;
          const total = (role.suggestedPoints||[]).length;
          return (
            <button key={i} onClick={()=>setActiveRole(i)}
              className={`flex-shrink-0 flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border
                ${activeRole===i
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              <div className="text-xs font-semibold truncate max-w-[130px]">{role.roleName||`Role ${i+1}`}</div>
              <div className="text-xs opacity-70 truncate max-w-[130px]">{role.company}</div>
              <div className={`text-xs mt-1 font-medium
                ${sel===total&&total>0?(activeRole===i?'text-emerald-300':'text-emerald-400')
                : sel>0?'text-amber-400':'opacity-40'}`}>
                {sel}/{total} selected
              </div>
            </button>
          );
        })}
      </div>

      {cur && (
        <div className="fade-up">
          <div className="card-inner mb-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-100">{cur.roleName}</div>
              <div className="text-xs text-indigo-400">{cur.company}{cur.dates?` · ${cur.dates}`:''}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm" onClick={()=>selectAll(activeRole)}>Select all</button>
              <button className="btn btn-sm" onClick={()=>clearRole(activeRole)}>Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Existing */}
            <div>
              <div className="label mb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>
                Existing bullets
              </div>
              {(cur.existingBullets?.length?cur.existingBullets:analysis.existingPoints||[]).map((p,i)=>(
                <div key={i} className="point-red mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0 mt-1.5"/>
                  <span>{p}</span>
                </div>
              ))}
            </div>

            {/* AI suggested — click to select */}
            <div>
              <div className="label mb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>
                AI-suggested ({(cur.suggestedPoints||[]).length}) — click to select
              </div>
              {(cur.suggestedPoints||[]).map((p,i)=>{
                const isSel = curSel.has(i);
                return (
                  <div key={i}
                    className={`point-green mb-1.5 ${isSel?'selected':''}`}
                    onClick={()=>toggle(activeRole,i)}>
                    <div className={`w-4 h-4 rounded-md border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                      ${isSel?'bg-emerald-500 border-emerald-500':'border-slate-600'}`}>
                      {isSel&&(
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5">{p.text||p.t||p}</div>
                      {(p.rationale||p.r)&&<div className="text-emerald-500/60 italic text-xs">{p.rationale||p.r}</div>}
                      {(p.confidence||p.c)&&<span className={`badge ${CONF[p.confidence||p.c]||'badge-gray'} mt-1 text-xs`}>{p.confidence||p.c}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="card-inner flex items-center justify-between mb-4 py-3">
        <div className="text-sm text-slate-300">
          <span className="font-semibold text-indigo-400">{totalSelected}</span> points selected across{' '}
          <span className="font-semibold text-indigo-400">{Object.values(selected).filter(s=>s.size>0).length}</span> roles
        </div>
        <div className="flex gap-1">
          {deduped.map((_,i)=>(
            <div key={i} className={`w-2 h-2 rounded-full ${(selected[i]||new Set()).size>0?'bg-indigo-500':'bg-slate-700'}`}/>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn" onClick={onBack}>← Back</button>
        <div className="flex gap-2">
          <button className="btn" onClick={onGapAnalysis}>Gap analysis →</button>
          <button className="btn btn-primary" disabled={totalSelected===0} onClick={()=>onComplete(buildPayload())}>
            Confirm {totalSelected} pts →
          </button>
        </div>
      </div>
    </div>
  );
}
