const express = require('express');
const router  = express.Router();

// ── POST /api/export/docx — build Word doc from plain text ───
router.post('/docx', async (req, res, next) => {
  try {
    // Lazy-load docx so the server doesn't crash if it's not installed
    let docxLib;
    try {
      docxLib = require('docx');
    } catch(e) {
      return res.status(503).json({
        error: 'docx package not installed. Run: cd server && npm install'
      });
    }

    const { Document, Packer, Paragraph, TextRun,
            AlignmentType, BorderStyle, LevelFormat } = docxLib;

    const { resumeText, insertedBullets } = req.body;
    if (!resumeText) return res.status(400).json({ error: 'resumeText required' });

    const newSet = new Set((insertedBullets || []).map(b => b.trim()));
    const HEADERS = /^(PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EDUCATION|SKILLS|SUMMARY|CERTIFICATIONS|PROJECTS|OBJECTIVE|PROFILE|TECHNICAL SKILLS|KEY SKILLS|PROFESSIONAL SUMMARY)/i;

    const paras = [];
    resumeText.split('\n').forEach((raw, idx) => {
      const line = raw.trimEnd();
      const trim = line.trim();
      if (!trim) { paras.push(new Paragraph({ children: [], spacing: { before: 80 } })); return; }
      const isNew    = newSet.has(trim) || [...newSet].some(n => n.length > 20 && trim.includes(n.slice(0, 25)));
      const isBullet = /^[-•*\u2022][ \t]/.test(trim);
      const isHeader = HEADERS.test(trim);

      if (idx < 4) {
        paras.push(new Paragraph({ children:[new TextRun({text:trim,bold:true,size:idx===0?32:24,color:'111827'})],
          alignment:AlignmentType.CENTER, spacing:{after:60}})); return;
      }
      if (isHeader) {
        paras.push(new Paragraph({ children:[new TextRun({text:trim.toUpperCase(),bold:true,size:22,color:'1E3A5F'})],
          spacing:{before:200,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'}}})); return;
      }
      if (isBullet) {
        paras.push(new Paragraph({ numbering:{reference:'bullets',level:0},
          children:[new TextRun({text:trim.replace(/^[-•*\u2022]\s+/,''),size:22,color:isNew?'065F46':'1A1A1A',bold:isNew})]})); return;
      }
      paras.push(new Paragraph({ children:[new TextRun({text:trim,size:22,color:isNew?'065F46':'1A1A1A',bold:isNew})],spacing:{before:40}}));
    });

    const doc = new Document({
      numbering:{ config:[{reference:'bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'•',
        alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}]},
      sections:[{ properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},
        children:paras }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="optimized_resume.docx"',
      'Content-Length':       buffer.length
    });
    res.send(buffer);
  } catch(err) { next(err); }
});

// ── POST /api/export/docx-from-base64 — serve Python-generated DOCX ─
router.post('/docx-from-base64', (req, res, next) => {
  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'base64 required' });
    const buffer = Buffer.from(base64, 'base64');
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="optimized_resume.docx"',
      'Content-Length':       buffer.length
    });
    res.send(buffer);
  } catch(err) { next(err); }
});

module.exports = router;
