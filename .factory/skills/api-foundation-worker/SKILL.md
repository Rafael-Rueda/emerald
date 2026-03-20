---
name: api-foundation-worker
description: Sets up backend infrastructure — Sardius scaffold, Prisma schema, Zod v4 migration, data-access layer.
---

# API Foundation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features in the `api-bootstrap` milestone:
- Scaffolding and configuring the Sardius NestJS backend at `apps/api`
- Migrating Zod v3 → v4 across the monorepo
- Expanding `@emerald/contracts` with new schemas
- Designing and migrating the Prisma schema
- Populating `packages/data-access` with REST client and query factories

## Work Procedure

### Step 1: Understand the Feature
Read the feature description fully. Read `mission.md` and `AGENTS.md`. Understand what contracts, Prisma models, or scaffold steps are expected.

### Step 2: Write Tests First (TDD)
- For `@emerald/contracts` changes: write failing unit tests in `packages/contracts/src/contracts.test.ts` BEFORE implementing the schemas.
- For `packages/data-access`: write failing unit tests in `packages/data-access/src/*.test.ts` before implementing.
- For Prisma schema: write the schema and verify via `prisma validate` (no unit tests for schema syntax, but write mapper unit tests).
- Run `pnpm test -- --run` to confirm tests are failing (red phase).

### Step 3: Implement
- For Sardius scaffold: run `npx @rueda.dev/gems-sardius apps/api` then adapt.
- For Zod v4 migration: update all package.json files, fix any breaking API changes in existing schemas.
- For contracts expansion: add new schemas to the appropriate `packages/contracts/src/*.ts` file and export from `index.ts`.
- For Prisma schema: edit `apps/api/src/infra/database/prisma/schema.prisma`, run `prisma validate`, `prisma generate`, and `prisma migrate dev`.
- For data-access: implement in `packages/data-access/src/`.

### Step 4: Verify (Green Phase)
```bash
# All tests must pass
pnpm test -- --run

# TypeScript must be clean
pnpm typecheck

# Lint must pass
pnpm lint
```

If any Sardius scaffold operations are needed:
```bash
# Start Docker
docker compose -f apps/api/docker-compose.yml up -d

# Run migrations
pnpm --filter @emerald/api prisma migrate dev

# Run seed
pnpm --filter @emerald/api prisma db seed

# Start API (verify it boots)
pnpm dev:api
# Then in another terminal: curl http://localhost:3333/health
```

### Step 5: Verify Specific Contracts
For DocumentContentSchema:
- Test deeply nested blocks (tab → callout → code block)
- Test slug validation (rejects 'Hello World', accepts 'hello-world')
- Test each block type individually

For data-access REST client:
- Verify TypeScript return types infer from Zod schemas
- Verify query key factories return stable arrays

### Step 6: Commit
Commit all changes. Commit message should describe what was built.

## Example Handoff

```json
{
  "salientSummary": "Implemented DocumentContentSchema with all 9 block types and deep nesting support. Added SpaceSchema, RevisionSchema, NavigationNodeSchema, ReleaseVersionSchema, AssetSchema and exported from @emerald/contracts. All 28 new contract tests pass. pnpm typecheck and pnpm test -- --run both exit 0.",
  "whatWasImplemented": "packages/contracts/src/document-content.ts with DocumentContentSchema (9 block types, recursive for tabs/callouts), packages/contracts/src/space.ts, packages/contracts/src/revision.ts, packages/contracts/src/navigation-node.ts, packages/contracts/src/release-version.ts, packages/contracts/src/asset.ts. Updated index.ts to export all. Added 28 unit tests in contracts.test.ts covering valid/invalid cases including deep nesting and slug validation.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm test -- --run", "exitCode": 0, "observation": "449 tests passing, 0 failures" },
      { "command": "pnpm typecheck", "exitCode": 0, "observation": "All 9 packages clean" },
      { "command": "pnpm lint", "exitCode": 0, "observation": "No errors" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "packages/contracts/src/contracts.test.ts",
        "cases": [
          { "name": "DocumentContentSchema validates heading block h1-h4", "verifies": "VAL-BOOT-007" },
          { "name": "DocumentContentSchema validates callout with info/warn/danger/success tones", "verifies": "VAL-BOOT-007" },
          { "name": "DocumentContentSchema validates deeply nested tab > callout > code_block", "verifies": "VAL-BOOT-007" },
          { "name": "DocumentContentSchema rejects unknown block type 'foobar'", "verifies": "VAL-BOOT-008" },
          { "name": "DocumentContentSchema rejects heading level 7", "verifies": "VAL-BOOT-008" },
          { "name": "slug validation rejects 'Hello World'", "verifies": "VAL-BOOT-009" },
          { "name": "slug validation accepts 'hello-world'", "verifies": "VAL-BOOT-009" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Sardius CLI fails to scaffold (network issue, version mismatch)
- `pnpm install` has unresolvable peer dependency conflicts after Zod v4 upgrade
- Prisma migrate fails due to constraint conflicts not resolvable at schema level
- Port 5434/5435 conflicts with another service already running (should not happen per mission setup)
