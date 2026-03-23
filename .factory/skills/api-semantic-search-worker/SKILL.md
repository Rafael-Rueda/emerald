---
name: api-semantic-search-worker
description: Implements semantic search features — database schema, chunking service, Voyage AI embeddings, semantic search endpoint, and MCP server for Emerald docs.
---

# API Semantic Search Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for any feature in the `vector-foundation` or `mcp-server` milestones:
- Prisma schema changes (pgvector extension, DocumentChunk model, migrations)
- `AiContextService` chunking and embedding generation
- Voyage AI SDK integration
- `POST /api/public/ai-context/search` endpoint
- `SemanticSearchQuerySchema` contract additions
- NestJS MCP module (`McpServerManager`, `McpController`)
- `packages/mcp-server` CLI package

## Required Skills

None required. Use `curl.exe` for manual verification (NOT PowerShell's `curl` alias — always use `curl.exe`).

## Key Conventions (read before writing any code)

### Project Layout
- API: `apps/api/src/` — domain logic in `domain/`, infra in `infra/`, HTTP layer in `http/`
- Prisma schema: `apps/api/src/infra/database/prisma/schema.prisma`
- Contracts: `packages/contracts/src/` — Zod v4 schemas, export from `index.ts`
- API tests use **Jest** (`pnpm --filter @emerald/api test:unit`), NOT Vitest
- Test files live alongside source in `__tests__/unit/` subdirectories
- Repository interface defined in `domain/`, implemented in `infra/database/prisma/`

### Coding Standards
- Use **Zod v4** API only. No `z.string().nonempty()` (use `.min(1)`). No `.strict()`.
- Follow the **Either pattern** for use-case returns: `Either<Error, Result>`
- NestJS modules: domain services in `domain/ai-context/`, HTTP layer in `http/`
- All env vars in `apps/api/src/env/env.ts` using Zod schema
- Use `@Public()` decorator for endpoints that don't require JWT
- Prisma schema path: `apps/api/src/infra/database/prisma/schema.prisma`
- `pgvector` npm package required for `pgvector.toSql(vector)` serialization in `$queryRaw`
- Vector column declared as `Unsupported("vector(512)")` — NO read/write through Prisma Client typed API; all vector I/O via `$queryRaw` / `$executeRaw`

### Important Technical Constraints
- `voyage-3-lite` produces **512-dimensional** embeddings (not 1536)
- `SemanticSearchQuerySchema`: `{query: z.string().min(1), space: z.string().min(1), version: z.string().min(1)}` — all required
- Search response uses `AiContextResponseSchema` with `entityType: "semantic-search"`, `entityId: <query string>`
- pgvector indexes (HNSW) must be added via raw SQL in a migration file — Prisma `migrate dev` will break them; add them in a separate `_add_index.sql` file applied with `$executeRaw` in a seed/init, or via a manual migration
- MCP SDK: use `@modelcontextprotocol/sdk` **v1.27.1** — NOT v2 prerelease. Use `StreamableHTTPServerTransport` (NOT legacy `SSEServerTransport`)
- MCP tool input schema uses **Zod v4** (`import * as z from 'zod/v4'` — note `zod/v4` subpath)
- Windows environment: always use `curl.exe` for HTTP checks (NOT `curl` alias in PowerShell)
- Docker image: `pgvector/pgvector:pg17` for both dev (5434) and test (5435) containers

## Work Procedure

### Step 1: Read and understand the feature
1. Read `mission.md` and `AGENTS.md` in the missionDir.
2. Read the feature's `preconditions` and `expectedBehavior` carefully.
3. Read the relevant existing source files to understand patterns.

### Step 2: Write failing tests (red phase)
1. Create the test file(s) for the feature first.
2. Use Jest (`jest.fn()`, `jest.Mocked<T>`) following the existing pattern in `apps/api/src/domain/documents/application/__tests__/unit/`.
3. Run tests and confirm they FAIL before writing implementation.
4. For Prisma-dependent code, mock the `PrismaService` or repository interface.

### Step 3: Implement to make tests pass (green phase)
1. Write implementation code following the existing DDD structure.
2. Run `pnpm --filter @emerald/api test:unit` to confirm tests pass.
3. Run `pnpm --filter @emerald/api build` or `pnpm typecheck` to confirm no TypeScript errors.

### Step 4: Manual verification
1. Start the API if not already running: services are defined in `.factory/services.yaml`.
2. Use `curl.exe` to test endpoints. JSON bodies must be written to a temp file on Windows (PowerShell inline JSON body escaping is unreliable).
3. For Prisma migrations: run `pnpm --filter @emerald/api prisma migrate dev --name <name>` (dev DB) or `pnpm --filter @emerald/api prisma migrate deploy` (test DB).
4. For Docker changes: run `docker compose -f apps/api/docker-compose.yml down && docker compose -f apps/api/docker-compose.yml up -d`.

### Step 5: Run validators
1. `pnpm --filter @emerald/api test:unit` — all unit tests pass
2. `pnpm typecheck` — no TypeScript errors across the monorepo
3. `pnpm lint` — no ESLint errors

### Step 6: Handoff
Complete the feature handoff with all required fields.

## Example Handoff

```json
{
  "salientSummary": "Implemented AiContextService.chunkDocument() with heading-delimited section chunking; wrote 6 unit tests (all passing) covering headings, no-headings, empty doc, and mixed block types. pnpm typecheck and lint pass clean.",
  "whatWasImplemented": "AiContextService in apps/api/src/domain/ai-context/application/ai-context.service.ts with chunkDocument() method that parses DocumentContent JSON into DocumentChunkInput objects. DocumentChunkRepository interface in domain/, Prisma implementation in infra/database/prisma/repositories/document-chunk.repository.ts.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "pnpm --filter @emerald/api test:unit -- --testPathPattern=ai-context",
        "exitCode": 0,
        "observation": "6 tests pass: heading-delimited, no-headings fallback, empty doc returns [], mixed block types include all text, sectionId/sectionTitle populated correctly"
      },
      {
        "command": "pnpm typecheck",
        "exitCode": 0,
        "observation": "No TypeScript errors"
      },
      {
        "command": "pnpm lint",
        "exitCode": 0,
        "observation": "No ESLint errors"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "apps/api/src/domain/ai-context/application/__tests__/unit/ai-context.service.spec.ts",
        "cases": [
          { "name": "chunkDocument - heading-delimited sections", "verifies": "VAL-VEC-007" },
          { "name": "chunkDocument - no headings returns one chunk", "verifies": "VAL-VEC-008" },
          { "name": "chunkDocument - empty doc returns []", "verifies": "VAL-VEC-009" },
          { "name": "chunkDocument - all block types contribute text", "verifies": "VAL-VEC-010" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- pgvector Docker containers fail to start after image switch
- `prisma migrate dev` fails on the shadow database due to missing vector extension
- Voyage AI SDK `voyageai` package has API breaking changes from v0.2.1
- `@modelcontextprotocol/sdk` v1.27.1 is unavailable or has breaking import changes
- Feature depends on a Prisma model or repository that hasn't been created yet (prior feature not done)
- Any environment variable other than `VOYAGE_API_KEY` appears to be missing from `.env`
