const express = require('express');
const router = express.Router();
const { askClaude } = require('../services/claude');

// POST /api/gaps/run
// Split into TWO separate smaller API calls to prevent JSON truncation
router.post('/run', async (req, res, next) => {
  try {
    const { resumeText, resumeParsed, jdText, jdParsed } = req.body;
    if (!resumeText || !jdText) return res.status(400).json({ error: 'resumeText and jdText required' });

    const resumeSnip = (resumeText || '').slice(0, 1500);
    const jdSnip = (jdText || '').slice(0, 1200);

    // ── Call 1: Ecosystem gap analysis ───────────────────────────
    const ecoResult = await askClaude(
      `Ecosystem gap analysis. Compare resume vs JD. Find missing technology ecosystems.

Return JSON (keep descriptions SHORT — max 15 words each):
{"eco":[{"name":"ecosystem name","gap":"what is missing (max 12 words)","fix":"how to address (max 12 words)","sev":"HIGH"}],"score":68,"rec":"One sentence top priority"}

sev must be HIGH, MEDIUM, or LOW.
Generate 4 to 6 ecosystem gaps.

Resume: ${resumeSnip}
JD: ${jdSnip}`,
      { maxTokens: 1200 }
    );

    // ── Call 2: Keyword gap analysis ─────────────────────────────
    const kwResult = await askClaude(
      `Keyword gap analysis. Find ATS keywords from the JD that are missing or weak in the resume.

Return JSON (keep context SHORT — max 10 words each):
{"missing":[{"kw":"exact keyword","ctx":"why it matters (max 8 words)","freq":2}],"weak":[{"kw":"underused keyword","ctx":"how to strengthen (max 8 words)"}],"present":["keyword1","keyword2"],"priorities":["action 1","action 2","action 3"]}

missing: up to 8 keywords completely absent from resume but in JD.
weak: up to 5 keywords present but underused.
present: up to 10 keywords the resume demonstrates well.

Resume: ${resumeSnip}
JD: ${jdSnip}`,
      { maxTokens: 1200 }
    );

    // Merge both results
    res.json({
      success: true,
      data: {
        ecosystemGaps: ecoResult.eco || [],
        overallScore: ecoResult.score || 65,
        overallRecommendation: ecoResult.rec || '',
        missingKeywords: kwResult.missing || [],
        weakKeywords: kwResult.weak || [],
        presentKeywords: kwResult.present || [],
        topPriorities: kwResult.priorities || []
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
