# ATS Resume Builder v2.0

AI-powered resume optimizer — Claude AI · React · Express · DOCX upload · Gap Analysis

---

## What it does

1. **Upload resume** — DOCX, PDF, TXT, or paste text
2. **Paste job description** — Claude extracts required & preferred skills
3. **AI analysis** — match score, matched/missing skills, ecosystem gaps
4. **Preview & select** — side-by-side: your bullets (red) vs AI suggestions (green)
5. **Gap analysis** — dedicated Ecosystem Gap + Keyword Gap Analysis pages
6. **Confirm & export** — integrate selected points, download TXT or HTML

---

## Quick start

### 1. Get an Anthropic API key

Sign up at https://console.anthropic.com and create an API key.

### 2. Clone / unzip the project

```bash
unzip ats-resume-builder.zip
cd ats-resume-builder
```

### 3. Configure environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and set:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-haiku-4-5-20251001
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Model options (cheapest → smartest):**
| Model | Speed | Cost | Best for |
|-------|-------|------|----------|
| `claude-haiku-4-5-20251001` | Fast | Low | Development, testing |
| `claude-sonnet-4-6` | Medium | Medium | Production recommended |
| `claude-opus-4-6` | Slow | High | Maximum quality |

### 4. Install dependencies

```bash
# From project root:
npm install             # installs concurrently
cd server && npm install
cd ../client && npm install
```

Or use the shortcut:
```bash
npm run install:all
```

### 5. Run in development

```bash
# From project root — starts both server (3001) and client (5173):
npm run dev
```

Open http://localhost:5173

---

## Production deployment

### Build frontend

```bash
npm run build
# Output: client/dist/
```

### Start production server

```bash
cd server
NODE_ENV=production npm start
```

The Express server will serve the built React app from `client/dist/` on port 3001.

Open http://localhost:3001

---

## Deploy to cloud

### Render.com (easiest — free tier available)

1. Push to GitHub
2. Create a new **Web Service** on render.com
3. Set **Build Command**: `npm run install:all && npm run build`
4. Set **Start Command**: `npm start`
5. Add environment variable: `ANTHROPIC_API_KEY=your-key`

### Railway

```bash
railway login
railway init
railway add
railway up
```
Set `ANTHROPIC_API_KEY` in Railway dashboard → Variables.

### Heroku

```bash
heroku create your-app-name
heroku config:set ANTHROPIC_API_KEY=your-key
git push heroku main
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm run install:all && npm run build
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
```

```bash
docker build -t ats-resume-builder .
docker run -p 3001:3001 -e ANTHROPIC_API_KEY=your-key ats-resume-builder
```

---

## Project structure

```
ats-resume-builder/
├── server/
│   ├── index.js               # Express entry point
│   ├── .env.example           # Environment template
│   ├── services/
│   │   └── claude.js          # Anthropic client + JSON extractor
│   ├── middleware/
│   │   └── upload.js          # Multer file upload config
│   └── routes/
│       ├── resume.js          # POST /api/resume/parse
│       ├── jd.js              # POST /api/jd/parse
│       ├── analysis.js        # POST /api/analysis/run
│       ├── gaps.js            # POST /api/gaps/run
│       └── integrate.js       # POST /api/integrate/run
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Main app + 6-tab navigation
        ├── main.jsx
        ├── index.css           # Tailwind + component styles
        ├── lib/
        │   └── api.js          # Axios client for all endpoints
        └── components/
            ├── UploadStep.jsx  # File upload + text paste
            ├── JDStep.jsx      # JD input + skill detection
            ├── AnalysisStep.jsx # Match score + skill breakdown
            ├── PreviewStep.jsx  # Side-by-side point selection
            ├── GapAnalysisStep.jsx # Ecosystem + keyword gap analysis
            └── ExportStep.jsx  # Confirm + download final resume
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server + AI status check |
| POST | `/api/resume/parse` | Parse resume (file upload or text) |
| POST | `/api/jd/parse` | Parse job description |
| POST | `/api/analysis/run` | Full ATS analysis + point generation |
| POST | `/api/gaps/run` | Ecosystem + keyword gap analysis |
| POST | `/api/integrate/run` | Integrate selected points into resume |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Express.js + Node.js 20 |
| AI | Claude via Anthropic SDK |
| File parsing | mammoth (DOCX) + pdf-parse (PDF) |
| File upload | Multer (memory storage) |
| Dev tooling | concurrently + nodemon |

---

## Troubleshooting

**`ANTHROPIC_API_KEY` not found**
→ Make sure `server/.env` exists and has the key. Run `cd server && cp .env.example .env`

**Port 3001 already in use**
→ `lsof -ti:3001 | xargs kill -9` (macOS/Linux) or change `PORT` in `.env`

**DOCX file not parsing**
→ Ensure the file is not password-protected. Try saving as `.txt` and pasting instead.

**AI returns parse error**
→ The server uses assistant prefill to force JSON output. If issues persist, switch to `claude-sonnet-4-6` in `.env` for more reliable output.

**CORS error in browser**
→ Ensure `CLIENT_URL` in `server/.env` matches your frontend URL exactly.
