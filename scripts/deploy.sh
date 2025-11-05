#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="vibi"
REMOTE_DIR="~/rooms"

echo "[DEPLOY] Syncing repo to ${REMOTE_HOST}:${REMOTE_DIR}"

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.DS_Store' \
  ./ "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "[DEPLOY] Restarting remote server"
ssh "${REMOTE_HOST}" bash -s <<'REMOTE_SH'
set -euo pipefail
REMOTE_DIR=~/rooms

# Ensure Bun in PATH if installed via $HOME/.bun
if ! command -v bun >/dev/null 2>&1; then
  if [ -d "$HOME/.bun/bin" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  fi
fi

mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"

# Stop previous server
if [ -f server.pid ]; then
  kill "$(cat server.pid)" 2>/dev/null || true
  rm -f server.pid
fi
pkill -f 'bun run server' 2>/dev/null || true

# Install deps and start fresh server
bun install
nohup bun run server > server.log 2>&1 & echo $! > server.pid
disown || true
sleep 0.1
echo "[DEPLOY] Server started (PID: $(cat server.pid))"
REMOTE_SH

echo "[DEPLOY] Done"
