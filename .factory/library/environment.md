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

## External Accounts Required (not automated by init.sh)

- **GCP Service Account** with Storage Object Admin permission on the configured bucket
- **Google OAuth 2.0** credentials (Client ID + Secret) from Google Cloud Console
- A GCP service account JSON key file placed at the path specified in `GCP_KEY_FILE_PATH`

These credentials are never committed to source control.
