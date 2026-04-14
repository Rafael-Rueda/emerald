# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# apps/api — NestJS 11 + Prisma 7 + pgvector
# Multi-stage build: base -> deps -> builder -> runner
# Uses pnpm 10 via corepack. BuildKit cache mounts accelerate repeat builds.
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
# Install the full workspace dep graph so the builder can resolve every
# workspace:* reference. We copy only manifests first for cache efficiency.
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

COPY . .

# Generate Prisma client, build contracts (api depends on built output), build api
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter @emerald/api exec prisma generate \
    && pnpm --filter @emerald/contracts build \
    && pnpm --filter @emerald/api build

# --- runner ------------------------------------------------------------------
FROM node:22-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

WORKDIR /repo

# Non-root user
RUN groupadd --system --gid 1001 emerald \
    && useradd --system --uid 1001 --gid emerald --create-home emerald

# Copy workspace manifests + lockfile for prod install
COPY --from=builder /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/.npmrc ./
COPY --from=builder /repo/apps/api/package.json               apps/api/package.json
COPY --from=builder /repo/packages/contracts/package.json     packages/contracts/package.json

# Prod-only install for the @emerald/api subgraph
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@emerald/api..."

# Copy built artifacts
COPY --from=builder /repo/apps/api/dist                        apps/api/dist
COPY --from=builder /repo/apps/api/prisma                      apps/api/prisma
COPY --from=builder /repo/apps/api/src/infra/database/prisma   apps/api/src/infra/database/prisma
COPY --from=builder /repo/apps/api/prisma.config.ts            apps/api/prisma.config.ts

# Built contracts consumed at runtime
COPY --from=builder /repo/packages/contracts/dist              packages/contracts/dist
COPY --from=builder /repo/packages/contracts/src               packages/contracts/src

# Prisma generated client is placed into apps/api/node_modules/.prisma and @prisma
COPY --from=builder /repo/apps/api/node_modules/.prisma        apps/api/node_modules/.prisma
COPY --from=builder /repo/apps/api/node_modules/@prisma        apps/api/node_modules/@prisma

RUN chown -R emerald:emerald /repo

USER emerald

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3333/health || exit 1

CMD ["node", "apps/api/dist/http/main.js"]
