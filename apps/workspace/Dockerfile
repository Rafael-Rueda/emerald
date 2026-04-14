# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# apps/workspace — Next.js 15 (standalone output)
# Multi-stage build: base -> deps -> builder -> runner
# The runner only ships the .next/standalone bundle + static + public.
# ----------------------------------------------------------------------------

# --- base --------------------------------------------------------------------
FROM node:22-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /repo

# --- deps --------------------------------------------------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

COPY apps/api/package.json               apps/api/package.json
COPY apps/docs/package.json              apps/docs/package.json
COPY apps/workspace/package.json         apps/workspace/package.json

COPY packages/contracts/package.json     packages/contracts/package.json
COPY packages/data-access/package.json   packages/data-access/package.json
COPY packages/mocks/package.json         packages/mocks/package.json
COPY packages/ui/package.json            packages/ui/package.json
COPY packages/configs/package.json       packages/configs/package.json
COPY packages/test-utils/package.json    packages/test-utils/package.json
COPY packages/mcp-server/package.json    packages/mcp-server/package.json

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- builder -----------------------------------------------------------------
FROM deps AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter @emerald/contracts build \
    && pnpm --filter @emerald/workspace build

# --- runner ------------------------------------------------------------------
FROM node:22-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3101
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Non-root user
RUN groupadd --system --gid 1001 emerald \
    && useradd --system --uid 1001 --gid emerald --create-home emerald

# standalone bundle already contains a minimal node_modules tree + server.js.
# outputFileTracingRoot is set to the monorepo root, so the bundle layout is:
#   /app/apps/workspace/server.js
#   /app/node_modules/...
COPY --from=builder --chown=emerald:emerald /repo/apps/workspace/.next/standalone/ ./
COPY --from=builder --chown=emerald:emerald /repo/apps/workspace/.next/static       ./apps/workspace/.next/static
COPY --from=builder --chown=emerald:emerald /repo/apps/workspace/public             ./apps/workspace/public

USER emerald

EXPOSE 3101

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3101/api/health || exit 1

CMD ["node", "apps/workspace/server.js"]
