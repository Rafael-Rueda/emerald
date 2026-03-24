# Validation Contract — Cross-Area Flows
## vector-foundation × mcp-server
Generated: 2026-03-23

---

## Cross-Area Flows

These assertions span the **vector-foundation** area (embedding pipeline, semantic search REST endpoint, chunk storage) and the **mcp-server** area (MCP tool adapter that proxies documentation queries). All flows assume the NestJS API is running at `:3333` and the MCP server is reachable through its configured transport. Auth assumption: workspace publish endpoints require a valid AUTHOR bearer token; public search and MCP search are unauthenticated.

---

### VAL-CROSS-001: Publish-to-search — document content is findable via semantic search immediately after publish

An AUTHOR publishes a draft document via `POST /api/workspace/documents/:id/publish`. The publish use-case synchronously (or asynchronously within one polling window ≤ 5 s) triggers the embedding pipeline, which chunks the document's `plainText` content and stores the resulting vectors. A subsequent `GET /api/public/search?q=<unique-term-from-content>` returns at least one result whose `id` matches the published document's ID and whose `snippet` contains the unique term. Before publish (while the document is still in `"draft"` status) the same search query returns zero results for that document.

**Pass condition:** `SearchResponseSchema.parse(response)` succeeds; `results` array contains an entry with `id === publishedDocumentId`; `totalCount >= 1`.
**Fail condition:** `results` is empty **or** the document appears in results before it is published.
Evidence: (1) HTTP 200 on publish endpoint; (2) `GET /api/public/search?q=<term>` returns HTTP 200 within 5 s of publish; (3) `SearchResponseSchema` parse succeeds; (4) result `id` matches published document; (5) `GET /api/public/search?q=<term>` returns empty `results` when document is still draft.

---

### VAL-CROSS-002: Publish-to-search — non-published documents are never surfaced in search results

Three documents exist in the same space: one `"draft"`, one `"archived"`, one `"published"`. All three contain the same unique sentinel token in their content. A `GET /api/public/search?q=<sentinel>` returns exactly one result — the published document only. The draft and archived documents are not included regardless of their content match.

**Pass condition:** `results.length === 1`; the single result has `id === publishedDocId`.
**Fail condition:** `results` contains an entry matching the draft or archived document's ID.
Evidence: (1) Three documents created and set to their respective statuses via workspace API; (2) `GET /api/public/search?q=<sentinel>` response has `totalCount === 1`; (3) `results[0].id === publishedDocId`.

---

### VAL-CROSS-003: MCP-to-search bridge — `search_documentation` tool returns structurally identical results to the REST search endpoint

An MCP client issues a `search_documentation` tool call with `{ query: "getting started" }`. In parallel, a REST client issues `GET /api/public/search?q=getting+started`. Both responses are compared: the set of document IDs returned by the MCP tool exactly matches the set returned by the REST endpoint for the same query term. Title, slug, space, and version fields on each matching entry are equal.

**Pass condition:** `mcpResultIds` deep-equals `restResultIds` (same IDs in any order); for every ID present in both, `title`, `slug`, `space`, and `version` fields are identical.
**Fail condition:** The MCP tool returns an ID not present in the REST response, or omits an ID that the REST response includes.
Evidence: (1) MCP `search_documentation` tool response parsed against `SearchResponseSchema`; (2) REST `GET /api/public/search?q=getting+started` response parsed against `SearchResponseSchema`; (3) symmetric difference of `results[*].id` sets is empty.

---

### VAL-CROSS-004: MCP-to-search bridge — MCP tool call response satisfies `SearchResponseSchema`

An MCP client issues a `search_documentation` tool call with any non-empty query string. The tool's raw JSON response is passed to `SearchResponseSchema.safeParse()`. The parse succeeds with `success === true`. Required fields `query` (string), `results` (array), and `totalCount` (integer ≥ 0) are all present. Each element in `results` satisfies `SearchResultSchema`: `id`, `title`, `slug`, `space`, `version`, and `snippet` are all non-empty strings.

**Pass condition:** `SearchResponseSchema.safeParse(mcpToolResponse).success === true`.
**Fail condition:** `success === false`; any Zod validation issue is reported (missing field, wrong type, extra unrecognized fields that break strict mode).
Evidence: (1) Raw MCP tool response captured; (2) `SearchResponseSchema.safeParse(raw)` result logged; (3) assertion on `.success`.

---

### VAL-CROSS-005: MCP-to-search bridge — MCP tool call with empty or whitespace-only query returns empty results gracefully

An MCP client issues a `search_documentation` tool call with `{ query: "" }` or `{ query: "   " }`. The tool returns HTTP 200 (no server error). The `results` array is empty and `totalCount === 0`. The `query` field in the response reflects the normalized (trimmed) query string.

**Pass condition:** `SearchResponseSchema.safeParse(response).success === true`; `results.length === 0`; `totalCount === 0`; no 4xx or 5xx status returned.
**Fail condition:** Server returns a 4xx/5xx; `results` contains any entries; the parse fails.
Evidence: (1) MCP tool response with empty query; (2) `SearchResponseSchema` parse succeeds; (3) `results === []`; (4) `totalCount === 0`.

---

### VAL-CROSS-006: Space/version scoping — documents in space A do not appear in space B's scoped search results

Two spaces exist: `space-a` and `space-b`. Each has at least one published document containing the exact same unique sentinel phrase. When a scoped search is issued with `{ query: "<sentinel>", space: "space-a" }`, only the `space-a` document is returned (`results[*].space` is exclusively `"space-a"`). The same query scoped to `space-b` returns only the `space-b` document. A cross-space (unscoped) search returns both.

**Pass condition:** For the scoped `space-a` query, `results.every(r => r.space === "space-a")` is `true`. For the scoped `space-b` query, `results.every(r => r.space === "space-b")` is `true`. For the unscoped query, `results` contains entries from both spaces.
**Fail condition:** A scoped query leaks documents from the other space; or the unscoped query omits a document from either space.
Evidence: (1) Two spaces each with a published document containing `<sentinel>`; (2) Three search requests and their `results[*].space` values; (3) Set membership assertions for each response.

---

### VAL-CROSS-007: Space/version scoping — documents in a draft or unpublished version are not returned in search results

A space has two release versions: `v1` (status `"published"`) and `v2` (status `"draft"`). Both versions have a published document with the same slug and the same unique sentinel in their content. A `GET /api/public/search?q=<sentinel>` returns only the document from the published version `v1`. The draft-version document does not appear.

**Pass condition:** `results.every(r => r.version === "v1")` is `true`; `results` contains no entry with `version === "v2"`.
**Fail condition:** A result with `version === "v2"` appears in the response.
Evidence: (1) Two versions at different statuses; (2) `GET /api/public/search?q=<sentinel>` response; (3) assertion that `results` contains no `version === "v2"` entry.

---

### VAL-CROSS-008: First-use bootstrap — search returns empty gracefully when no documents are published

A clean environment is used (or a test database with no published documents). An unauthenticated client issues `GET /api/public/search?q=documentation`. The API responds HTTP 200 (no 500). The response body satisfies `SearchResponseSchema`: `query === "documentation"`, `results === []`, `totalCount === 0`.

**Pass condition:** HTTP 200; `SearchResponseSchema.safeParse(body).success === true`; `results.length === 0`; `totalCount === 0`.
**Fail condition:** HTTP 500 or any non-2xx status; `results` is non-array; parse throws; `totalCount` is negative.
Evidence: (1) Empty test database or environment with zero published documents confirmed; (2) HTTP 200 response; (3) `SearchResponseSchema` parse result with `.success === true`.

---

### VAL-CROSS-009: First-use bootstrap — MCP `search_documentation` call returns empty gracefully when no documents are published

Under the same empty-database conditions as VAL-CROSS-008, an MCP client issues `search_documentation` with a non-empty query. The tool responds without an error code. The response body parses against `SearchResponseSchema` with `results === []` and `totalCount === 0`. The MCP server itself does not crash or return a protocol-level error.

**Pass condition:** MCP tool returns a valid `SearchResponseSchema`-conforming payload; `results.length === 0`; no MCP protocol error (error code must be absent or null).
**Fail condition:** MCP server returns a protocol error; response fails `SearchResponseSchema` parse; `results` is `null` or `undefined`.
Evidence: (1) Empty database confirmed; (2) MCP tool response captured; (3) `SearchResponseSchema.safeParse(response).success === true`; (4) `results === []`.

---

### VAL-CROSS-010: Contracts consistency — `SemanticSearchQuerySchema` in `@emerald/contracts` parses valid query inputs correctly

`@emerald/contracts` exports `SemanticSearchQuerySchema`. The schema is called with the following valid inputs and must parse without error in all cases:
- `{ q: "getting started" }` — basic query
- `{ q: "api reference", space: "guides" }` — scoped to space
- `{ q: "tutorial", space: "guides", version: "v1" }` — scoped to space + version
- `{ q: "search", limit: 10 }` — with pagination limit
- `{ q: "" }` — empty query (normalized to empty results, not an error)

The schema must also reject the following invalid inputs:
- `{}` — missing `q` field entirely (if `q` is required)
- `{ q: "test", limit: -1 }` — negative limit
- `{ q: "test", limit: 0.5 }` — non-integer limit

**Pass condition:** All valid fixture parses return `success === true`; all invalid fixture parses return `success === false` with at least one Zod issue.
**Fail condition:** Any valid fixture fails to parse; any invalid fixture incorrectly passes.
Evidence: Unit test assertions in `packages/contracts/src/contracts.test.ts` — one `it` block per fixture; `pnpm test --filter contracts` exits 0.

---

### VAL-CROSS-011: Contracts consistency — `AiContextResponseSchema` validates the actual shape returned by the AI context API endpoint

An authenticated AUTHOR requests `GET /api/workspace/ai-context/:entityId` (or equivalent AI context endpoint). The raw JSON response body is captured and passed to `AiContextResponseSchema.safeParse()`. The parse must succeed. Required field constraints are verified:
- `entityId` is a non-empty string matching the request path parameter
- `entityType` is a non-empty string (e.g., `"document"`)
- `chunks` is an array (may be empty if no embeddings exist yet)
- Each chunk, if present, satisfies `AiContextChunkSchema`: `id` (string), `content` (string), `relevanceScore` (number between 0 and 1 inclusive), `source` (satisfies `AiSourceReferenceSchema`)
- Each `source` has: `documentId`, `documentTitle`, `versionId`, `versionLabel`, `navigationLabel`, `sectionId`, `sectionTitle`, `slug`, `space` — all non-empty strings

**Pass condition:** `AiContextResponseSchema.safeParse(apiResponse).success === true`; `entityId` in response equals the path parameter; all chunks' `relevanceScore` is in `[0, 1]`.
**Fail condition:** Parse fails with any Zod issue; `relevanceScore` is outside `[0, 1]`; `source` is missing any required field.
Evidence: (1) `GET /api/workspace/ai-context/:entityId` HTTP 200 response captured; (2) `AiContextResponseSchema.safeParse(body)` called and `.success` logged; (3) field-level assertions on first chunk if `chunks.length > 0`.

---

### VAL-CROSS-012: Contracts consistency — `AiContextResponseSchema` rejects malformed API responses

`AiContextResponseSchema.safeParse()` is called with structurally invalid payloads and must return `success === false` for each:
- `{ entityId: "doc-1", entityType: "document", chunks: "not-an-array" }` — `chunks` wrong type
- `{ entityId: "doc-1", chunks: [] }` — missing `entityType`
- `{ entityId: "doc-1", entityType: "document", chunks: [{ id: "c1", content: "x", relevanceScore: 1.5, source: { documentId: "d1" } }] }` — `relevanceScore > 1`; `source` missing required fields
- `{}` — entirely empty object

**Pass condition:** All four `safeParse` calls return `success === false`.
**Fail condition:** Any malformed payload incorrectly passes validation.
Evidence: Unit test assertions in `packages/contracts/src/contracts.test.ts`; `pnpm test --filter contracts` exits 0.

---

### VAL-CROSS-013: Re-publish updates embeddings — re-publishing a modified document refreshes its search chunks

A document with content `"initial content alpha"` is published. A `GET /api/public/search?q=alpha` returns the document. The document is then updated via `PATCH /api/workspace/documents/:id` with new content `"refreshed content beta"` (removing "alpha"). The document is re-published via `POST /api/workspace/documents/:id/publish`. Within the propagation window (≤ 5 s), a `GET /api/public/search?q=alpha` no longer returns the document, while `GET /api/public/search?q=beta` now returns it.

**Pass condition:** Post-republish, `GET /api/public/search?q=alpha` returns `results` with no entry for that document's ID; `GET /api/public/search?q=beta` returns `results` containing the document's ID.
**Fail condition:** The document still appears for the old term "alpha" after republishing; or the document does not appear for the new term "beta".
Evidence: (1) Initial publish — `GET /api/public/search?q=alpha` returns the document; (2) Content update + republish performed; (3) After ≤ 5 s, `GET /api/public/search?q=alpha` — empty results for this document; (4) `GET /api/public/search?q=beta` — document present in results.

---

### VAL-CROSS-014: Re-publish updates embeddings — AI context chunks reflect the latest revision after re-publish

Following a re-publish (as in VAL-CROSS-013), the AI context endpoint `GET /api/workspace/ai-context/:documentId` returns chunks whose `content` is derived from the new revision's text (contains "beta"), not the stale revision (no chunk contains only "alpha"). The `AiContextResponseSchema.safeParse()` on the refreshed response succeeds and `chunks` is non-empty.

**Pass condition:** `AiContextResponseSchema.safeParse(body).success === true`; at least one chunk's `content` contains the updated term; no chunk contains only the stale term from the previous revision.
**Fail condition:** Chunks still reflect old content after re-publish; response fails schema parse; `chunks` is empty after republishing a non-empty document.
Evidence: (1) Re-publish performed; (2) `GET /api/workspace/ai-context/:documentId` HTTP 200 response; (3) `AiContextResponseSchema` parse succeeds; (4) `chunks[*].content` strings inspected for presence/absence of terms.

---

### VAL-CROSS-015: Re-publish updates embeddings — unpublishing a document removes it from search results

A published document is unpublished via `POST /api/workspace/documents/:id/unpublish`. The document's status changes to `"draft"`. A subsequent `GET /api/public/search?q=<unique-term-from-content>` no longer returns the document. The MCP `search_documentation` call with the same query also no longer returns the document.

**Pass condition:** After unpublish, `GET /api/workspace/documents/:id` shows `status === "draft"`; `GET /api/public/search?q=<unique-term>` returns `results` with no entry for that document; MCP tool returns the same empty result set.
**Fail condition:** The document remains in search results (REST or MCP) after unpublishing.
Evidence: (1) HTTP 200 on unpublish endpoint; (2) `GET /api/workspace/documents/:id` — `status === "draft"`; (3) `GET /api/public/search?q=<unique-term>` — document absent from `results`; (4) MCP `search_documentation` — document absent from tool response.

---

### VAL-CROSS-016: End-to-end flow — full publish-to-MCP-search round trip

An AUTHOR creates a document via `POST /api/workspace/documents` with title `"Deployment Guide"` and unique body text `"xQz9unique"`. The document is published via `POST /api/workspace/documents/:id/publish`. An MCP client then calls `search_documentation` with `{ query: "xQz9unique" }`. The tool returns at least one result whose `slug` matches the published document's slug, `space` matches the document's space, and `title` equals `"Deployment Guide"`.

**Pass condition:** MCP tool `results` contains an entry where `title === "Deployment Guide"` and `snippet` contains `"xQz9unique"`. `SearchResponseSchema.safeParse(toolResponse).success === true`.
**Fail condition:** MCP tool returns zero results; or returns a result with incorrect `title`, `slug`, or `space`; or the response fails schema parse.
Evidence: (1) Workspace `POST /api/workspace/documents` — 201; (2) `POST /api/workspace/documents/:id/publish` — 200; (3) MCP `search_documentation` with `"xQz9unique"` — response captured; (4) `SearchResponseSchema` parse; (5) field assertions on the matching result entry.
