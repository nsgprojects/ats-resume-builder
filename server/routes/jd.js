const express = require('express');
const router = express.Router();
const { askClaude } = require('../services/claude');

// POST /api/jd/parse
router.post('/parse', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 30) {
      return res.status(400).json({ error: 'Job description text is required' });
    }

    const parsed = await askClaude(
      `Parse this job description and return a JSON object.

Required structure:
{
  "title": "Job Title",
  "company": "Company Name or empty string",
  "location": "Location or empty string",
  "required": ["required skill 1", "required skill 2"],
  "preferred": ["preferred skill 1", "preferred skill 2"],
  "responsibilities": ["duty 1", "duty 2"],
  "yearsRequired": 12,
  "keywords": ["ats keyword 1", "ats keyword 2"]
}

Job Description:
${text.slice(0, 2500)}`,
      { maxTokens: 900 }
    );

    res.json({ success: true, data: parsed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
