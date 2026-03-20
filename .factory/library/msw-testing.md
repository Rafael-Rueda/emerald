# MSW Testing Infrastructure

How to use the shared MSW mock infrastructure across the monorepo.

## Packages

- **`@emerald/contracts`** — Zod schemas for all API contracts (document, navigation, version, search, AI context, workspace). Import schemas for validation at data boundaries.
- **`@emerald/mocks`** — MSW handlers, fixture data, and scenario builders. Import from subpaths:
  - `@emerald/mocks` — Re-exports scenarios, fixtures, and handlers
  - `@emerald/mocks/browser` — `createMswWorker()` for browser-side MSW (Storybook, dev apps)
  - `@emerald/mocks/node` — `createMswServer()` for Node-side MSW (Vitest)
  - `@emerald/mocks/storybook` — `withMsw()` decorator for Storybook stories
  - `@emerald/mocks/fixtures` — All fixture data
  - `@emerald/mocks/handlers` — Handler factories
  - `@emerald/mocks/scenarios` — Scenario types and config
- **`@emerald/test-utils`** — Test helpers:
  - `createTestServer(config)` — Creates an MSW node server for Vitest
  - `renderWithProviders(ui)` — RTL render with test QueryClient

## Scenarios

Every handler supports 5 scenarios via `ScenarioConfig`:
- **`success`** — Returns valid fixture data (default)
- **`loading`** — Infinite delay (for testing loading states)
- **`error`** — Returns HTTP 500
- **`not-found`** — Returns HTTP 404 or empty results
- **`malformed`** — Returns HTTP 200 with schema-invalid data

## Vitest Usage

```ts
import { createTestServer } from "@emerald/test-utils";
import { DocumentResponseSchema } from "@emerald/contracts";

const server = createTestServer({ document: "success" });

beforeAll(() => server.start());
afterEach(() => server.resetHandlers());
afterAll(() => server.stop());

it("fetches a document", async () => {
  const res = await fetch("http://localhost/api/docs/guides/v1/getting-started");
  const data = await res.json();
  const parsed = DocumentResponseSchema.safeParse(data);
  expect(parsed.success).toBe(true);
});
```

## Storybook Usage

```tsx
import { withMsw } from "@emerald/mocks/storybook";

export default {
  title: "Features/MyComponent",
  decorators: [withMsw({ document: "success" })],
};
```

## API Routes

All handlers match `*/api/...` (wildcard origin) so they work in both Node tests (`http://localhost/api/...`) and browser contexts (`/api/...`).

### Public
- `GET /api/docs/:space/:version/:slug` — Document resolution
- `GET /api/navigation/:space/:version` — Navigation tree
- `GET /api/versions/:space` — Version list
- `GET /api/search?q=:query` — Search

### Workspace
- `GET /api/workspace/documents` — Document list
- `GET /api/workspace/documents/:id` — Document detail
- `GET /api/workspace/navigation` — Navigation list
- `GET /api/workspace/navigation/:id` — Navigation detail
- `GET /api/workspace/versions` — Version list
- `GET /api/workspace/versions/:id` — Version detail
- `POST /api/workspace/documents/:id/publish` — Document mutation
- `POST /api/workspace/navigation/:id/reorder` — Navigation mutation
- `POST /api/workspace/versions/:id/publish` — Version mutation

### AI Context
- `GET /api/workspace/ai-context/:entityType/:entityId` — AI context chunks

## Vitest Resolve Aliases

The root `vitest.config.ts` includes resolve aliases for all `@emerald/*` workspace packages. This allows tests anywhere in the monorepo to import from workspace packages without pnpm symlink resolution issues.

## Fixture Data

Fixtures include canonical entities with matching labels across public and workspace surfaces (VAL-CROSS-006 ready). The default fixtures include:
- 3 documents (2 in v1, 1 in v2; with and without headings)
- 2 navigation trees (v1, v2)
- 2 versions (v1 published/default, v2 draft)
- 3 search results with space/version disambiguation
- 2 AI context chunks with full provenance
- 2 workspace entities per domain (documents, navigation, versions)
