require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { spawnSync } = require('child_process');

const resumeRoutes    = require('./routes/resume');
const jdRoutes        = require('./routes/jd');
const analysisRoutes  = require('./routes/analysis');
const gapRoutes       = require('./routes/gaps');
const integrateRoutes = require('./routes/integrate');
const exportRoutes    = require('./routes/export');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/resume',    resumeRoutes);
app.use('/api/jd',        jdRoutes);
app.use('/api/analysis',  analysisRoutes);
app.use('/api/gaps',      gapRoutes);
app.use('/api/integrate', integrateRoutes);
app.use('/api/export',    exportRoutes);

app.get('/api/health', (req, res) => {
  const pyOk  = spawnSync('python3', ['-c', 'import docx'], { encoding: 'utf-8' }).status === 0;
  let docxOk  = false;
  try { require('docx'); docxOk = true; } catch (_) {}
  res.json({
    status:  'ok',
    version: '2.0.0',
    ai:      process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
    python:  pyOk   ? 'ok' : 'missing',
    docx:    docxOk ? 'ok' : 'missing'
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Raise server keep-alive and headers timeout so long AI calls don't get cut off
// Default Node HTTP server timeout is 5s keep-alive — raise to 3 minutes
const server = app.listen(PORT, () => {
  const pyOk = spawnSync('python3', ['-c', 'import docx'], { encoding: 'utf-8' }).status === 0;
  console.log(`\n🚀  ATS Resume Builder v2`);
  console.log(`    Server  → http://localhost:${PORT}`);
  console.log(`    AI      → ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ missing — add ANTHROPIC_API_KEY to server/.env'}`);
  console.log(`    Python  → ${pyOk ? '✅ python-docx ready' : '⚠️  run: pip3 install python-docx'}\n`);
});
server.headersTimeout  = 185000; // slightly above proxy timeout
server.requestTimeout  = 185000;
