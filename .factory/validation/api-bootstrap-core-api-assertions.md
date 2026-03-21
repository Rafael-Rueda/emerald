# VAL Assertions: api-bootstrap + core-api

Testable behavioral assertions for two Emerald v2 milestone areas.
Area codes: `VAL-BOOT` (api-bootstrap) · `VAL-CORE` (core-api)

---

## Area 1: api-bootstrap (VAL-BOOT)

---

VAL-BOOT-001: apps/api is a recognized pnpm workspace member
The pnpm-workspace.yaml file includes a pattern that resolves to `apps/api`. Running `pnpm -r exec pwd` lists the api package. The api package.json must declare `"name": "@emerald/api"` (or equivalent scoped name).
Evidence: `pnpm -r exec pwd` output includes the `apps/api` path; `apps/api/package.json` exists with a valid name field.

---

VAL-BOOT-002: NestJS app bootstraps without runtime errors
Running `pnpm --filter @emerald/api build` produces a compiled `dist/main.js`. Executing `node dist/main.js` (or `pnpm --filter @emerald/api start`) starts the process without throwing on boot. The process remains alive for at least 3 seconds after start.
Evidence: Exit code 0 from build; no uncaught exception lines in the first 3 s of stdout/stderr; process PID is still alive after 3 s.

---

VAL-BOOT-003: Docker Compose defines postgres-dev on port 5434
A `docker-compose.yml` (or `docker-compose.yaml`) file exists at the repository root or `apps/api/`. It declares a Postgres service whose published port mapping binds host port 5434 to container port 5432. The `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` environment variables are set for the dev database.
Evidence: Parsed `docker-compose.yml` shows `5434:5432`; service name contains "dev" or "postgres-dev".

---

VAL-BOOT-004: Docker Compose defines postgres-test on port 5435
The same Compose file declares a second Postgres service with host port 5435 mapped to container port 5432. The database name or service name indicates a test environment. The two services use different database names so they do not conflict.
Evidence: Parsed `docker-compose.yml` shows `5435:5432`; service name contains "test" or "postgres-test"; `POSTGRES_DB` value differs from the dev service.

---

VAL-BOOT-005: Entire monorepo uses Zod v4 — no v3 dependency remains
Every package.json across the monorepo that declares `zod` as a dependency (direct or dev) specifies a version range that resolves to Zod 4.x (e.g., `^4.0.0`). No `package.json` contains a `"zod": "^3.*"` or `"zod": "3.*"` entry. `pnpm-lock.yaml` contains exactly one resolved Zod version and it is 4.x.
Evidence: `grep -r '"zod"' packages/*/package.json apps/*/package.json` shows only v4 ranges; `pnpm-lock.yaml` resolves a single `zod@4.x` entry.

---

VAL-BOOT-006: Existing contracts continue to parse with Zod v4
All pre-existing Zod schema tests in `packages/contracts/src/contracts.test.ts` and `packages/contracts/src/canonical-labels.test.ts` pass after the v3→v4 migration. No schema uses removed or renamed v3 APIs (e.g., `.nullish()` behavior differences). `pnpm test` exits 0.
Evidence: `pnpm test` exit code 0; test summary shows the contracts test files passed with no skipped assertions.

---

VAL-BOOT-007: DocumentContentSchema validates all supported block types
`@emerald/contracts` exports `DocumentContentSchema`. Calling `DocumentContentSchema.parse(block)` succeeds for one sample of each block type: `heading`, `paragraph`, `list`, `callout`, `code_block`, `image`, `table`, `tabs`. Each type must carry at minimum a `type` discriminant and type-appropriate content fields as defined in the schema.
Evidence: Unit test with one fixture per block type all pass; `pnpm test --filter contracts` exits 0.

---

VAL-BOOT-008: DocumentContentSchema rejects invalid or unknown block types
`DocumentContentSchema.parse({ type: "unknown_block" })` throws a `ZodError`. A block with a valid type but a missing required field (e.g., `heading` without `level`) also throws. A block with an extra unexpected field that is not `passthrough`-allowed either throws or strips the field, depending on the defined mode.
Evidence: Unit tests asserting `expect(() => parse(bad)).toThrow(ZodError)` for at least 3 invalid fixture cases all pass.

---

VAL-BOOT-009: RevisionSchema, NavigationNodeSchema, ReleaseVersionSchema, SpaceSchema, and AssetSchema are exported from @emerald/contracts
`packages/contracts/src/index.ts` re-exports all five new schemas. Importing them in a consumer TypeScript file compiles without error. Each schema `.parse()` call with a valid minimal fixture returns without throwing.
Evidence: `pnpm typecheck` passes across the monorepo; unit tests for each new schema (one valid fixture each) pass.

---

VAL-BOOT-010: Prisma schema defines all six required models without syntax errors
`apps/api/prisma/schema.prisma` (or equivalent path) defines models named `Space`, `Document`, `DocumentRevision`, `NavigationNode`, `ReleaseVersion`, and `Asset` (casing may follow Prisma conventions). Running `pnpm --filter @emerald/api prisma validate` exits 0 with no errors.
Evidence: `prisma validate` exit code 0; each model name appears in the schema file.

---

VAL-BOOT-011: Prisma client generates successfully from the schema
Running `pnpm --filter @emerald/api prisma generate` exits 0 and produces the Prisma Client in the configured output directory (`node_modules/.prisma/client` by default). The generated client exports TypeScript types for all six models.
Evidence: `prisma generate` exit code 0; `@prisma/client` can be imported in a TS file without type errors (verified by `pnpm typecheck`).

---

VAL-BOOT-012: data-access exports a REST client base with configurable base URL
`packages/data-access/src/index.ts` exports a function or class (e.g., `createApiClient` or `ApiClient`) that accepts at minimum a `baseUrl` string. Calling it with a valid URL returns an object that exposes HTTP methods (`get`, `post`, `patch`, `delete`) or equivalent. TypeScript typechecks cleanly.
Evidence: `pnpm typecheck` passes; unit test that constructs the client with `http://localhost:3000` and asserts it has the expected method names passes.

---

VAL-BOOT-013: data-access exports query key factories for each domain
`packages/data-access` exports a `queryKeys` (or equivalent) object with factory functions for each resource domain introduced in this milestone (spaces, documents, revisions, navigation, versions, assets). Each factory accepts relevant parameters (e.g., `queryKeys.spaces.detail(id)`) and returns a stable array. Calling the same factory with the same args twice returns deeply equal arrays.
Evidence: Unit test exercising each factory function (one call per domain) passes; `pnpm typecheck` exits 0.

---

VAL-BOOT-014: Full monorepo typecheck and lint pass after all api-bootstrap changes
Running `pnpm typecheck` and `pnpm lint` from the repository root both exit 0 with no errors. No new TypeScript errors or ESLint rule violations are introduced by the Zod v4 migration, new contracts schemas, or data-access additions.
Evidence: Both commands exit 0; terminal output shows 0 errors and 0 warnings (or pre-existing warnings only).

---

## Area 2: core-api (VAL-CORE)

---

VAL-CORE-001: Health check endpoint returns 200 with a status payload
`GET /health` returns HTTP 200. The response body is JSON and includes at least `{ "status": "ok" }`. The endpoint responds within 500 ms with no database connection required (it may optionally include DB status but must not block on it).
Evidence: `curl -s http://localhost:3200/health` returns HTTP 200 and body contains `"status":"ok"`.

---

VAL-CORE-002: Swagger/Scalar documentation UI is served at /docs
`GET /docs` returns HTTP 200. The response Content-Type is `text/html`. The HTML page contains recognizable Swagger UI or Scalar markup (e.g., `<title>` containing "API" or "Swagger" or "Scalar", or a `swagger-ui` / `scalar` element). The page loads without a 404 or redirect loop.
Evidence: `curl -s http://localhost:3200/docs` exits 200; response body contains one of `swagger-ui`, `scalar`, `openapi` strings.

---

VAL-CORE-003: GET /auth/google redirects to Google OAuth consent page
`GET /auth/google` returns HTTP 302 (or 301). The `Location` response header value contains `accounts.google.com/o/oauth2/` or `oauth2.googleapis.com`. The redirect includes `client_id`, `redirect_uri`, and `scope` query parameters.
Evidence: `curl -I http://localhost:3200/auth/google` shows 3xx status; `Location` header matches the pattern `accounts.google.com/o/oauth2/`.

---

VAL-CORE-004: GET /auth/google/callback with a valid OAuth code returns a JWT
Simulating a successful OAuth exchange (using a mocked or real code), `GET /auth/google/callback?code=<valid_code>` returns HTTP 200. The response body is JSON containing `{ "access_token": "<jwt_string>" }`. The JWT can be decoded (base64) and its payload includes a `sub` (user ID) and `role` field.
Evidence: Integration test with a mocked Google token exchange returns 200; response body parses as `{ access_token: string }`; decoded JWT payload has `sub` and `role` fields.

---

VAL-CORE-005: GET /auth/google/callback with a missing or invalid code returns 4xx
`GET /auth/google/callback` with no `code` query param returns HTTP 400. `GET /auth/google/callback?code=invalid_garbage` (simulating a token exchange failure) returns HTTP 401 or 400. Neither call triggers an unhandled server exception (no 500 response).
Evidence: Integration tests for both cases assert status codes 400 and 400/401 respectively; no 5xx observed.

---

VAL-CORE-006: POST /auth/login with valid credentials returns a JWT
`POST /auth/login` with body `{ "email": "<valid>", "password": "<valid>" }` returns HTTP 200. The response body contains `{ "access_token": "<jwt_string>" }`. The JWT is a valid three-part dot-delimited string. The decoded payload includes a `sub` field matching the user's ID and a `role` field.
Evidence: Integration test with a seeded or mocked user returns 200; `access_token` regex matches `/^[\w-]+\.[\w-]+\.[\w-]+$/`; decoded payload has `sub` and `role`.

---

VAL-CORE-007: POST /auth/login with invalid credentials returns 401
`POST /auth/login` with a known email but wrong password returns HTTP 401. `POST /auth/login` with a non-existent email returns HTTP 401. The response body must not reveal whether the email exists (generic "Invalid credentials" message only).
Evidence: Integration tests for both invalid-password and unknown-email cases assert HTTP 401; response body does not contain "email not found" or equivalent leak.

---

VAL-CORE-008: POST /auth/login with malformed or missing body returns 400
`POST /auth/login` with an empty body `{}` returns HTTP 400. `POST /auth/login` with `{ "email": "not-an-email", "password": "x" }` returns HTTP 400. The response body includes a validation error message or errors array describing the invalid fields. No 500 is returned.
Evidence: Integration tests assert 400 for both malformed payloads; response body contains `"message"` or `"errors"` key.

---

VAL-CORE-009: SUPER_ADMIN role can access all protected endpoints
A JWT with `role: SUPER_ADMIN` (obtained via login or issued in a test fixture) can call any protected endpoint without receiving 403. Specifically: GET /api/workspace/spaces, POST /api/workspace/spaces, PATCH /api/workspace/spaces/:id, DELETE /api/workspace/spaces/:id all return 2xx for a SUPER_ADMIN bearer token.
Evidence: Integration test suite with a SUPER_ADMIN fixture token asserts 2xx on each spaces endpoint.

---

VAL-CORE-010: VIEWER role receives 403 on write operations
A JWT with `role: VIEWER` calling `POST /api/workspace/spaces` returns HTTP 403. `PATCH /api/workspace/spaces/:id` and `DELETE /api/workspace/spaces/:id` also return 403. `GET /api/workspace/spaces` must still succeed (2xx) for VIEWER.
Evidence: Integration tests with a VIEWER fixture token: GET → 200, POST/PATCH/DELETE → 403.

---

VAL-CORE-011: Unauthenticated request to any protected endpoint returns 401
`GET /api/workspace/spaces` with no `Authorization` header returns HTTP 401. `POST /api/workspace/spaces` with no auth header also returns 401. The response does not contain any data that would only be available to authenticated users.
Evidence: `curl http://localhost:3200/api/workspace/spaces` (no auth) returns 401; same for POST.

---

VAL-CORE-012: POST /storage/upload with a valid file returns a public URL
`POST /storage/upload` with a `multipart/form-data` body containing a valid image or binary file and a valid `SUPER_ADMIN` bearer token returns HTTP 201. The response body contains `{ "url": "<https://...>" }` pointing to a GCP Storage bucket URL. The URL is a non-empty string starting with `https://`.
Evidence: Integration test (or mocked GCP Storage call) returns 201; response `url` matches `^https://`.

---

VAL-CORE-013: POST /storage/upload with no file returns 400
`POST /storage/upload` with an empty multipart body or with a missing `file` field returns HTTP 400. The response body includes an error message. No 500 is returned. An authenticated `SUPER_ADMIN` token is used so the error is not a 401.
Evidence: Integration test with valid auth but no file payload returns 400 with non-empty error body.

---

VAL-CORE-014: Spaces CRUD — full lifecycle works for SUPER_ADMIN
A SUPER_ADMIN can execute the full spaces CRUD flow: (1) `POST /api/workspace/spaces` with `{ "name": "test-space", "slug": "test-space" }` returns 201 with the created space object including `id`; (2) `GET /api/workspace/spaces` returns an array including the created space; (3) `GET /api/workspace/spaces/:id` returns the single space; (4) `PATCH /api/workspace/spaces/:id` with `{ "name": "renamed" }` returns 200 with updated `name`; (5) `DELETE /api/workspace/spaces/:id` returns 200 or 204; (6) subsequent `GET /api/workspace/spaces/:id` returns 404.
Evidence: Integration test executing all 6 steps in sequence passes; final GET asserts 404.

---

VAL-CORE-015: GET /api/workspace/spaces/:id for a non-existent space returns 404
`GET /api/workspace/spaces/nonexistent-id-000` with a valid SUPER_ADMIN bearer token returns HTTP 404. The response body contains an error message. No 500 or 200-with-null body is returned.
Evidence: Integration test with a fabricated UUID that does not exist in the DB asserts 404; response body has a `"message"` key.
