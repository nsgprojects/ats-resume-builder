const express  = require('express');
const router   = express.Router();
const { spawn } = require('child_process');
const path     = require('path');
const fs       = require('fs');

const SCRIPT = path.join(__dirname, '../scripts/insert_bullets.py');

function insertIntoDOCX(originalDocxBase64, roleInsertions) {
  return new Promise((resolve, reject) => {
    // Verify script exists
    if (!fs.existsSync(SCRIPT)) {
      return reject(new Error(`Python script not found: ${SCRIPT}`));
    }

    const payload = JSON.stringify({
      docx:  originalDocxBase64,
      roles: roleInsertions.map((r, i) => ({
        company:    r.company || r.anchor || '',
        role_index: r.roleIndex !== undefined ? r.roleIndex : i,
        bullets:    (r.bullets || []).filter(Boolean),
      }))
    });

    const child = spawn('python3', [SCRIPT], { timeout: 60000 });
    let stdout = '', stderr = '';

    child.stdin.on('error', e => reject(new Error(`stdin error: ${e.message}`)));
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', code => {
      if (stderr) console.warn('[insert_bullets]', stderr.slice(0, 500));
      if (code !== 0 || !stdout.trim()) {
        const errMsg = stderr.slice(0, 300) || `exited with code ${code}`;
        reject(new Error(`Python insert failed: ${errMsg}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', e => {
      reject(new Error(`Could not start python3: ${e.message}. Is Python 3 installed?`));
    });

    try {
      child.stdin.write(payload);
      child.stdin.end();
    } catch(e) {
      reject(new Error(`Failed to send data to Python: ${e.message}`));
    }
  });
}

/** Plain-text fallback — appends after last content line before Environment: */
function insertIntoText(resumeText, roleInsertions) {
  const lines = resumeText.split('\n');
  const norm  = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Resolve insertions bottom-up so indices stay stable
  const ops = [];
  for (const { anchor, bullets } of roleInsertions) {
    if (!anchor || !bullets?.length) continue;
    const key = norm(anchor).slice(0, 10);
    const secIdx = lines.findIndex(l => key && norm(l).includes(key));
    if (secIdx === -1) continue;

    let lastContent = secIdx;
    for (let i = secIdx + 1; i < Math.min(secIdx + 80, lines.length); i++) {
      const t = lines[i].trim();
      if (t.toLowerCase().startsWith('environment:') || (t.toLowerCase().startsWith('client:') && i > secIdx + 4)) break;
      if (t) lastContent = i;
    }
    ops.push({ insertAfter: lastContent, bullets });
  }

  ops.sort((a, b) => b.insertAfter - a.insertAfter);
  const result = [...lines];
  for (const { insertAfter, bullets } of ops) {
    result.splice(insertAfter + 1, 0, ...bullets);
  }
  return result.join('\n');
}

// POST /api/integrate/run
router.post('/run', async (req, res, next) => {
  try {
    const { resumeText, originalDocxBase64, selectedPointsByRole, selectedPoints, resumeParsed, extractedExperiences, detectedFormat } = req.body;
    if (!resumeText) return res.status(400).json({ error: 'resumeText is required' });

    // Build role insertions
    let roleInsertions = [];
    // Use extractedExperiences (regex-extracted, reliable) to override
    // Claude's company names which can be wrong for table-format resumes
    const reliableExps = extractedExperiences || [];

    if (selectedPointsByRole?.length) {
      roleInsertions = selectedPointsByRole
        .filter(r => r.bullets?.length)
        .map((r, i) => {
          // Prefer regex-extracted company name over Claude's (more reliable for table resumes)
          const reliable = reliableExps[r.roleIndex !== undefined ? r.roleIndex : i];
          const company  = reliable?.company || r.company  || r.roleName || '';
          return {
            company,
            anchor:    company,
            roleName:  r.roleName || r.company || '',
            roleIndex: r.roleIndex !== undefined ? r.roleIndex : i,
            bullets:   r.bullets.map(b => typeof b === 'object' ? (b.text || b.t || '') : b).filter(Boolean)
          };
        });
    } else if (selectedPoints?.length) {
      const pts  = selectedPoints.map(p => typeof p === 'object' ? (p.text || p.t || '') : p).filter(Boolean);
      const exps = (resumeParsed?.experiences || []).slice(0, 3);
      if (!exps.length) {
        return res.json({ success: true, data: {
          mode: 'text',
          integratedResume: resumeText + '\n\n--- Added ---\n' + pts.map(p => `- ${p}`).join('\n'),
          insertedBullets: pts, insertedCount: pts.length, rolesModified: []
        }});
      }
      const per = Math.ceil(pts.length / exps.length);
      roleInsertions = exps.map((e, i) => ({
        company: e.company || e.role || '',
        anchor:  e.company || e.role || '',
        roleName:e.role    || e.company || `Role ${i + 1}`,
        bullets: pts.slice(i * per, (i + 1) * per)
      }));
    }

    if (!roleInsertions.length) {
      return res.status(400).json({ error: 'No points to insert. Please select points first.' });
    }

    const allBullets = roleInsertions.flatMap(r => r.bullets);

    // ── DOCX path — preserves original format exactly ────────
    if (originalDocxBase64) {
      try {
        console.log(`[integrate] DOCX mode — inserting ${allBullets.length} bullets into ${roleInsertions.length} roles`);
        const resultDocxB64 = await insertIntoDOCX(originalDocxBase64, roleInsertions);
        console.log('[integrate] DOCX insertion succeeded');
        return res.json({ success: true, data: {
          mode:             'docx',
          resultDocxBase64: resultDocxB64,
          insertedBullets:  allBullets,
          insertedCount:    allBullets.length,
          rolesModified:    roleInsertions.map(r => r.company).filter(Boolean)
        }});
      } catch (pyErr) {
        // DOCX path failed — do NOT silently fall back to text.
        // Text mode destroys table formatting for resumes like Vijaya's.
        console.error('[integrate] DOCX mode failed:', pyErr.message);
        return res.status(500).json({
          error: `DOCX insertion failed: ${pyErr.message}. ` +
                 `Please ensure python-docx is installed (pip3 install python-docx) ` +
                 `and try again. If the problem persists, re-upload your resume.`
        });
      }
    }

    // ── Text-only mode (PDF/TXT upload or pasted text — no DOCX) ─
    // Only reached when originalDocxBase64 is absent.
    // Safe because these formats have no table structure to preserve.
    console.log('[integrate] Text mode — no original DOCX present');
    const integratedResume = insertIntoText(resumeText, roleInsertions);
    res.json({ success: true, data: {
      mode:             'text',
      integratedResume,
      insertedBullets:  allBullets,
      insertedCount:    allBullets.length,
      rolesModified:    roleInsertions.map(r => r.company).filter(Boolean)
    }});
  } catch (err) {
    console.error('[integrate] Unhandled error:', err);
    next(err);
  }
});

module.exports = router;
