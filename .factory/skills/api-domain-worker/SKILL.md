---
name: api-domain-worker
description: Implements NestJS bounded contexts following Sardius DDD pattern — domain use-cases, infra repositories, HTTP controllers.
---

# API Domain Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features in the `core-api` and `content-api` milestones:
- Implementing NestJS bounded contexts (auth, spaces, documents, navigation, versions, storage)
- Adding use-cases, entities, value objects, repository interfaces, Prisma implementations
- Adding NestJS controllers, services, schemas, presenters
- Writing unit tests (Jest, in-memory fakes) and E2E tests (supertest)

## Work Procedure

### Step 1: Understand the Bounded Context
Read `mission.md`, `AGENTS.md`, and the feature description. Understand what domain entities, use-cases, and HTTP endpoints are needed. Study existing bounded contexts (identity, storage) in `apps/api/src/` as examples.

### Step 2: Start Required Services
```bash
# Ensure postgres-dev is running on port 5434
docker compose -f apps/api/docker-compose.yml up -d

# Verify connectivity
docker ps | findstr emerald
```

### Step 3: Write Domain Unit Tests FIRST
In `src/domain/<context>/application/__tests__/unit/`, write Jest unit tests for each use-case using in-memory repository fakes (never real Prisma). Tests must FAIL before implementation.

```bash
pnpm --filter @emerald/api test:unit -- --testPathPatterns=<context>
# Should fail initially (red)
```

### Step 4: Implement Domain Layer
Following Sardius DDD pattern:
```
src/domain/<context>/
  enterprise/entities/<Entity>.entity.ts   # extends Entity or AggregateRoot
  enterprise/value-objects/*.vo.ts
  enterprise/events/*.event.ts
  application/repositories/<entities>.repository.ts  # ABSTRACT interface
  application/use-cases/*.use-case.ts      # returns Either<Error, Value>
  errors/*.error.ts
```

All use-cases return `Either<DomainError, SuccessValue>`. NEVER throw.

### Step 5: Run Unit Tests (Green)
```bash
pnpm --filter @emerald/api test:unit -- --testPathPatterns=<context>
# Must pass (green)
```

### Step 6: Write E2E Tests FIRST
In `src/http/<context>/__tests__/e2e/<controller>.spec.ts`, write supertest tests using the test DB (port 5435). Tests must FAIL before HTTP layer exists.

```bash
pnpm --filter @emerald/api test:e2e -- --testPathPatterns=<context>
# Should fail initially (red)
```

### Step 7: Implement Infrastructure + HTTP Layers
```
src/infra/database/repositories/prisma/prisma-<entity>.repository.ts
src/infra/database/mappers/prisma/prisma-<entity>.mapper.ts
src/http/<context>/
  controllers/<entity>.controller.ts
  services/<entity>.service.ts   # maps Either → HTTP status
  schemas/<entity>.schema.ts     # Zod v4 schemas
  presenters/<entity>.presenter.ts
  <context>.module.ts
```

Register the new module in `src/http/app.module.ts`.

### Step 8: Run E2E Tests (Green)
```bash
pnpm --filter @emerald/api test:e2e -- --testPathPatterns=<context>
# Must pass
```

### Step 9: Verify Full Monorepo Health
```bash
pnpm --filter @emerald/api test:unit  # all unit tests
pnpm --filter @emerald/api test:e2e   # all E2E tests
pnpm typecheck                         # all packages
pnpm lint                              # all packages
pnpm test -- --run                     # frontend tests still pass
```

### Step 10: Manual API Verification
Start the API and test key endpoints with curl:
```bash
pnpm dev:api &
sleep 5

# Test the new endpoints
curl -X POST http://localhost:3333/api/workspace/documents \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","slug":"test","spaceId":"<space-id>"}'
```

### Step 11: Commit
Commit all changes. One commit per feature is preferred.

## Key Conventions

- **Either pattern**: `Left.call(error)` for failures, `Right.call(value)` for success
- **Zod v4**: `import { z } from "zod"` — use v4 syntax (no `.nonempty()`, no `.strict()` v3 API)
- **Prisma mapper**: `space` field in responses must be the space key string (`"guides"`), NOT the UUID
- **Auth guards**: Use `@Public()` to skip auth, `@Admin()` for SUPER_ADMIN, `@Roles(...)` for specific roles
- **Validation**: All request bodies validated via `ZodValidationPipe` before reaching the controller
- **No exceptions from domain**: Use `Either`, never `throw` in use-cases

## Example Handoff

```json
{
  "salientSummary": "Implemented Documents bounded context: CreateDocumentUseCase, UpdateDocumentUseCase, PublishDocumentUseCase (idempotent), CreateRevisionUseCase, GetRevisionsUseCase, Prisma repository with mapper, DocumentsController with 7 routes. 12 unit tests and 18 E2E tests passing. Unique constraint (spaceId, slug, releaseVersionId) tested — same slug different version returns 201, same version returns 409.",
  "whatWasImplemented": "src/domain/content/enterprise/entities/document.entity.ts, revision.entity.ts; src/domain/content/application/use-cases/ (6 use-cases); src/infra/database/repositories/prisma/prisma-documents.repository.ts; src/infra/database/mappers/prisma/prisma-document.mapper.ts; src/http/content/controllers/documents.controller.ts; src/http/content/services/documents.service.ts; src/http/content/schemas/document.schema.ts; content.module.ts registered in app.module.ts.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm --filter @emerald/api test:unit", "exitCode": 0, "observation": "42 unit tests passing" },
      { "command": "pnpm --filter @emerald/api test:e2e", "exitCode": 0, "observation": "31 E2E tests passing" },
      { "command": "pnpm typecheck", "exitCode": 0, "observation": "All packages clean" },
      { "command": "pnpm test -- --run", "exitCode": 0, "observation": "All 421+ frontend tests still pass" }
    ],
    "interactiveChecks": [
      { "action": "curl POST /api/workspace/documents with SUPER_ADMIN JWT", "observed": "201 with { id, status: 'draft' }" },
      { "action": "curl POST /api/workspace/documents with duplicate slug same version", "observed": "409 conflict" },
      { "action": "curl POST /api/workspace/documents with VIEWER JWT", "observed": "403 forbidden" },
      { "action": "curl POST /api/workspace/documents/:id/publish twice", "observed": "200 both times, no 500" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/domain/content/application/__tests__/unit/create-document.use-case.spec.ts",
        "cases": [
          { "name": "creates document with DRAFT status", "verifies": "VAL-CONTENT-001" },
          { "name": "returns DuplicateSlugError for same spaceId+slug+version", "verifies": "VAL-CONTENT-003" },
          { "name": "returns slug in same space different version as success", "verifies": "VAL-CONTENT-021" }
        ]
      },
      {
        "file": "src/http/content/__tests__/e2e/documents.controller.spec.ts",
        "cases": [
          { "name": "POST /api/workspace/documents → 201", "verifies": "VAL-CONTENT-001" },
          { "name": "POST with missing title → 422", "verifies": "VAL-CONTENT-002" },
          { "name": "VIEWER POST → 403", "verifies": "VAL-CONTENT-010" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A use-case depends on another bounded context that isn't implemented yet
- Prisma migration generates a conflict that can't be resolved at schema level
- The test DB (port 5435) is unavailable or has a conflicting state
- The Either error type expected by a use-case is not defined yet in the domain
