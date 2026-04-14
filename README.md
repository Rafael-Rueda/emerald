<div align="center">
  <img src="Emerald.png" alt="Emerald Logo" width="400" />
  <h1>Emerald</h1>
  <p><strong>Contract-First Documentation Platform Boilerplate</strong></p>
  <p><em>Install. Configure. Ship your docs.</em></p>

  <p>
    <a href="#features">Features</a> &middot;
    <a href="#quick-start">Quick Start</a> &middot;
    <a href="#architecture">Architecture</a> &middot;
    <a href="#monorepo-structure">Structure</a> &middot;
    <a href="#testing">Testing</a> &middot;
    <a href="#ai-ready">AI-Ready</a>
  </p>

  <div>
    <a href="https://github.com/Rafael-Rueda/emerald"><img src="https://img.shields.io/github/stars/Rafael-Rueda/emerald?style=flat&color=50C878" alt="Stars" /></a>
    <a href="https://github.com/Rafael-Rueda/emerald/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-50C878.svg" alt="License" /></a>
    <a href="https://gems.rueda.dev"><img src="https://img.shields.io/badge/Rueda_Gems-gems.rueda.dev-50C878.svg" alt="Rueda Gems" /></a>
    <a href="https://rueda.dev"><img src="https://img.shields.io/badge/By-rueda.dev-50C878.svg" alt="rueda.dev" /></a>
  </div>

  <br />

  <div>
    <img src="https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Next.js-15-000000.svg?logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/NestJS-11-E0234E.svg?logo=nestjs&logoColor=white" alt="NestJS" />
    <img src="https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4.svg?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Radix_UI-latest-161618.svg?logo=radixui&logoColor=white" alt="Radix UI" />
    <img src="https://img.shields.io/badge/Zod-4.x-3E67B1.svg?logo=zod&logoColor=white" alt="Zod" />
  </div>
  <div>
    <img src="https://img.shields.io/badge/Prisma-7-2D3748.svg?logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154.svg?logo=reactquery&logoColor=white" alt="TanStack Query" />
    <img src="https://img.shields.io/badge/MSW-2.7+-FF6A33.svg" alt="MSW" />
    <img src="https://img.shields.io/badge/TipTap-2-161618.svg" alt="TipTap" />
    <img src="https://img.shields.io/badge/Vitest-3-6E9F18.svg?logo=vitest&logoColor=white" alt="Vitest" />
    <img src="https://img.shields.io/badge/Playwright-1.49+-2EAD33.svg?logo=playwright&logoColor=white" alt="Playwright" />
    <img src="https://img.shields.io/badge/Storybook-9.1-FF4785.svg?logo=storybook&logoColor=white" alt="Storybook" />
    <img src="https://img.shields.io/badge/pnpm-10-F69220.svg?logo=pnpm&logoColor=white" alt="pnpm" />
    <img src="https://img.shields.io/badge/Node.js-22+-5FA04E.svg?logo=nodedotjs&logoColor=white" alt="Node.js" />
  </div>
</div>

<br />

> **Part of the [Rueda Gems](https://gems.rueda.dev) collection** — production-grade boilerplates crafted by [rueda.dev](https://rueda.dev), battle-tested in real projects and available as open-source for the community.

---

## Why Emerald?

Most documentation platforms force you into rigid SaaS models or require you to build everything from scratch. **Emerald sits in the middle**: a complete, production-ready documentation system that you own, customize, and deploy on your terms.

- **Zero config to run** — `pnpm install && pnpm dev:docs` and your docs portal is live
- **Full admin workspace** — manage documents, navigation trees, versions, and AI context through a built-in UI
- **Contract-first architecture** — Zod schemas enforce type safety from API boundary to UI, across every layer
- **AI-native from day one** — built-in AI context inspector with provenance tracking, ready to plug into any AI provider
- **Full-stack production system** — NestJS 11 API with PostgreSQL, Google OAuth 2.0, RS256 JWT, and GCP Cloud Storage; MSW layer preserved as a fallback when the API is offline

---

## Features

### Documentation Portal &nbsp;`apps/docs`
A public-facing documentation reader with everything you need out of the box.

- Dynamic document rendering with route-based navigation (`[space]/[version]/[slug]`)
- **SSR/ISR with Next.js Server Components** — document pages use `revalidate=60` for fast, cache-aware rendering
- Sidebar navigation with collapsible tree structure
- Table of contents auto-generated from headings
- Full-text search across all documentation
- Version selector for multi-version support
- Breadcrumb navigation
- Responsive layout with mobile hamburger menu
- Light/dark theme with cookie persistence
- **Dynamic `sitemap.xml`** — auto-generated from published documents only
- **Document-level SEO metadata** — `og:title`, `og:description`, `og:image` per page
- **HTML sanitization** via `isomorphic-dompurify` for safe server-side rendering

### Workspace Admin &nbsp;`apps/workspace`
A private admin panel for managing every aspect of your documentation.

- **Rich text editor** — TipTap-powered WYSIWYG editor with autosave and real-time content sync
- **Revision history** — browse previous versions of any document and restore with one click
- **Publish workflow** — optimistic UI for publishing documents with cross-surface ISR cache invalidation
- **Navigation tree editor** — drag-and-drop tree builder powered by dnd-kit
- **Document management** — list, edit, and track document status (published / draft / archived)
- **Version management** — create, publish, set-default, and archive documentation versions
- **Image uploads** — integrated with GCP Cloud Storage
- **AI Context Inspector** — view AI provenance data, source chunks, and relevance scoring
- **Canonical label mapping** — organize and map labels across your docs

### API Backend &nbsp;`apps/api`
A production-grade NestJS 11 backend (Sardius boilerplate) serving both frontend apps.

- **Authentication** — Google OAuth 2.0 + email/password, RS256 JWT tokens
- **PostgreSQL database** — Prisma 7 ORM with full migration and seeding support
- **GCP Cloud Storage** — file upload endpoints with signed URLs
- **REST API** — fully typed endpoints consumed by both `docs` and `workspace` apps
- **Docker Compose** — local dev (port 5434) and test (port 5435) PostgreSQL instances
- **486+ unit and integration tests** covering domain logic and HTTP controllers

### Shared Design System &nbsp;`packages/ui`
A Radix UI-based component library with Tailwind CSS, shared across both apps.

- Theme provider with SSR-safe hydration (no flash of wrong theme)
- Responsive shell layouts (PublicShell, WorkspaceShell)
- Primitives: Button, TextInput, Dialog, Tabs, Alert
- CVA-powered variants with full TypeScript inference
- Design tokens for colors and typography

### Storybook &nbsp;`:6100`
Component catalog with live previews, powered by Storybook 9.

---

<h2 id="ai-ready">AI-Ready Architecture</h2>

Emerald is designed to make your documentation **consumable by any AI**. The built-in AI Context module provides:

- **Provenance tracking** — every AI chunk knows its source document, version, and extraction metadata
- **Relevance scoring** — chunks carry relevance scores so AI models can prioritize context
- **Pluggable integration** — the contract layer (`@emerald/contracts`) defines AI context schemas that any provider can consume
- **Context inspector UI** — visualize exactly what an AI model sees when it queries your docs

Whether it's ChatGPT, Claude, Gemini, or your own RAG pipeline — Emerald gives your docs a structured, queryable surface for AI consumption.

### Semantic Search

`POST /api/public/ai-context/search` performs **vector similarity search** over your published documentation using pluggable embedding providers (Voyage AI by default) stored in PostgreSQL via **pgvector**. Send `{ query: string, space: string, version: string }` and receive an `AiContextResponseSchema` with ranked chunks ordered by semantic relevance. Embeddings are generated automatically when a document is published — no manual indexing step required.

See [Embedding Providers](#embedding-providers) for how to swap Voyage for OpenAI, Google Vertex AI, or self-hosted Ollama.

### MCP Server — NestJS (`/api/mcp`)

Emerald exposes a **Model Context Protocol** endpoint at `/api/mcp` using the **StreamableHTTP** transport. The `search_documentation` tool accepts `{ query, space, version }` and returns ranked documentation chunks from the semantic search index. The endpoint is public (no authentication required), making it trivial to connect any MCP-compatible AI client or IDE extension.

### MCP Server — CLI (`packages/mcp-server`)

A standalone **stdio MCP server** is available for use with Claude Desktop and other local MCP clients. Build it with `pnpm --filter @emerald/mcp-server build`, then run with `node packages/mcp-server/dist/index.js`. Set the `API_URL` environment variable to point to your deployed API (defaults to `http://localhost:3333`).

### Semantic Search Setup

| Variable | Where | Purpose |
|----------|-------|---------|
| `EMBEDDING_PROVIDER` | `apps/api/.env` | `voyage` (default), `openai`, `google`, or `ollama` |
| `EMBEDDING_DIMENSION` | `apps/api/.env` | Vector dimension; must match the chosen provider/model |
| `VOYAGE_API_KEY` | `apps/api/.env` | Voyage AI embeddings — obtain at [voyageai.com](https://voyageai.com) |

The Docker Compose configuration already uses the `pgvector/pgvector:pg17` image — no additional database setup is required beyond running `docker compose up -d`.

---

## Embedding Providers

Emerald ships with **four pluggable embedding providers**. Select one with the `EMBEDDING_PROVIDER` environment variable. Per-provider constraints (required API keys, allowed dimensions per model) are enforced at startup by a `z.superRefine` in `apps/api/src/env/env.ts` — a misconfigured env never boots the API.

| Provider | Default model | Default dim | Supported dims | Required env vars | When to use |
|---|---|---|---|---|---|
| `voyage` (default) | `voyage-3-lite` | 512 | `voyage-3-lite`: 512 · `voyage-3`: 1024 · `voyage-3-large` / `voyage-code-3`: 256 / 512 / 1024 / 2048 | `VOYAGE_API_KEY`, `VOYAGE_MODEL` | Default — balanced cost & quality |
| `openai` | `text-embedding-3-small` | 1536 | `text-embedding-3-small`: 512 / 768 / 1024 / 1536 · `text-embedding-3-large`: 256 / 1024 / 3072 | `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL` | You already have an OpenAI account |
| `google` | `text-embedding-004` | 768 | `text-embedding-004` / `text-multilingual-embedding-002`: 128 / 256 / 512 / 768 | `GOOGLE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_VERTEX_LOCATION`, `GOOGLE_EMBEDDING_MODEL` | You already run on GCP |
| `ollama` | `nomic-embed-text` | 768 | fixed per model: `nomic-embed-text` 768 · `mxbai-embed-large` 1024 · `all-minilm` 384 · `bge-m3` 1024 · `snowflake-arctic-embed` 1024 | `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL` | Self-hosted, zero API cost, offline-capable |

Provider implementations:
- Interface: `apps/api/src/domain/ai-context/application/providers/embedding-provider.ts`
- Adapters: `apps/api/src/infra/ai/providers/{voyage,openai,google-vertex,ollama}.embedding-provider.ts`
- Factory wiring: `apps/api/src/http/@shared/modules/ai-context.module.ts`

### Switching providers

> **Warning — cross-provider vectors are not interchangeable.** Even at the same dimension, a vector produced by Voyage is **not comparable** to one produced by OpenAI, Google, or Ollama. Whenever you switch `EMBEDDING_PROVIDER` (or change a provider's model), you **must** truncate existing embeddings and regenerate them. The `ai:dimension:apply` script handles the schema side; `ai:reindex` handles the content side.

Safe switch procedure:

```bash
# 1. Stop the API
docker compose stop api          # (or however you run the API)

# 2. Edit apps/api/.env — set EMBEDDING_PROVIDER, EMBEDDING_DIMENSION,
#    and the provider-specific keys (see the table above).

# 3. Apply the new dimension to the live database.
#    DESTRUCTIVE: drops the HNSW index, TRUNCATEs document_chunks,
#    alters the pgvector column type, recreates the index.
pnpm --filter @emerald/api ai:dimension:apply

# 4. Start the API again
docker compose start api

# 5. Regenerate embeddings for every published document with the new provider.
pnpm --filter @emerald/api ai:reindex
```

`apply-embedding-dimension.ts` is a no-op when the target dimension already matches the live column — safe to run repeatedly. It does **not** modify `schema.prisma`: the source of truth for the runtime dimension is `EMBEDDING_DIMENSION` + the live column type.

### Runtime dimension-mismatch warning

On boot, `apps/api/src/main.ts` compares the active provider's dimension to the live `document_chunks.embedding` column. If they diverge, a `WARN` log is emitted pointing you at `ai:dimension:apply` + `ai:reindex`. The API will still start, but semantic search results will be incorrect until the mismatch is resolved.

### Ollama setup

Ollama is **not bundled** in `docker-compose.production.yml` — GPU-heavy inference is usually orchestrated separately. Run it on the host (`ollama serve`) or in its own container, then point the API at it:

- **API in Docker, Ollama on the host (Windows / macOS):** `OLLAMA_BASE_URL=http://host.docker.internal:11434`
- **API in Docker, Ollama on the host (Linux):** add `--add-host=host.docker.internal:host-gateway` to the `api` service (or use the host's LAN IP) and use the same `host.docker.internal` URL.
- **Dedicated Ollama container on `emerald_net`:** `OLLAMA_BASE_URL=http://ollama:11434` and `docker run --network emerald_net --name ollama ollama/ollama`.

Remember to `ollama pull <model>` on the Ollama host before the API tries to embed anything (e.g. `ollama pull nomic-embed-text`).

---

## Self-host in Production

Emerald ships with a production-grade Docker Compose stack (`docker-compose.production.yml`) and a one-command setup script. Deploy it on any VPS with Docker installed, or drop the same images into Coolify/Kubernetes.

### Quick start

```bash
# 1. Clone the repo on your server
git clone https://github.com/Rafael-Rueda/emerald.git && cd emerald

# 2. Generate secrets, collect config, write .env.production, build images
./scripts/setup-production.sh

# 3. Bring the stack up (embedded Caddy with automatic TLS)
docker compose -f docker-compose.production.yml --profile with-proxy up -d

# …or, if TLS is terminated by an external proxy (Coolify, Cloudflare, nginx):
docker compose -f docker-compose.production.yml up -d
```

### Architecture

All services share the `emerald_net` bridge network. A single `DOMAIN` env var drives three subdomains:

| Service | Image | Role | Public at |
|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg17` | Database with pgvector | (internal) |
| `migrate` | built from `apps/api` | Init container — runs `prisma migrate deploy` once per deploy | (internal, exits) |
| `api` | built from `apps/api` | NestJS 11 API + MCP server | `api.DOMAIN` |
| `docs` | built from `apps/docs` | Public docs portal (Next.js SSR/ISR) | `docs.DOMAIN` |
| `workspace` | built from `apps/workspace` | Admin workspace (Next.js) | `app.DOMAIN` |
| `caddy` | `caddy:2` | Optional reverse proxy with Let's Encrypt TLS (profile `with-proxy`) | `:80`, `:443` |

The `migrate` container runs to completion before `api` starts (via `depends_on.condition: service_completed_successfully`), so schema changes are always applied in lock-step with new image builds.

### Required files

| File | Source | Purpose |
|---|---|---|
| `.env.production` | copy from `.env.production.example` and fill in | All runtime config (DB URL, OAuth, GCP, embedding provider, domain) |
| `secrets/jwt-private.pem` | generated by `scripts/setup-production.sh` | RS256 JWT signing key |
| `secrets/jwt-public.pem` | generated by `scripts/setup-production.sh` | RS256 JWT verification key |
| `secrets/gcp-service-account.json` | placed manually | GCP Storage credentials (path referenced from `.env.production`) |

`secrets/` is gitignored. Never commit it.

### Update flow

```bash
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

The `migrate` container automatically runs any pending Prisma migrations before `api` restarts. Zero-touch for the common case.

### Rollback

```bash
git checkout <previous-tag>
docker compose -f docker-compose.production.yml up -d --build
```

> **Warning — destructive migrations are one-way.** If the release you are rolling back from applied a non-reversible migration (column drop, type change, HNSW index rebuild), restore the database from a backup taken **before** the upgrade *before* restarting the older image.

### Backup & restore

```bash
# Dump the live database to ./backups/emerald-<timestamp>.sql.gz
./scripts/backup-db.sh

# Restore from a dump (DESTRUCTIVE: replaces current DB contents)
./scripts/restore-db.sh ./backups/emerald-2026-04-14T03-00-00Z.sql.gz
```

Schedule `backup-db.sh` daily via cron:

```cron
0 3 * * * cd /opt/emerald && ./scripts/backup-db.sh >> /var/log/emerald-backup.log 2>&1
```

### Runtime dimension-mismatch warning

On boot, the API compares the active embedding provider's dimension against the live `document_chunks.embedding` column. If they differ, a `WARN` log is emitted at startup. See [Embedding Providers — Runtime dimension-mismatch warning](#runtime-dimension-mismatch-warning) for the recovery procedure (`ai:dimension:apply` + `ai:reindex`).

### Deploy with Coolify

Coolify can drive the same Docker Compose file, or you can map each service to a native Coolify Application:

1. **Managed Postgres** — create a Coolify Postgres database using the `pgvector/pgvector:pg17` image; copy the connection string into `DATABASE_URL`.
2. **One Application per service** — create three Applications (`api`, `docs`, `workspace`) pointing at the same repo, each with:
   - Build context: repo root
   - Dockerfile: `apps/<service>/Dockerfile`
   - Port: `3333` / `3100` / `3101`
   - Domain: `api.DOMAIN` / `docs.DOMAIN` / `app.DOMAIN`
3. **Environment variables** — copy from `.env.production.example` into each Application's env settings. Share JWT keys, GCP credentials, and `DATABASE_URL` across all three.
4. **Skip the `caddy` service** — Coolify handles TLS and routing. Deploy without `--profile with-proxy`.
5. **Run migrations** — either use Coolify's pre-deploy command (`pnpm --filter @emerald/api prisma migrate deploy`) on the `api` Application, or deploy the full compose file once to let the `migrate` init container do it.

See [production-deploy.md](.factory/library/production-deploy.md) for the full operator runbook.

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | `>= 22.0` |
| pnpm | `>= 10.x` |
| Docker | `>= 24.x` |

### Install & Run (full stack)

```bash
# Clone the repository
git clone https://github.com/Rafael-Rueda/emerald.git
cd emerald

# Install dependencies
pnpm install

# Start the PostgreSQL database (Docker)
docker compose -f apps/api/docker-compose.yml up -d

# Run database migrations and seed
pnpm --filter @emerald/api prisma migrate deploy
pnpm --filter @emerald/api prisma db seed

# Start the API server → http://localhost:3333
pnpm dev:api

# Start the docs portal → http://localhost:3100
pnpm dev:docs

# Start the workspace admin → http://localhost:3101
pnpm dev:workspace

# Start Storybook → http://localhost:6100
pnpm storybook
```

> **MSW fallback** — if the API is offline, both frontend apps automatically fall back to the MSW mock layer so development can continue without the backend running.

### Build & Validate

```bash
# Production build
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

---

## Architecture

Emerald follows **Clean Architecture** principles with strict import boundaries enforced by ESLint.

```
┌─────────────────────────────────────────────────────────────┐
│                        apps/                                │
│  ┌────────────────────┐    ┌─────────────────────────────┐  │
│  │   docs (:3100)     │    │   workspace (:3101)         │  │
│  │   Next.js 15 SSR   │    │   Next.js 15                │  │
│  │                    │    │                             │  │
│  │  modules/          │    │  modules/                   │  │
│  │   ├─ documentation │    │   ├─ documents              │  │
│  │   ├─ navigation    │    │   ├─ navigation             │  │
│  │   ├─ search        │    │   ├─ versions               │  │
│  │   └─ versioning    │    │   └─ ai-context             │  │
│  └────────┬───────────┘    └──────────┬──────────────────┘  │
│           │         shared packages   │                     │
│  ┌────────┴───────────────────────────┴──────────────────┐  │
│  │                                                       │  │
│  │  ui/          contracts/     mocks/      configs/     │  │
│  │  Radix +      Zod schemas    MSW         Tailwind +   │  │
│  │  Tailwind     (source of     handlers    TS + Vitest  │  │
│  │  design       truth)         & fixtures  presets      │  │
│  │  system                                               │  │
│  │               data-access/   test-utils/              │  │
│  │               Query hooks    RTL + MSW helpers        │  │
│  │                                                       │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │            api (:3333) — NestJS 11                    │  │
│  │                                                       │  │
│  │  modules/                                             │  │
│  │   ├─ auth     (Google OAuth 2.0, RS256 JWT)           │  │
│  │   ├─ documents                                        │  │
│  │   ├─ navigation                                       │  │
│  │   ├─ versions                                         │  │
│  │   └─ storage  (GCP Cloud Storage)                     │  │
│  │                                                       │  │
│  │  Prisma 7 ──► PostgreSQL (:5434 dev / :5435 test)     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Each module follows a **layered structure**:

```
module/
  ├─ domain/          # Business rules, identity, validation
  ├─ application/     # Use-case hooks (useDocument, useNavigation, ...)
  ├─ infrastructure/  # Data fetching with Zod validation at boundary
  └─ presentation/    # React components (view, loading, error states)
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Zod contracts as single source of truth** | Schemas shared across apps, mocks, and tests — one change propagates everywhere |
| **Real API with MSW fallback** | Production NestJS backend serves both apps; MSW layer activates automatically when the API is offline |
| **SSR/ISR on docs pages** | Next.js Server Components with `revalidate=60`; publish action triggers `revalidatePath` for instant cache invalidation |
| **Discriminated union states** | Every data hook returns `loading \| success \| not-found \| error \| validation-error` — impossible to render wrong state |
| **Cookie-based theming** | Theme persists across both apps on the same host, SSR-compatible with no hydration flash |
| **Import boundary enforcement** | ESLint rules prevent packages from importing app internals — dependency flow is always downward |

---

## Monorepo Structure

```
emerald/
├── apps/
│   ├── api/               # NestJS 11 backend (Sardius boilerplate) — :3333
│   ├── docs/              # Public documentation portal (Next.js 15) — :3100
│   └── workspace/         # Workspace admin panel (Next.js 15) — :3101
│
├── packages/
│   ├── ui/                # Shared design system — Radix UI + Tailwind + CVA
│   ├── contracts/         # Zod schemas for all domains
│   ├── mocks/             # MSW handlers, fixtures, and scenarios
│   ├── test-utils/        # Testing Library + MSW helpers
│   ├── data-access/       # TanStack Query hooks
│   ├── configs/           # Shared TS, Tailwind, and Vitest config
│   └── mcp-server/        # Standalone stdio MCP server for Claude Desktop and local clients
│
├── e2e/                   # Playwright end-to-end tests
├── .storybook/            # Storybook 9 configuration
└── .factory/              # Architecture docs and AI worker specs
```

---

## Testing

Emerald ships with a comprehensive test suite across three layers.

```bash
# Unit + integration tests (486+ specs)
pnpm test

# API unit tests (Jest)
pnpm --filter @emerald/api test:unit

# API end-to-end tests (Jest + Supertest)
pnpm --filter @emerald/api test:e2e

# End-to-end tests (Playwright)
pnpm test:e2e
```

| Layer | Tool | Scope |
|-------|------|-------|
| **Unit / Integration** | Vitest + Testing Library | Components, hooks, contracts, MSW handlers |
| **API Unit** | Jest | NestJS domain logic and use cases |
| **API E2E** | Jest + Supertest | HTTP controller flows with test database |
| **End-to-End** | Playwright | Full user flows across docs and workspace |
| **Visual** | Storybook | Component states, variants, and responsive behavior |

Tests run against the same MSW handlers used in the browser — what you test is what you ship.

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | React 19, Next.js 15, NestJS 11 |
| **Language** | TypeScript 5.7+ (strict mode) |
| **Styling** | Tailwind CSS 3.4, CVA, clsx + tailwind-merge |
| **Components** | Radix UI (accessible primitives) |
| **Rich Text** | TipTap 2 (WYSIWYG editor) |
| **Drag & Drop** | dnd-kit |
| **Data** | TanStack Query 5, Zod 4.x |
| **ORM / DB** | Prisma 7, PostgreSQL 16 |
| **Auth** | Google OAuth 2.0, email/password, RS256 JWT |
| **Storage** | GCP Cloud Storage |
| **Sanitization** | isomorphic-dompurify |
| **Mock Layer** | MSW 2.7 (browser, Node, Storybook) |
| **Testing** | Vitest 3, Jest, Playwright 1.49, Testing Library |
| **Component Dev** | Storybook 9.1 |
| **Monorepo** | pnpm 10 workspaces |
| **Linting** | ESLint 9 (flat config) + TypeScript ESLint |
| **Runtime** | Node.js 22+ |

---

## Roadmap

- [x] Public documentation portal with full-text search
- [x] Workspace admin with document, navigation, and version management
- [x] AI context inspector with provenance tracking
- [x] Shared design system with light/dark theming
- [x] Contract-first Zod schemas across all boundaries
- [x] Comprehensive test suite (unit, integration, E2E) — 486+ specs
- [x] Real backend integration — NestJS 11 + PostgreSQL + Prisma 7
- [x] Google OAuth 2.0 + email/password auth with RS256 JWT
- [x] GCP Cloud Storage for file/image uploads
- [x] SSR/ISR on public docs pages with cross-surface cache invalidation
- [x] Document-level SEO metadata and dynamic sitemap.xml
- [x] TipTap rich text editor with autosave
- [x] Revision history with one-click restore
- [x] Publish workflow with optimistic UI
- [x] Navigation tree drag-and-drop editor (dnd-kit)
- [x] Semantic search via Voyage AI embeddings + pgvector (`POST /api/public/ai-context/search`)
- [x] MCP server — StreamableHTTP (`/api/mcp`) and standalone stdio CLI (`packages/mcp-server`)
- [x] Pluggable embedding providers (Voyage, OpenAI, Google Vertex AI, Ollama)
- [x] Self-host Docker Compose deployment (VPS / Coolify) with one-command setup script

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <br />
  <p>
    <a href="https://gems.rueda.dev"><strong>Other Gems</strong></a> &middot;
    <a href="https://rueda.dev"><strong>Rueda.Dev</strong></a> &middot;
    <a href="https://github.com/Rafael-Rueda"><strong>GitHub</strong></a>
  </p>
  <p><sub>Crafted with precision by <a href="https://rueda.dev">Rueda.Dev</a></sub></p>
</div>
