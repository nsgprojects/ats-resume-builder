const express  = require('express');
const router   = express.Router();
const mammoth  = require('mammoth');
const pdfParse = require('pdf-parse');
const upload   = require('../middleware/upload');
const { askClaude } = require('../services/claude');

const YEAR_RE  = /\b(19|20)\d{2}\b/;
const DATE_RE  = /present|current|now|today/i;

/**
 * FORMAT T — Table-header resume (Vijaya's style)
 * Experience headers live inside Word table cells:
 *   ┌─────────────────────────┬──────────────────┐
 *   │ Salesforce Architect    │ Jan 2018–Present  │
 *   │ Republic Services, AZ   │                  │
 *   └─────────────────────────┴──────────────────┘
 * mammoth extracts table text as plain lines, so we detect
 * lines that look like "Company — City" paired with a date line.
 *
 * FORMAT A — Client:/Duration:/Role: (consulting format)
 * FORMAT B — Company | Title | Date  (LinkedIn / inline)
 * FORMAT C — Stacked: Company / Title / Dates on 3 consecutive lines
 * FORMAT D — Title @ Company (Dates)
 * FORMAT E — Fallback: Claude extracts
 */
function fingerprint(text) {
  const lines = text.split('\n');

  // ── Format A ─────────────────────────────────────────────
  const A = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:client|employer|company)\s*[:\-]\s*(.+)/i);
    if (!m) continue;
    let company = m[1].split(/\s{3,}|\t/)[0].split(/\s+[–\-]\s+[A-Z]/)[0].replace(/[.,\s]+$/, '').trim();
    let dates = '';
    const dm = lines[i].match(/[Dd]uration\s*[:\-]\s*(.+)/);
    if (dm) dates = dm[1].trim();
    let role = '';
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const rm = lines[j].match(/^[Rr]ole\s*[:\-]\s*(.+)/);
      if (rm) { role = rm[1].trim(); break; }
    }
    if (company && company.length > 1) A.push({ company, dates, role });
  }
  if (A.length > 0) { console.log(`[resume/parse] Format A (${A.length} roles)`); return { format: 'A', experiences: A }; }

  // ── Format B ─────────────────────────────────────────────
  const B = [];
  for (const line of lines) {
    const parts = line.split(/\s*\|\s*/);
    if (parts.length >= 3) {
      const last = parts[parts.length - 1].trim();
      if ((YEAR_RE.test(last) || DATE_RE.test(last)) && last.length < 40) {
        const company = parts[0].trim(), role = parts[1].trim(), dates = last;
        if (company.length > 1 && role.length > 1) B.push({ company, dates, role });
      }
    }
  }
  if (B.length > 0) { console.log(`[resume/parse] Format B (${B.length} roles)`); return { format: 'B', experiences: B }; }

  // ── Format T — Table-header (detect from mammoth plain-text output) ──
  // mammoth linearises table cells as consecutive lines.
  // Pattern: a short company/title line followed within 2 lines by a date range.
  const T = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i].trim();
    if (!l || l.length > 120 || YEAR_RE.test(l)) continue;
    // Skip section headers
    if (/^(professional|summary|education|skills|certif|earlier|core|competencies)/i.test(l)) continue;
    // Look for a date range within next 2 lines
    for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
      const d = lines[j].trim();
      if ((YEAR_RE.test(d) || DATE_RE.test(d)) && d.length < 45) {
        // l is "Role\nCompany" or "Role — Company" — split on newline or em-dash
        const parts = l.split(/\n|—|–/).map(s => s.trim()).filter(Boolean);
        let role = parts[0] || l, company = parts[1] || parts[0] || l;
        // If first part looks like a title (has words like Architect/Engineer/Lead/Manager/Developer)
        if (/architect|engineer|lead|manager|developer|analyst|director|specialist|consultant/i.test(parts[0])) {
          role    = parts[0];
          company = parts[1] || parts[0];
        }
        T.push({ company: company.replace(/[—–]\s*.+/, '').trim(), role: role.trim(), dates: d });
        i = j; // skip consumed lines
        break;
      }
    }
  }
  if (T.length > 0) { console.log(`[resume/parse] Format T table-header (${T.length} roles)`); return { format: 'T', experiences: T }; }

  // ── Format C ─────────────────────────────────────────────
  const C = [];
  for (let i = 0; i < lines.length - 2; i++) {
    const l1 = lines[i].trim(), l2 = lines[i+1].trim(), l3 = lines[i+2].trim();
    if (!l1 || !l2 || !l3) continue;
    if ((YEAR_RE.test(l3) || DATE_RE.test(l3)) && l3.length < 50 &&
        !YEAR_RE.test(l1) && !l1.match(/^(summary|education|skills|certif)/i) && l1.length < 80 &&
        !YEAR_RE.test(l2) && l2.length < 60) {
      C.push({ company: l1, role: l2, dates: l3 });
      i += 2;
    }
  }
  if (C.length > 0) { console.log(`[resume/parse] Format C (${C.length} roles)`); return { format: 'C', experiences: C }; }

  // ── Format D ─────────────────────────────────────────────
  const D = [];
  for (const line of lines) {
    const m = line.match(/^(.+?)\s+@\s+(.+?)\s*[\(\[]([\d\w\s–\-,]+)[\)\]]/);
    if (m) D.push({ role: m[1].trim(), company: m[2].trim(), dates: m[3].trim() });
  }
  if (D.length > 0) { console.log(`[resume/parse] Format D (${D.length} roles)`); return { format: 'D', experiences: D }; }

  console.log('[resume/parse] Format E — Claude fallback');
  return { format: 'E', experiences: [] };
}

/**
 * For table-format resumes, also extract table cell data directly
 * from the mammoth HTML output (richer than plain text for tables).
 */
async function extractTableExperiences(buffer) {
  try {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const results = [];

    // Match each table row
    for (const [, rowHtml] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      // For each cell, extract paragraphs BEFORE stripping tags
      // This preserves the two-paragraph structure: para[0]=role, para[1]=company — location
      const cellsRaw = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cellsRaw.length < 2) continue;

      const parsedCells = cellsRaw.map(([, cellHtml]) => {
        // Extract each <p> paragraph separately
        const paras = [...cellHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
          .map(([, p]) => p.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        // Fallback: strip all tags if no <p> found
        if (!paras.length) {
          const flat = cellHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          return { paras: flat ? [flat] : [], flat };
        }
        return { paras, flat: paras.join(' ') };
      });

      // Find the date cell (short cell containing a year or "Present")
      const dateIdx = parsedCells.findIndex(({ flat }) =>
        (YEAR_RE.test(flat) || DATE_RE.test(flat)) && flat.length < 50
      );
      if (dateIdx === -1) continue;

      // Main cell is the non-date cell
      const mainIdx  = parsedCells.findIndex((_, i) => i !== dateIdx);
      if (mainIdx === -1) continue;

      const { paras } = parsedCells[mainIdx];
      const dates      = parsedCells[dateIdx].flat;

      // paras[0] = "Salesforce Architect" (role title)
      // paras[1] = "Republic Services — Phoenix, AZ" (company — location)
      const rolePart    = paras[0] || '';
      const companyPart = paras[1] || paras[0] || '';

      // Strip location from company: "Republic Services — Phoenix, AZ" → "Republic Services"
      const company = companyPart
        .split(/\s*[—–]\s*/)[0]   // stop at em-dash
        .replace(/,\s*[A-Z]{2}$/, '') // strip trailing state code "Republic Services, AZ"
        .trim();

      const role = rolePart.trim();

      if (company && dates) {
        results.push({ role, company, dates });
        console.log(`[extractTable] role="${role}" company="${company}" dates="${dates}"`);
      }
    }
    return results;
  } catch(e) {
    console.error('[extractTableExperiences] error:', e.message);
    return [];
  }
}

// POST /api/resume/parse
router.post('/parse', upload.single('file'), async (req, res, next) => {
  try {
    let resumeText = '';
    let docxBase64 = null;
    let fileBuffer = null;

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'docx') {
        docxBase64  = req.file.buffer.toString('base64');
        fileBuffer  = req.file.buffer;
        const r     = await mammoth.extractRawText({ buffer: req.file.buffer });
        resumeText  = r.value;
      } else if (ext === 'pdf') {
        resumeText  = (await pdfParse(req.file.buffer)).text;
      } else {
        resumeText  = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.text) {
      resumeText = req.body.text;
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    if (!resumeText || resumeText.trim().length < 50)
      return res.status(400).json({ error: 'Resume text too short' });

    // ── Fingerprint format ──────────────────────────────────
    let { format, experiences } = fingerprint(resumeText);

    // For Format T/E DOCX: try richer table extraction
    if ((format === 'T' || format === 'E') && fileBuffer) {
      const tableExp = await extractTableExperiences(fileBuffer);
      if (tableExp.length > experiences.length) {
        console.log(`[resume/parse] Table HTML extraction found ${tableExp.length} roles (upgraded from ${experiences.length})`);
        experiences = tableExp;
        format = 'T';
      }
    }

    // ── Build Claude constraints ────────────────────────────
    let constraints = '';
    if (experiences.length > 0) {
      const cx = experiences.map((e, i) =>
        `  [${i}] company="${e.company}", role="${e.role}", dates="${e.dates}"`
      ).join('\n');
      constraints = `\n\nCRITICAL — Copy these VERBATIM into experiences[], same order:\n${cx}\nDo NOT use "Current Employer", "Not specified", or any paraphrase.`;
    }

    const parsed = await askClaude(
      `Parse this resume. Return ONLY JSON:
{
  "name":"","title":"","email":"","phone":"","location":"",
  "summary":"2 sentences from actual resume content",
  "years":0,
  "experiences":[{"company":"","role":"","client":"","dates":"","bullets":["verbatim bullet 1","verbatim bullet 2"]}],
  "skills":[],
  "education":""
}
${constraints}

Resume (format=${format}):
${resumeText.slice(0, 3800)}`,
      { maxTokens: 2500 }
    );

    // ── Safety-net overrides ────────────────────────────────
    const GENERIC = ['current employer','previous employer','unnamed','not specified','company name','recent employer'];
    const isGeneric = s => !s || GENERIC.some(g => (s||'').toLowerCase().includes(g));

    if (experiences.length && Array.isArray(parsed.experiences)) {
      parsed.experiences = parsed.experiences.map((exp, i) => {
        const c = experiences[i];
        if (!c) return exp;
        return {
          ...exp,
          company: isGeneric(exp.company) ? c.company : exp.company,
          client:  isGeneric(exp.client)  ? c.company : exp.client,
          dates:   (!exp.dates || isGeneric(exp.dates) || exp.dates === 'Not specified') ? c.dates : exp.dates,
          role:    (!exp.role  || isGeneric(exp.role)  || exp.role  === 'Not specified') ? c.role  : exp.role,
        };
      });
    }

    res.json({
      success: true, data: parsed,
      rawText: resumeText, docxBase64,
      detectedFormat: format,
      extractedExperiences: experiences   // sent to frontend → passed to integrate
    });
  } catch (err) { next(err); }
});

module.exports = router;
