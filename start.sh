#!/usr/bin/env bash
# Runs the backend (Postgres + FastAPI via docker/podman compose) and the
# frontend (Vite dev server) together for local development.
#
# Usage:
#   ./dev.sh              start backend (if not already up) + frontend dev server
#   ./dev.sh --down        stop the backend containers and exit
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/webapp"
HEALTH_URL="http://127.0.0.1:8000/health"

if [[ "${1:-}" == "--down" ]]; then
  echo "==> Stopping backend containers..."
  (cd "$BACKEND_DIR" && docker compose down)
  exit 0
fi

echo "==> Starting backend (db + api)..."
(cd "$BACKEND_DIR" && docker compose up -d db api)

echo "==> Waiting for backend health at $HEALTH_URL ..."
for _ in $(seq 1 60); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    echo "==> Backend is healthy."
    break
  fi
  sleep 2
done

if ! curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
  echo "!! Backend did not become healthy in time."
  echo "   Check logs with: cd backend && docker compose logs api"
  exit 1
fi

echo "==> Applying database migrations (alembic upgrade head)..."
(cd "$BACKEND_DIR" && docker compose exec -T api alembic upgrade head)

echo "==> Starting webapp dev server (npm run dev)..."
echo "    Backend stays running after you stop this. Use './dev.sh --down' to stop it."
cd "$FRONTEND_DIR"
exec npm run dev
