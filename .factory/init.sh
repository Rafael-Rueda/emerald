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

# Start Emerald PostgreSQL containers if apps/api exists and Docker is available
if [ -d "apps/api" ] && [ -f "apps/api/docker-compose.yml" ]; then
  if command -v docker >/dev/null 2>&1; then
    echo "[init] starting Emerald PostgreSQL containers (ports 5434/5435)"
    docker compose -f apps/api/docker-compose.yml up -d >/dev/null 2>&1 || true
    echo "[init] waiting for postgres-dev to be ready..."
    sleep 3
    # Run migrations if Prisma schema exists
    if [ -f "apps/api/src/infra/database/prisma/schema.prisma" ] || [ -f "apps/api/prisma/schema.prisma" ]; then
      echo "[init] running Prisma migrations"
      pnpm --filter @emerald/api prisma migrate deploy >/dev/null 2>&1 || true
    fi
  else
    echo "[init] Docker not available, skipping PostgreSQL startup"
  fi
fi

# Setup .env.local for frontend apps if they don't exist
if [ -d "apps/docs" ] && [ ! -f "apps/docs/.env.local" ]; then
  if [ -f "apps/docs/.env.local.example" ]; then
    echo "[init] creating apps/docs/.env.local from example"
    cp apps/docs/.env.local.example apps/docs/.env.local
  fi
fi

if [ -d "apps/workspace" ] && [ ! -f "apps/workspace/.env.local" ]; then
  if [ -f "apps/workspace/.env.local.example" ]; then
    echo "[init] creating apps/workspace/.env.local from example"
    cp apps/workspace/.env.local.example apps/workspace/.env.local
  fi
fi
