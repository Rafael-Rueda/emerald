# Architecture

Architectural decisions and code-organization rules for this mission.

**What belongs here:** repo layout, package responsibilities, module boundaries, canonical patterns.
**What does NOT belong here:** runtime commands/ports (use `.factory/services.yaml`).

---

## Repo Shape

- `apps/api` — NestJS 11 backend (Sardius boilerplate); port 3333
- `apps/docs` — public documentation portal (Next.js 15); port 3100
- `apps/workspace` — admin/authoring workspace (Next.js 15); port 3101
- `packages/ui` — shared UI primitives, compositions, tokens, theme support
- `packages/configs` — shared TypeScript, lint, test, and tooling config
- `packages/contracts` — Zod v4 contracts, DTOs, canonical identity/provenance types
- `packages/data-access` — REST client, query key factories, typed fetchers
- `packages/mocks` — MSW handlers, fixtures, scenario builders (API fallback + tests)
- `packages/test-utils` — RTL helpers, test providers, shared MSW test setup

## Backend Structure (apps/api — Sardius DDD)

```
apps/api/src/
  domain/                 # Pure business logic — ZERO external imports
    @shared/              # Either, Entity, AggregateRoot, ValueObject, DomainEvents
    identity/             # Bounded context: users, auth
    storage/              # Bounded context: file storage (GCP)
    content/              # NEW: documents, revisions, navigation, versions, spaces
  infra/
    database/
      prisma/
        schema.prisma     # Single schema file for all models
        migrations/       # Prisma migration files
      repositories/prisma/  # Implements domain repository interfaces
      mappers/prisma/       # Prisma model → domain entity → response DTO
    auth/providers/       # Google OAuth, bcrypt
    cryptography/         # JWT RS256
    storage/providers/    # GCP storage, sharp, file-validator
  http/                   # NestJS adapter (controllers, services, modules)
    @shared/              # Guards, pipes, decorators, presenters
    auth/                 # AuthController, AuthService
    users/                # UsersController, UsersService
    storage/              # StorageController, StorageService
    content/              # NEW: DocumentsController, NavigationController, VersionsController
    spaces/               # NEW: SpacesController
  env/env.ts              # Zod env validation at startup
```

## Frontend Structure (apps/docs, apps/workspace)

```
app/                      # Route composition, providers, layouts, boundaries
shared/                   # Truly domain-agnostic helpers/UI/hooks
modules/                  # Bounded business contexts
  <domain>/
    domain/               # Business rules, identity, validation
    application/          # Use-case hooks (useDocument, useNavigation, ...)
    infrastructure/       # Data fetching with Zod validation at boundary
    presentation/         # React components
editor/                   # TipTap editor extensions and utilities (workspace only)
```

## Core Rules

- **Shared packages must not import from apps**: ESLint enforces `no-restricted-imports`
- **Cross-module usage goes through public interfaces only**
- **Domain rules do not live inside useEffect or arbitrary components**
- **Zod v4 at every external boundary**: API requests, API responses, env vars
- **TanStack Query for remote state**: discriminated union view states only
- **URL state for navigable state**: `useSearchParams`, not component state
- **Either pattern in NestJS**: use-cases return `Either<Error, Value>`, never throw

## Key Patterns

### Discriminated View States (frontend)
```typescript
type ViewState =
  | { state: "loading" }
  | { state: "success"; data: T }
  | { state: "error"; message: string }
  | { state: "not-found" }
  | { state: "validation-error"; message: string };
```

### Either Pattern (backend)
```typescript
const result = await createDocumentUseCase.execute(dto);
if (result.isLeft()) throw new BadRequestException(result.value.message);
return result.value;
```

### MSW Fallback Pattern (both apps)
```typescript
// msw-init.tsx — health-check gated MSW startup
const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(1500) });
if (!res.ok) await startMswWorker(); // Only when API is offline
```

### Server Components for SSR (apps/docs)
```typescript
// page.tsx — async Server Component, data fetched server-side
export default async function DocPage({ params }) {
  const { space, version, slug } = await params;
  const document = await fetchDocumentSSR(space, version, slug);
  // Pass pre-fetched data to client component
  return <DocPageClient initialData={document} ... />;
}
export const revalidate = 60; // ISR
```

## Zod v4 Notes

- Migrated from v3: no `z.string().nonempty()` (use `.min(1)`), no `.strict()` v3 API
- `z.safeParse()` at all boundaries; use `.success` field to branch
- DocumentContentSchema is a discriminated union of block types — validate at both API boundary and in TipTap autosave before sending

## Semantic Search / AI Context Architecture (added: semantic-search mission)

### New Domain: ai-context
```
apps/api/src/
  domain/ai-context/
    application/
      ai-context.service.ts          # chunkDocument(), generateAndStoreEmbeddings(), semanticSearch()
      repositories/
        document-chunk.repository.ts  # Interface: deleteByDocumentId, createMany
      __tests__/unit/
  infra/database/prisma/repositories/
    document-chunk.repository.ts     # Prisma implementation (uses $executeRaw for vector writes)
  http/
    mcp/
      mcp.controller.ts              # POST/GET/DELETE /api/mcp (StreamableHTTP transport)
      mcp-server.manager.ts          # Manages McpServer instances + search_documentation tool
      mcp.module.ts
    public/controllers/
      ai-context.controller.ts       # POST /api/public/ai-context/search (new controller, not PublicController)
```

### packages/mcp-server (new package)
- Internal CLI (not published to npm)
- `packages/mcp-server/src/index.ts` — StdioServerTransport, McpServer, search_documentation tool
- `packages/mcp-server/src/client.ts` — HTTP client wrapper for semantic search API
- Build output: `packages/mcp-server/dist/index.js`

### pgvector Conventions
- `DocumentChunk.embedding` declared as `Unsupported("vector(512)")` — invisible to typed Prisma Client
- All vector I/O via `$executeRaw` (write) and `$queryRaw` (read/search)
- Cosine similarity: `1 - (embedding <=> ${param}::vector)` as relevance score
- HNSW index added via raw SQL migration (not in schema, Prisma would drop it on migrate)
- Use `pgvector.toSql(array)` from `pgvector` npm package for serialization

### MCP Transport Conventions
- NestJS: `StreamableHTTPServerTransport` at `/api/mcp` (POST/GET/DELETE)
- CLI: `StdioServerTransport` at stdin/stdout
- Tool inputSchema: `zod/v4` subpath import (`import * as z from 'zod/v4'`)
- Tool response: `content[0].text = JSON.stringify(AiContextResponseSchema result)`
- `entityType: "semantic-search"`, `entityId: <query string>` for search responses

## Prisma Schema Location

The Prisma schema is at `apps/api/src/infra/database/prisma/schema.prisma` (non-standard location per Sardius convention). The `prisma.config.ts` at `apps/api/` root wires this up.
