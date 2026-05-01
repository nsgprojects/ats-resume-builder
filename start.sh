#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ATS Resume Builder v2 — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Root deps
if [ ! -f "node_modules/.package-lock.json" ]; then
  echo "📦 Installing root dependencies..."
  npm install
fi

# 2. Server deps
if [ ! -d "server/node_modules/express" ]; then
  echo "📦 Installing server dependencies..."
  (cd server && npm install)
fi

# 3. Client deps
if [ ! -d "client/node_modules/vite" ]; then
  echo "📦 Installing client dependencies..."
  (cd client && npm install)
fi

# 4. python-docx
if ! python3 -c "import docx" 2>/dev/null; then
  echo "🐍 Installing python-docx..."
  pip3 install python-docx --break-system-packages -q 2>/dev/null \
    || python3 -m pip install python-docx -q 2>/dev/null \
    || echo "⚠️  pip failed — run manually: pip3 install python-docx"
fi

# 5. .env
if [ ! -f "server/.env" ]; then
  cp server/.env.example server/.env
  echo ""
  echo "⚠️  Created server/.env — open it and add your ANTHROPIC_API_KEY"
  echo "   https://console.anthropic.com"
  echo ""
fi

echo "✅ Setup complete"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting servers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
