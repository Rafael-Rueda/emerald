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

**CRITICAL: Always poll for readiness after starting services. Never assume a fixed sleep is enough.**

```powershell
# 1. Start Emerald PostgreSQL
docker compose -f apps/api/docker-compose.yml up -d

# 2. Run migrations and seed
pnpm --filter @emerald/api prisma migrate deploy
pnpm --filter @emerald/api prisma db seed

# 3. Start API in background
$apiJob = Start-Job { Set-Location "C:\_Local\_Web-Devlopment\_Templates\Rueda Gems\Emerald"; pnpm dev:api }

# 4. WAIT for API to be ready (poll /health up to 60s)
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3333/health" -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
if (-not $ready) { Write-Error "API did not start within 60s" }

# 5. (Optional) Start frontend apps
$docsJob = Start-Job { Set-Location "C:\_Local\_Web-Devlopment\_Templates\Rueda Gems\Emerald"; pnpm dev:docs }
$wsJob = Start-Job { Set-Location "C:\_Local\_Web-Devlopment\_Templates\Rueda Gems\Emerald"; pnpm dev:workspace }
Start-Sleep -Seconds 15  # give Next.js time to compile

# 6. Verify health before spawning flow validators
curl.exe http://localhost:3333/health  # must return { "status": "ok" }
```

**On Linux/macOS (bash):**
```bash
docker compose -f apps/api/docker-compose.yml up -d
pnpm --filter @emerald/api prisma migrate deploy
pnpm --filter @emerald/api prisma db seed
pnpm dev:api &
# Poll for readiness
for i in $(seq 1 30); do
  sleep 2
  curl -sf http://localhost:3333/health && break
done
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

## Flow Validator Guidance: semantic-search and MCP (new — semantic-search mission)

### Semantic Search Endpoint
- Method: POST — use `curl.exe` (NOT GET)
- URL: `http://localhost:3333/api/public/ai-context/search`
- No Authorization header required
- Body: `{"query":"<term>","space":"<space-key>","version":"<version-key>"}`
- Write JSON body to a temp file on Windows: `Set-Content -Path "$env:TEMP\body.json" -Value '{"query":"test","space":"guides","version":"v1"}'`
- Then: `curl.exe -X POST http://localhost:3333/api/public/ai-context/search -H "Content-Type: application/json" -d @"$env:TEMP\body.json"`
- Expected response shape: `AiContextResponseSchema` — `{ entityId: string, entityType: "semantic-search", chunks: [] }`

### MCP Endpoint (NestJS StreamableHTTP)
- URL: `http://localhost:3333/api/mcp`
- Methods: POST (initialize + tool calls), GET (SSE stream), DELETE (close session)
- No Authorization header required
- Initialize body: `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}`
- After initialize: use `Mcp-Session-Id` header from response for subsequent requests

### MCP CLI
- Entry: `node packages/mcp-server/dist/index.js`
- Build first: `pnpm --filter @emerald/mcp-server build`
- Communicate via stdin/stdout (newline-delimited JSON-RPC 2.0)
- API_URL env var (default: http://localhost:3333)
- VOYAGE_API_KEY must be set for end-to-end semantic search to work

### Voyage AI Rate Limits

The Voyage AI free tier allows **3 requests per minute (3 RPM)**. Validators testing assertions that involve Voyage AI calls (publish-to-search, semantic search with real documents) MUST account for this:
- Run assertions that trigger embedding calls SEQUENTIALLY (not concurrently)
- Add at least **25 seconds** between consecutive Voyage AI calls
- The `voyageai` SDK has built-in retry (2 retries, exponential backoff) for 429 errors — but with 3 RPM the backoff window can be 20+ seconds
- Affected assertions: VAL-CROSS-001, VAL-CROSS-005, VAL-CROSS-006, VAL-CROSS-008 (all involve publish → embed → search flows)
- Use a max of 1 concurrent validator for assertions involving Voyage AI calls

### VOYAGE_API_KEY Requirement
- **Required in apps/api/.env** for semantic search and embedding to work
- Without it, the API will refuse to start
- The user has confirmed they will add this key before end-to-end testing

## Flow Validator Guidance: core-api
- Test against `http://localhost:3333`.
- The API is fully started and ready.
- You can use `curl` for HTTP requests.
- For tests requiring authentication, first login via `/auth/login` to obtain a JWT token, and pass it via the `Authorization: Bearer <jwt>` header.
- Credentials: `admin@test.com` / `password123` (SUPER_ADMIN) and `viewer@test.com` / `password123` (VIEWER).
- Ensure any file uploads use the correct fields.
- Assertions can be run safely in parallel as they operate on non-conflicting spaces or are read-only.
