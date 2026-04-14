# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** required env vars, external service assumptions, local environment constraints, dependency quirks.
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

## Platform

- Windows 10/11, Node `22.21.1`, pnpm `10.12.4`
- AMD Ryzen 7 7800X3D, 64 GB RAM, 8 cores / 16 logical processors

## Existing Listeners (OFF-LIMITS — other projects)

- Port **5432** — `ceokpi-postgres` (another project's database)
- Port **27017** — `docs-mongodb`
- Port **1433** — `controlador-integracoes-db`
- Port **5672** — service bus emulator

## Emerald Services (this mission)

- **3100** — apps/docs (public docs frontend)
- **3101** — apps/workspace (admin workspace frontend)
- **3333** — apps/api (Sardius NestJS backend)
- **5434** — Emerald PostgreSQL dev (Docker, Emerald's own compose file)
- **5435** — Emerald PostgreSQL test (Docker, Emerald's own compose file)
- **6100** — Storybook

## Backend Environment Variables (apps/api/.env)

See `apps/api/.env.example` for the complete list of required keys and their format.

Key categories:
- **DB**: connection strings for dev (port 5434) and test (port 5435) databases
- **JWT**: RS256 key pair (base64-encoded PEM); generate via `apps/api/scripts/generate-jwt.ps1`
- **Google OAuth**: client ID, client secret, redirect URL
- **GCP**: bucket name and service account key file path
- **Server**: port (default 3333), max upload size

Generate RS256 keys on Windows:
```powershell
# Run the script at apps/api/scripts/generate-jwt.ps1
# Copy output to JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in .env
```

## Frontend Environment Variables

**apps/docs/.env.local** and **apps/workspace/.env.local**:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (dev: http://localhost:3333) |

Both apps have `.env.local.example` files with placeholder values.

## MSW Behavior

- MSW is preserved and works in: Storybook, Vitest unit/integration tests, and as a runtime fallback when API is offline
- Both apps check `GET ${NEXT_PUBLIC_API_URL}/health` on startup (1500ms timeout)
- If health check passes → real API is used; MSW does NOT start
- If health check fails/times out → MSW starts as fallback (dev offline mode)
- The `onlyBuiltDependencies` list (esbuild, msw, sharp) is in `pnpm-workspace.yaml`

## Dependency Notes

- Zod version: **v4** (migrated from v3 as part of api-bootstrap milestone)
- Sardius uses npm internally; adapted to pnpm workspace via `pnpm-workspace.yaml` glob `apps/*`
- `@emerald/configs/tailwind/preset` export works via explicit exports map in configs package.json
- `pnpm install` must be run from monorepo root to resolve all workspace packages correctly

## Semantic Search / AI Context (added: semantic-search mission)

- **VOYAGE_API_KEY** — Required in `apps/api/.env`. Obtain from https://www.voyageai.com/. Server refuses to start without it.
- **PostgreSQL images** — Both containers (5434, 5435) use `pgvector/pgvector:pg17` (switched from bitnami/postgresql). Volume data at `apps/api/data/pg` and `apps/api/data/pg-test` must be cleared when switching images.
- **pgvector npm package** — Required in `apps/api` for `pgvector.toSql()` serialization in `$queryRaw`.
- **voyageai npm package** — Required in `apps/api` for embedding generation.
- **@modelcontextprotocol/sdk** — Required in both `apps/api` and `packages/mcp-server` (v1.27.1). Use StreamableHTTP transport in NestJS; Stdio transport in CLI.
- MCP CLI package: `packages/mcp-server` (internal, not published). API_URL env var controls target (default: http://localhost:3333).

## Production Environment Variables (.env.production)

Used by `docker-compose.production.yml` and by the `api`, `docs`, and `workspace` service images. Copy `.env.production.example` to `.env.production` at the repo root; `scripts/setup-production.sh` fills most of these in for you. See that example file for the full set and allowed values.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string with pgvector. Inside the compose network: `postgres://emerald:<pw>@postgres:5432/emerald`. |
| `JWT_PRIVATE_KEY_PATH` | Container path to the RS256 private key (e.g. `/app/secrets/jwt-private.pem`); mounted from `./secrets/`. |
| `JWT_PUBLIC_KEY_PATH` | Container path to the RS256 public key; mounted from `./secrets/`. |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret. |
| `GOOGLE_CALLBACK_URL` | Full public callback URL: `https://api.${DOMAIN}/api/auth/google/callback`. |
| `GCP_STORAGE_BUCKET` | GCP Cloud Storage bucket name for image/file uploads. |
| `GCP_SERVICE_ACCOUNT_KEY_PATH` | Container path to the GCP service account JSON key; mounted from `./secrets/`. |
| `EMBEDDING_PROVIDER` | `voyage` \| `openai` \| `google` \| `ollama`. Drives which adapter wires in at boot. |
| `EMBEDDING_DIMENSION` | Vector dimension for the live `document_chunks.embedding` column. Must match the selected provider/model. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins for the API, typically `https://docs.${DOMAIN},https://app.${DOMAIN}`. |
| `PUBLIC_API_URL` | Public URL of the API, baked into the `docs` and `workspace` Next.js builds: `https://api.${DOMAIN}`. |
| `PUBLIC_DOCS_URL` | Public URL of the docs portal: `https://docs.${DOMAIN}`. |
| `PUBLIC_WORKSPACE_URL` | Public URL of the workspace admin: `https://app.${DOMAIN}`. |
| `DOMAIN` | Apex domain used to derive the three subdomains (`api`, `docs`, `app`). Consumed by Caddy when the `with-proxy` profile is active. |

Provider-specific keys (`VOYAGE_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_PROJECT_ID`, `OLLAMA_BASE_URL`, etc.) live in the same file; only the ones required by the active `EMBEDDING_PROVIDER` are validated at boot. See the main README's `## Embedding Providers` table for the full matrix and `apps/api/src/env/env.ts` for the `superRefine` validation rules.

## External Accounts Required (not automated by init.sh)

- **GCP Service Account** with Storage Object Admin permission on the configured bucket
- **Google OAuth 2.0** credentials (Client ID + Secret) from Google Cloud Console
- A GCP service account JSON key file placed at the path specified in `GCP_KEY_FILE_PATH`

These credentials are never committed to source control.
