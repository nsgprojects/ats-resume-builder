const express = require('express');
const router  = express.Router();
const { askClaude } = require('../services/claude');

// ── Helpers ───────────────────────────────────────────────

function calcMonths(dates) {
  if (!dates) return 0;
  const toDate = s => {
    if (!s) return null;
    const n = s.toLowerCase().trim();
    if (/present|current|now/.test(n)) return new Date();
    const y = n.match(/\b(19|20)\d{2}\b/);
    if (!y) return null;
    const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    let m = 0;
    for (let i = 0; i < MONTHS.length; i++) if (n.includes(MONTHS[i])) { m = i; break; }
    return new Date(+y[0], m);
  };
  const parts = dates.split(/\s*[-–]\s*/);
  const start = toDate(parts[0]), end = parts[1] ? toDate(parts[1]) : new Date();
  if (!start || !end) return 0;
  return Math.max(0, (end.getFullYear()-start.getFullYear())*12 + end.getMonth()-start.getMonth());
}

function seniorityTier(months) {
  if (months >= 72) return 'PRINCIPAL';
  if (months >= 24) return 'SENIOR';
  return 'MID';
}

const TIER_VERBS = {
  PRINCIPAL: 'Designed, Established, Defined, Governed, Architected, Spearheaded, Standardised, Championed, Led governance of',
  SENIOR:    'Architected, Owned, Delivered, Built, Engineered, Drove, Streamlined, Overhauled, Implemented framework for',
  MID:       'Implemented, Developed, Configured, Deployed, Integrated, Automated, Optimised, Maintained, Contributed to'
};

// Evidence-based confidence: HIGH if resume mentions the tech, MEDIUM if related, LOW if gap
function calcConfidence(bulletText, resumeText) {
  const bt = bulletText.toLowerCase();
  const rt = resumeText.toLowerCase();
  // Extract tech words from bullet (capitalised multi-char tokens)
  const techs = (bulletText.match(/\b[A-Z][a-zA-Z0-9]{2,}\b/g) || []);
  let matched = 0;
  for (const t of techs) if (rt.includes(t.toLowerCase())) matched++;
  if (matched >= Math.ceil(techs.length * 0.7)) return 'HIGH';
  if (matched >= Math.ceil(techs.length * 0.35)) return 'MEDIUM';
  return 'LOW';
}

// ─────────────────────────────────────────────────────────

/**
 * CALL 1 — Gap Analysis
 * POST /api/analysis/gaps
 * Full resume + full JD → identified gaps, matched skills, industry, role-specific context
 */
router.post('/gaps', async (req, res, next) => {
  try {
    const { resumeText, resumeParsed, jdText, jdParsed } = req.body;
    if (!resumeText || !jdText) return res.status(400).json({ error: 'resumeText and jdText required' });

    const top3 = (resumeParsed?.experiences || []).slice(0, 3);

    // Compute seniority per role
    const roleContext = top3.map((e, i) => {
      const months = calcMonths(e.dates);
      const tier   = seniorityTier(months);
      const yrs    = months >= 12 ? `${Math.floor(months/12)}y ${months%12}mo` : `${months}mo`;
      // Extract existing bullets for this role (first 3)
      const bullets = (e.bullets || []).slice(0, 3).map(b => `    - ${b}`).join('\n') || '    (none extracted)';
      return `  Role ${i+1}: "${e.role||'?'}" at "${e.company||'?'}" (${e.dates||'?'}, tenure=${yrs}, tier=${tier})\n  Existing bullets:\n${bullets}`;
    }).join('\n\n');

    const prompt = `You are a senior ATS resume strategist. Perform a thorough gap analysis.

RESUME (full):
${(resumeText||'').slice(0, 8000)}

JOB DESCRIPTION (full):
${(jdText||'').slice(0, 4000)}

TOP 3 ROLES FROM RESUME:
${roleContext}

TASK: Analyse the resume against the JD. Return ONLY this JSON:
{
  "matchScore": 72,
  "industry": "Salesforce / Cloud DevOps / Java Backend / etc — detected domain",
  "yearsInResume": 16,
  "yearsInJD": 12,
  "matchedSkills": ["skill present in both"],
  "missingSkills": [
    { "skill": "exact skill name from JD", "priority": "HIGH/MEDIUM/LOW", "context": "why this matters for the role" }
  ],
  "ecosystemGaps": [
    { "name": "gap label", "description": "what is missing", "severity": "HIGH/MEDIUM/LOW" }
  ],
  "roleContext": [
    {
      "roleIndex": 0,
      "company": "exact company name",
      "role": "exact title",
      "dates": "date string",
      "tenureMonths": 36,
      "tier": "SENIOR",
      "distinctiveTech": ["tech1","tech2","tech3"],
      "existingBullets": ["verbatim bullet 1","verbatim bullet 2"]
    }
  ],
  "keyThemes": ["theme 1 from JD", "theme 2", "theme 3"],
  "overallRecommendation": "2-sentence strategic recommendation"
}

Rules:
- matchScore: 0-100 honest ATS keyword match percentage
- industry: single label for the detected tech domain
- yearsInResume: total IT years detected from resume
- yearsInJD: required years from JD (0 if not stated)
- matchedSkills: max 12, only skills explicitly in BOTH resume and JD
- missingSkills: max 10, ordered HIGH priority first
- ecosystemGaps: max 5, technology ecosystem areas missing entirely
- roleContext: EXACTLY the top 3 roles, with real data from resume
- keyThemes: top 3-5 recurring themes/requirements from JD
- overallRecommendation: actionable strategic advice`;

    const result = await askClaude(prompt, { maxTokens: 3000 });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * CALL 2 — Bullet Generation
 * POST /api/analysis/generate
 * Uses gap analysis result + confirmed gaps → generates targeted bullets per role
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { gapAnalysis, resumeText, jdText, confirmedGaps } = req.body;
    if (!gapAnalysis || !resumeText) return res.status(400).json({ error: 'gapAnalysis and resumeText required' });

    const industry = gapAnalysis.industry || 'IT';
    const roles    = gapAnalysis.roleContext || [];

    // Use confirmed gaps if user edited them, else use all HIGH+MEDIUM gaps
    const gaps = confirmedGaps?.length
      ? confirmedGaps
      : (gapAnalysis.missingSkills || [])
          .filter(g => g.priority !== 'LOW')
          .map(g => g.skill || g);

    const METRIC_GUIDANCE = `Vary metric styles — max 2-3 per role with real numbers:
  • Quantified: "reducing deploy time by 40%", "processing 50K events/day"
  • Scale: "enterprise-wide", "across 12 environments", "for 300+ concurrent users"
  • Outcome: "enabling zero-downtime releases", "meeting SOC 2 compliance"
  • Scope: "as part of a 15-engineer programme", "spanning 3 cloud regions"
  NEVER fabricate specific percentages not implied by the resume.`;

    // Build per-role prompts with full context
    const rolePrompts = roles.map((r, i) => {
      const tier  = r.tier || 'SENIOR';
      const verbs = TIER_VERBS[tier];
      const yrs   = r.tenureMonths >= 12 ? `${Math.floor(r.tenureMonths/12)}y` : `${r.tenureMonths}mo`;
      const existing = (r.existingBullets || []).slice(0, 4).map(b => `    • ${b}`).join('\n') || '    (none)';
      const tech  = (r.distinctiveTech || []).join(', ') || 'technologies from resume';
      return `ROLE ${i+1}: "${r.role}" at "${r.company}" (${r.dates}, ${yrs}, tier=${tier})
  Distinctive tech at this role: ${tech}
  Existing bullets (DO NOT repeat these):
${existing}
  Appropriate verbs for this tier: ${verbs}`;
    }).join('\n\n');

    const prompt = `You are an expert ATS resume writer specialising in ${industry} roles.

GAPS TO ADDRESS (these drive ALL bullets — each bullet must close at least one gap):
${gaps.map((g,i) => `  ${i+1}. ${typeof g==='object'?g.skill||g.name||JSON.stringify(g):g}`).join('\n')}

KEY JD THEMES (weave these into bullets naturally):
${(gapAnalysis.keyThemes||[]).map(t=>`  • ${t}`).join('\n')}

${rolePrompts}

RESUME CONTEXT (for industry language and specificity):
${(resumeText||'').slice(0, 5000)}

JD CONTEXT:
${(jdText||'').slice(0, 2000)}

RULES FOR EVERY BULLET:
1. Close at least ONE gap from the list above — this is mandatory
2. Combine 2-3 technologies from the ${industry} ecosystem that work together
   BAD: "Used Terraform" | GOOD: "Architected Terraform + Jenkins + CloudFormation pipeline automating multi-env provisioning"
3. Use ONLY verbs listed for that role's tier
4. Be unique — zero repetition across all roles
5. Sound like it came from that specific role (use that role's distinctive tech)
6. ${METRIC_GUIDANCE}

Return ONLY this JSON:
{
  "roles": [
    {
      "roleIndex": 0,
      "company": "exact company name",
      "roleName": "exact title",
      "dates": "date string",
      "bullets": [
        {
          "text": "Full bullet — gap-targeted, multi-ecosystem, tenure-calibrated",
          "gap": "which gap this closes",
          "ecosystems": ["tech1","tech2"]
        }
      ]
    }
  ]
}

Generate EXACTLY 10 bullets per role. EXACTLY 3 roles. Do not stop at 2.`;

    const result = await askClaude(prompt, { maxTokens: 8000 });

    // ── Post-process ────────────────────────────────────────
    const seen = new Set();
    const processedRoles = (result.roles || []).map((r, i) => {
      const ctx = roles[i] || {};
      return {
        roleIndex:       r.roleIndex ?? i,
        company:         r.company   || ctx.company  || '',
        roleName:        r.roleName  || ctx.role     || '',
        dates:           r.dates     || ctx.dates    || '',
        suggestedPoints: (r.bullets  || [])
          .filter(b => {
            const k = (b.text||'').slice(0,80).toLowerCase().replace(/\s+/g,' ');
            if (seen.has(k) || !k) return false;
            seen.add(k); return true;
          })
          .map(b => ({
            text:       b.text || '',
            rationale:  `Gap: ${b.gap||'?'} | Tech: ${(b.ecosystems||[]).join(' + ')}`,
            confidence: calcConfidence(b.text||'', resumeText),
            gap:        b.gap        || '',
            ecosystems: b.ecosystems || []
          }))
      };
    });

    // Pad to 3 if Claude returned fewer
    const padded = [...processedRoles];
    while (padded.length < roles.length && padded.length < 3) {
      const fb = roles[padded.length];
      padded.push({ roleIndex: padded.length, company: fb.company||'', roleName: fb.role||'',
                    dates: fb.dates||'', suggestedPoints: [] });
    }

    res.json({ success: true, data: { roles: padded, gaps, industry } });
  } catch (err) { next(err); }
});

/**
 * Legacy combined endpoint — kept for compatibility
 * POST /api/analysis/run
 */
router.post('/run', async (req, res, next) => {
  try {
    const { resumeText, resumeParsed, jdText, jdParsed } = req.body;

    // Call 1 — gaps
    const gapRes = await new Promise((resolve, reject) => {
      const fakeReq = { body: { resumeText, resumeParsed, jdText, jdParsed } };
      const fakeRes = {
        json: d => resolve(d),
        status: () => ({ json: e => reject(new Error(e.error)) })
      };
      router.handle(Object.assign(fakeReq, { method:'POST', url:'/gaps', path:'/gaps' }), fakeRes, reject);
    }).catch(() => null);

    const gapData = gapRes?.data || {};

    // Call 2 — generate
    const genRes = await new Promise((resolve, reject) => {
      const fakeReq = { body: { gapAnalysis: gapData, resumeText, jdText, confirmedGaps: [] } };
      const fakeRes = {
        json: d => resolve(d),
        status: () => ({ json: e => reject(new Error(e.error)) })
      };
      router.handle(Object.assign(fakeReq, { method:'POST', url:'/generate', path:'/generate' }), fakeRes, reject);
    }).catch(() => ({ data: { roles: [] } }));

    const genData = genRes?.data || {};
    const top3    = (resumeParsed?.experiences||[]).slice(0, 3);

    res.json({
      success: true,
      data: {
        matchScore:    gapData.matchScore    || 0,
        matchedSkills: gapData.matchedSkills || [],
        missingSkills: (gapData.missingSkills||[]).map(g=>g.skill||g),
        ecosystemGaps: (gapData.ecosystemGaps||[]).map(g=>g.name||g),
        existingPoints:[],
        industry:      gapData.industry      || '',
        yearsInResume: gapData.yearsInResume || 0,
        yearsInJD:     gapData.yearsInJD     || 0,
        gapDetails:    gapData.missingSkills || [],
        keyThemes:     gapData.keyThemes     || [],
        roleAnalysis:  (genData.roles||[]).map(r => ({
          roleIndex:       r.roleIndex,
          company:         r.company,
          roleName:        r.roleName,
          dates:           r.dates,
          existingBullets: (top3[r.roleIndex]||{}).bullets || [],
          suggestedPoints: r.suggestedPoints || []
        }))
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
