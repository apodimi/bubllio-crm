#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# Keep the local uv cache inside the project when the global cache is not
# writable (common in managed IDE/sandbox environments).
export UV_CACHE_DIR="${UV_CACHE_DIR:-$ROOT_DIR/.uv-cache}"

mkdir -p "$LOG_DIR"
: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"

backend_pid=""
frontend_pid=""

stop_port_processes() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi
  echo "Stopping existing process on port $port: $pids"
  while read -r pid; do
    [[ -z "$pid" ]] || kill "$pid" 2>/dev/null || true
  done <<< "$pids"
}

# Keep reruns convenient while limiting cleanup to Bubllio's development ports.
stop_port_processes 8000
stop_port_processes 5173

cleanup() {
  local exit_code=$?
  trap - INT TERM EXIT

  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  wait "$backend_pid" 2>/dev/null || true
  wait "$frontend_pid" 2>/dev/null || true
  echo "Development services stopped."
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

echo "Applying database migrations..."
(cd "$ROOT_DIR" && uv run python src/manage.py migrate --noinput)

echo "Starting backend on http://127.0.0.1:8000"
(
  cd "$ROOT_DIR"
  uv run python src/manage.py runserver 127.0.0.1:8000 --noreload 2>&1 | tee "$BACKEND_LOG"
) &
backend_pid=$!

echo "Starting frontend on http://127.0.0.1:5173"
(
  cd "$ROOT_DIR/frontend"
  API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173 2>&1 | tee "$FRONTEND_LOG"
) &
frontend_pid=$!

echo "Logs: $BACKEND_LOG and $FRONTEND_LOG"
echo "Press Ctrl+C to stop both services."

wait "$backend_pid"
