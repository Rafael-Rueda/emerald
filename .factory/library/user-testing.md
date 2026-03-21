# User Testing

Runtime validation notes for browser-facing surfaces.

## Validation Surface

### Browser surfaces (agent-browser / Playwright)
- **Public docs app:** `http://localhost:3100` — document reading, SSR verification, search, version selector, sitemap
- **Workspace app:** `http://localhost:3101` — document CRUD, TipTap editor, revision history, publish flow, navigation tree, version management, asset upload
- **Storybook:** `http://localhost:6100` — shared UI components

### API surface (HTTP assertions via curl or supertest)
- **Sardius NestJS API:** `http://localhost:3333` — all REST endpoints, auth, RBAC, storage, spaces, documents, navigation, versions, search, health

### Browser validation path
Use Playwright directly (`pnpm test:e2e -- --project=chromium`) via test files in `e2e/`. The `agent-browser` skill may have OS-level port binding issues on Windows (`EACCES`). If agent-browser fails, fall back to Playwright's native API.

## Validation Concurrency

- **Browser-based validation (docs/workspace combined):** max 5 concurrent validators
  - Machine: 64 GB RAM, ~20 GB free, 16 logical processors
  - Each validator instance: ~400 MB browser + ~200 MB per app server
  - With API running (adds ~300 MB), safe budget is 5 concurrent validators
- **API-based validation (curl/supertest):** max 8 concurrent validators (no browser overhead)

## Pre-Test Setup (validators must do this before testing)

```bash
# 1. Start Emerald PostgreSQL
docker compose -f apps/api/docker-compose.yml up -d

# 2. Run migrations and seed
pnpm --filter @emerald/api prisma migrate deploy
pnpm --filter @emerald/api prisma db seed

# 3. Start API
pnpm dev:api &
sleep 5

# 4. Start frontend apps
pnpm dev:docs &
pnpm dev:workspace &
sleep 8

# 5. Verify health
curl http://localhost:3333/health  # must return { status: 'ok' }
curl -o /dev/null -s -w "%{http_code}" http://localhost:3100  # must return 200/301
curl -o /dev/null -s -w "%{http_code}" http://localhost:3101  # must return 200
```

## Test Credentials (from seed)

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@test.com | password123 |
| VIEWER | viewer@test.com | password123 |

To get a JWT for API testing:
```bash
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
# → { "accessToken": "<jwt>" }
```

## MSW Behavior in Tests

- **Vitest unit/integration tests:** MSW runs via msw/node (`@emerald/test-utils/msw-server`); not affected by health-check logic
- **Playwright e2e tests:** MSW runs in-browser; the health-check in msw-init.tsx will activate when API is NOT running during tests. For e2e tests that need real API, start the API before running.
- **Storybook:** MSW always active (dev mode, no health-check)

## MSW Scenarios for Testing Fallback

To test MSW fallback (API offline mode), stop the API:
```bash
# Stop API process on port 3333
powershell -Command "Get-NetTCPConnection -LocalPort 3333 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force }"
# Reload the app — MSW should activate within 1.5s timeout
```

## SSR Verification

To verify SSR without JavaScript:
```bash
# Document title must appear in HTML source (not just in JS bundle)
curl http://localhost:3100/guides/v1/getting-started | grep -i "<title>"
# Must show document-specific title, not generic "Emerald Docs"

# og:description must be present
curl http://localhost:3100/guides/v1/getting-started | grep "og:description"
```

## Cross-Surface Testing Notes

- To test VAL-CROSS-001 (publish flow): create doc in workspace → publish → check public docs. Allow up to 5s for ISR cache invalidation.
- To test VAL-CROSS-007 (theme cookie): set dark mode in docs at :3100, then open workspace at :3101 — same cookie domain (localhost) shares the theme.
- All validation contract assertions (VAL-*) must be verified against the exact criteria in `validation-contract.md`.

## API Test Notes

- All workspace endpoints require `Authorization: Bearer <jwt>` header
- Public endpoints (`/api/public/*`) require NO auth header
- Test DB (port 5435) is used by `pnpm --filter @emerald/api test:e2e`; dev DB (port 5434) is used at runtime
- Never run E2E tests against the dev DB — use the test DB only

## Known Pre-Existing Constraints

- Port 5432 is off-limits (another project's PostgreSQL)
- Playwright `webServer` config in `playwright.config.ts` may need updating to include the API service at port 3333

## Flow Validator Guidance: CLI
- CLI tests are inherently read-only or self-contained. Concurrent validators can safely run pnpm scripts, inspect file contents, or query the database state.
- For `pnpm install` or other mutating commands, they are safe because `init.sh` has already run them, so they should be fast and idempotent.
- Use the provided dev database on 5434 or test database on 5435 for Prisma validations.
- Keep tests within the monorepo directory.

## Flow Validator Guidance: core-api
- Test against `http://localhost:3333`.
- The API is fully started and ready.
- You can use `curl` for HTTP requests.
- For tests requiring authentication, first login via `/auth/login` to obtain a JWT token, and pass it via the `Authorization: Bearer <jwt>` header.
- Credentials: `admin@test.com` / `password123` (SUPER_ADMIN) and `viewer@test.com` / `password123` (VIEWER).
- Ensure any file uploads use the correct fields.
- Assertions can be run safely in parallel as they operate on non-conflicting spaces or are read-only.
