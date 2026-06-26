#!/usr/bin/env bash
set -e

# ───────────────────────────────────────────────────────────
#  Navrang Pustika — One-click launcher for macOS / Linux
#  Double-click this file (or run from terminal).
# ───────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"
BACKEND_PORT=8000
FRONTEND_PORT=5173

cleanup() {
  echo ""
  echo "Shutting down servers..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "============================================"
echo "  Navrang Pustika — Starting..."
echo "  OS: $OS"
echo "============================================"

# ── Backend ────────────────────────────────────────
echo ""
echo "[1/3] Setting up backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "  → Creating Python virtual environment..."
  python3 -m venv venv
fi

echo "  → Activating venv & installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "  → Starting backend server (port $BACKEND_PORT)..."
uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────
echo ""
echo "[2/3] Setting up frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "  → Installing frontend dependencies..."
  npm install
fi

echo "  → Starting frontend dev server (port $FRONTEND_PORT)..."
npx vite --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

# ── Open browser ──────────────────────────────────
echo ""
echo "[3/3] Opening browser..."
sleep 4

case "$OS" in
  Darwin)  open    "http://localhost:$FRONTEND_PORT" ;;
  Linux)   xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true ;;
  *)       echo "  → Open http://localhost:$FRONTEND_PORT in your browser." ;;
esac

echo ""
echo "============================================"
echo "  Frontend : http://localhost:$FRONTEND_PORT"
echo "  Backend  : http://127.0.0.1:$BACKEND_PORT"
echo "  Press Ctrl+C to stop all servers."
echo "============================================"

wait
