#!/usr/bin/env sh
set -eu

if [ ! -f package.json ]; then
  echo "[init] package.json not present yet; skipping dependency install"
  exit 0
fi

echo "[init] installing workspace dependencies"
pnpm install

if [ -d "apps/docs/public" ] && [ ! -f "apps/docs/public/mockServiceWorker.js" ]; then
  echo "[init] initializing MSW worker for apps/docs"
  pnpm exec msw init "apps/docs/public" --save >/dev/null 2>&1 || true
fi

if [ -d "apps/workspace/public" ] && [ ! -f "apps/workspace/public/mockServiceWorker.js" ]; then
  echo "[init] initializing MSW worker for apps/workspace"
  pnpm exec msw init "apps/workspace/public" --save >/dev/null 2>&1 || true
fi
