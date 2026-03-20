---
name: workspace-authoring-worker
description: Builds the workspace admin authoring UI — TipTap editor, document forms, autosave, revision history, navigation tree, publish workflow.
---

# Workspace Authoring Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features in the `workspace-authoring-ui` milestone:
- Connecting workspace app to real Sardius API
- TipTap editor integration with custom block schema
- Document create/edit pages with autosave
- Revision history panel
- Publish workflow UI
- Navigation tree editor with drag-and-drop
- Version management UI
- Asset upload dialog

## Work Procedure

### Step 1: Understand the Feature
Read `mission.md` and `AGENTS.md`. Understand what UI components, hooks, and API connections are needed. Explore the existing workspace module structure (`apps/workspace/src/modules/`).

### Step 2: Ensure Services Are Running
The workspace authoring UI connects to a real API. Workers need the API running to do manual verification:
```bash
docker compose -f apps/api/docker-compose.yml up -d
pnpm --filter @emerald/api prisma db seed
pnpm dev:api &
pnpm dev:workspace &
sleep 8
# Verify: curl http://localhost:3333/health && curl http://localhost:3101
```

### Step 3: Write Tests First (TDD)
Following the existing pattern (Vitest + Testing Library + MSW):
- Write failing tests in `apps/workspace/src/modules/<domain>/presentation/<Component>.test.tsx`
- Use `setupServer` from `packages/test-utils` and create MSW handlers for the new API routes
- Test: render, user interactions, API call assertions, error states
- Run: `pnpm test -- --run --reporter=verbose` (must fail initially)

### Step 4: Implement
Follow existing code conventions:
- Discriminated union view states: `{ state: "loading" | "success" | "error" | ... }`
- TanStack Query for all server state
- Zod v4 schemas at API boundaries
- Import from `@emerald/ui/primitives`, `@emerald/ui/lib/cn`, `@emerald/contracts`
- Never use `any` — TypeScript strict mode

For TipTap-specific work:
- Define extensions in `apps/workspace/src/modules/editor/extensions/`
- `toDocumentContent(editorJson)` must be unit-tested with all block types
- GCP image URLs must be stored in content_json, never blob: or data: URLs

For autosave:
- Use `useDebouncedCallback` or implement a custom debounce hook
- Debounce delay: 2000ms
- Validate content_json against `DocumentContentSchema.safeParse()` before saving
- Show saving indicator: "Saving..." → "Saved" / "Save failed"

For MSW fallback in msw-init.tsx:
- Fetch `${NEXT_PUBLIC_API_URL}/health` with AbortController (1500ms timeout)
- If 2xx → skip `worker.start()`
- If error/timeout → `worker.start()`

### Step 5: Run Tests (Green Phase)
```bash
pnpm test -- --run --reporter=verbose
# Must pass
pnpm typecheck
# Must exit 0
pnpm lint
# Must exit 0
```

### Step 6: Manual Browser Verification
For each implemented feature, perform at minimum:
```
1. Open http://localhost:3101 (workspace)
2. Navigate to the relevant admin section
3. Perform the main user action (create, edit, publish, drag)
4. Observe the expected outcome
5. Inspect the network panel for correct API calls
```

For every manual check, record in interactiveChecks.

### Step 7: Commit

## Key Conventions

- MSW handlers in `packages/mocks/` must be kept valid — the workspace tests still use them
- When connecting to real API, use `NEXT_PUBLIC_API_URL` env var from `.env.local`
- Auth: JWT stored in httpOnly cookie; include in requests via credentials: 'include' or Authorization header
- TipTap extensions must produce content that passes `DocumentContentSchema.safeParse()`
- Drag-and-drop: use `dnd-kit` (preferred, lightweight) or `@hello-pangea/dnd`
- Do NOT remove existing workspace module test files — update them to work with the new API

## Example Handoff

```json
{
  "salientSummary": "Implemented TipTap editor with all 9 block types (heading h1-h4, paragraph, ordered/unordered list, callout with 4 tones, code_block with language selector, image with GCP URL, table, tabs). Created toDocumentContent() mapper that converts TipTap JSON to DocumentContentSchema. 15 unit tests for mapper pass. Verified in browser: all blocks insertable, autosave fires once after 2s of rapid typing.",
  "whatWasImplemented": "apps/workspace/src/modules/editor/extensions/ (Callout, Tabs, custom headings), apps/workspace/src/modules/editor/tiptap-editor.tsx (EditorContent component), apps/workspace/src/modules/editor/to-document-content.ts (mapper), apps/workspace/src/modules/editor/to-document-content.test.ts (15 unit tests)",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm test -- --run", "exitCode": 0, "observation": "434 tests passing, 0 failures" },
      { "command": "pnpm typecheck", "exitCode": 0, "observation": "All packages clean" },
      { "command": "pnpm lint", "exitCode": 0, "observation": "No errors" }
    ],
    "interactiveChecks": [
      { "action": "Open /admin/documents/new in workspace", "observed": "TipTap editor rendered, all toolbar buttons visible" },
      { "action": "Type 10 characters rapidly, wait 2s", "observed": "Exactly one POST /revisions request in network panel after 2s delay; autosave indicator shows 'Saved'" },
      { "action": "Insert callout block with 'warn' tone", "observed": "Yellow callout block rendered in editor with warning icon" },
      { "action": "Insert image via upload dialog", "observed": "Thumbnail shown, content_json shows https://storage.googleapis.com/ URL after autosave" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/workspace/src/modules/editor/to-document-content.test.ts",
        "cases": [
          { "name": "converts heading node to DocumentContentSchema heading block", "verifies": "VAL-WS-017" },
          { "name": "converts callout node with info/warn/danger/success tones", "verifies": "VAL-WS-003" },
          { "name": "converts tabs node with nested content", "verifies": "VAL-WS-017" },
          { "name": "deeply nested tab > callout > code_block passes DocumentContentSchema.safeParse()", "verifies": "VAL-WS-017" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A required API endpoint doesn't exist yet (API milestone not complete)
- dnd-kit or TipTap extensions have conflicts with existing dependencies
- MSW handlers need to be updated but the change would break existing tests
- Auth middleware requires changes to API JWT structure
