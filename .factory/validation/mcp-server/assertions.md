# Validation Contract — MCP Server
Generated: 2026-03-23

---

## Area: MCP Server

These assertions cover both the NestJS `McpController` (Streamable HTTP transport at `/api/mcp`) and the standalone `packages/mcp-server` CLI (stdio transport). Both expose the `search_documentation` tool that proxies to the NestJS public search endpoint.

---

### HTTP Transport (McpController)

### VAL-MCP-001: Initialize Handshake — Session ID Issued
A POST to `/api/mcp` carrying a valid MCP `initialize` JSON-RPC 2.0 request body and **no** `Mcp-Session-Id` request header must respond HTTP 200. The response must include a non-empty `Mcp-Session-Id` header and a JSON body whose `result` contains `protocolVersion` (non-empty string, e.g. `"2025-03-26"`), `serverInfo.name` (non-empty string), `serverInfo.version` (non-empty string), and `capabilities.tools` (object).
Evidence: HTTP response status 200; `Mcp-Session-Id` header value; response body parsed as JSON-RPC 2.0 with all four `result` sub-fields present and correctly typed.

### VAL-MCP-002: Initialize Handshake — Subsequent Request Accepted With Session ID
After a successful initialize (VAL-MCP-001), a second POST to `/api/mcp` with the `Mcp-Session-Id` header set to the value issued in the initialize response must be accepted. A `tools/list` message sent in this second call must return HTTP 200 with `result.tools` as a non-empty array.
Evidence: Two sequential HTTP captures; session ID value match between response header of initialize and request header of follow-up; `result.tools` array presence.

### VAL-MCP-003: Unknown Session ID Rejected
A POST to `/api/mcp` with a syntactically valid but server-unrecognized `Mcp-Session-Id` (e.g. a random UUID not previously issued) must be rejected with HTTP 404, or a JSON-RPC response containing a top-level `error` field. The server must not process the requested method against an unknown session.
Evidence: HTTP response code 404 or body containing `error` field; absence of a successful `result` payload.

### VAL-MCP-004: tools/list Returns search_documentation With Correct inputSchema
After a successful initialize, a `tools/list` request must return exactly one tool named `search_documentation`. Its `inputSchema` must be a valid JSON Schema object with `type: "object"`, `properties.query.type === "string"`, `properties.space.type === "string"`, `properties.version.type === "string"`, and `required` including all three properties.
Evidence: `tools/list` response body; JSON diff against declared input schema contract; `required` array contents.

### VAL-MCP-005: search_documentation Executes With Valid Args
A `tools/call` for `search_documentation` with all three required arguments (`query`, `space`, `version` — each a non-empty string) must return HTTP 200, no top-level `error`, and `result.content` as an array with at least one item of `type: "text"`. The `text` field must be parseable as JSON and the resulting object must conform to `SearchResponseSchema` from `@emerald/contracts`: `{ query: string, results: Array<{ id, title, slug, space, version, snippet }>, totalCount: number }`.
Evidence: HTTP 200 response; `result.content[0].text` parsed as JSON; validation against `SearchResponseSchema`.

### VAL-MCP-006: search_documentation Missing Required Args Returns MCP Error
A `tools/call` for `search_documentation` that omits any of the three required fields (`query`, `space`, or `version`) must not return a successful `result` containing document data. The response must contain a top-level JSON-RPC `error` object or a `result.content` item with `isError: true`.
Evidence: Response body for each missing-field sub-case (3 total); error indicator present; no `results` array in payload.

### VAL-MCP-007: search_documentation Wrong Arg Types Returns MCP Error
A `tools/call` for `search_documentation` where any argument is of the wrong type (e.g. `query: 123`, `space: null`, `version: []`) must return a JSON-RPC error (top-level `error` or `isError: true` content item) and must not return search results.
Evidence: Response body for at least one wrong-type case; error message string referencing type or validation failure; absence of `results` payload.

### VAL-MCP-008: search_documentation Empty Query Returns Empty Results
A `tools/call` for `search_documentation` with `query: ""` (empty string) and valid `space` and `version` must succeed (HTTP 200, no error) and return a payload where `results` is an empty array and `totalCount === 0`.
Evidence: HTTP 200; `result.content[0].text` parses to `{ query: "", results: [], totalCount: 0 }`.

### VAL-MCP-009: GET /api/mcp Opens SSE Stream
A GET request to `/api/mcp` with a valid `Mcp-Session-Id` must respond HTTP 200 with `Content-Type: text/event-stream` and keep the connection open for server-to-client push messages. The connection must not close immediately (stays open ≥ 1 second).
Evidence: HTTP 200; `Content-Type` header value; network capture showing persistent connection; at least one SSE-formatted line (`data: ...`) or open connection observable.

### VAL-MCP-010: DELETE /api/mcp Terminates Session
A DELETE to `/api/mcp` with a valid `Mcp-Session-Id` must return HTTP 200 or 204. A subsequent POST to `/api/mcp` with the same session ID must fail (HTTP 404 or JSON-RPC error), confirming the session was cleaned up server-side.
Evidence: DELETE response status 200 or 204; follow-up POST response status ≠ 200, or body containing top-level `error`.

### VAL-MCP-011: No Authorization Required on /api/mcp
POST, GET, and DELETE requests to `/api/mcp` must succeed for valid MCP protocol messages without any `Authorization` header. The endpoint must be decorated as `@Public()` (or equivalent guard bypass) so the NestJS JWT auth guard does not intercept MCP traffic.
Evidence: POST initialize without `Authorization` header returns HTTP 200 with `Mcp-Session-Id`; source code of `McpController` shows `@Public()` at class or handler level; no HTTP 401 for unauthenticated requests.

### VAL-MCP-012: McpController Registered in AppModule
The `McpModule` (containing `McpController`) must be imported in `AppModule` so that the `/api/mcp` routes exist. A `GET /api/mcp` with no session ID must return something other than HTTP 404.
Evidence: HTTP response status for `GET /api/mcp` is ≠ 404; `AppModule` imports list includes `McpModule`.

### VAL-MCP-013: API Offline Returns Graceful MCP Error (HTTP Transport)
When the backing database or public search service is unavailable during a `tools/call` for `search_documentation`, the NestJS process must not crash. The response must be HTTP 200 with a JSON-RPC `error` object or a `result.content` item with `isError: true` and a non-empty `message`. The server must continue to serve subsequent requests.
Evidence: Response body with DB offline contains error indicator; subsequent health-check endpoint returns 200; no uncaught exception in server logs.

---

### CLI Package (packages/mcp-server — stdio transport)

### VAL-MCP-014: CLI Starts Without Error
Running the `packages/mcp-server` entry point (via the `bin` field or `node dist/index.js`) must not exit with a non-zero code within 2 seconds of launch. The process must remain alive and listening on stdin.
Evidence: Process exit code null after 2-second delay; no error text on stderr; child-process liveness check.

### VAL-MCP-015: CLI Initialize Handshake via Stdin/Stdout
Writing a valid MCP `initialize` JSON-RPC 2.0 request (newline-delimited) to stdin must produce a valid JSON-RPC 2.0 response on stdout within 3 seconds. The response must contain `result.protocolVersion` (non-empty string), `result.serverInfo.name` (non-empty string), `result.serverInfo.version` (non-empty string), and `result.capabilities.tools` (object).
Evidence: Stdout line parsed as JSON; `jsonrpc === "2.0"`; `id` matches request `id`; all four `result` sub-fields present and non-empty.

### VAL-MCP-016: CLI tools/list Returns search_documentation via Stdio
After a successful CLI initialize (VAL-MCP-015), a `tools/list` JSON-RPC request on stdin must return a response on stdout whose `result.tools` array contains exactly one tool named `search_documentation` with an `inputSchema` satisfying the same contract as VAL-MCP-004.
Evidence: Stdout capture; `result.tools[0].name === "search_documentation"`; `inputSchema` properties and `required` field verified.

### VAL-MCP-017: CLI search_documentation Proxies to NestJS API
A `tools/call` for `search_documentation` via stdin with valid `query`, `space`, and `version` arguments must cause the CLI to issue an outbound HTTP request to `{API_URL}/api/public/search` and return the response as a JSON-RPC result on stdout. The `result.content[0].text` must parse to a valid `SearchResponse` object.
Evidence: Stdout contains JSON-RPC response; HTTP intercept or mock server log confirming outbound request to `API_URL`; `SearchResponseSchema` validation passes on the parsed text payload.

### VAL-MCP-018: CLI Respects API_URL Environment Variable
When launched with `API_URL=http://localhost:9999` (no listener), a `tools/call` for `search_documentation` must return a JSON-RPC error (top-level `error` or `isError: true`) referencing a connection failure. When launched with a valid `API_URL`, the same call must succeed. This confirms the variable is read and not hardcoded.
Evidence: Stdout comparison between two launches (invalid vs valid `API_URL`); error message for invalid URL references connection refused or ECONNREFUSED; success result for valid URL; HTTP intercept showing target host matches `API_URL`.

### VAL-MCP-019: CLI API Down Returns Graceful MCP Error via Stdio
When `API_URL` points to a host that returns HTTP 500, the CLI must not crash. It must write a JSON-RPC error response to stdout with a non-empty `message` and then remain alive to process subsequent requests.
Evidence: Stdout contains valid JSON-RPC error response; process exit code is null after response; stderr contains no unhandled exception stack trace; mock HTTP server log confirms 500 was received.

### VAL-MCP-020: CLI Handles Sequential Requests Correctly on Stdio
Sending two `tools/call` requests back-to-back to stdin (before receiving the first response) must eventually produce two responses on stdout, each with the `id` matching its respective request. Neither response may be silently dropped.
Evidence: Stdin/stdout pipe capture with two sequential writes; two distinct JSON-RPC response lines on stdout; each `id` field matches the originating request `id`.

---

### Packaging & Monorepo Integrity

### VAL-MCP-021: packages/mcp-server Has Correct package.json
`packages/mcp-server/package.json` must declare: `name` with the workspace scope (e.g. `@emerald/mcp-server`), a `bin` field pointing to the compiled entry point, `@modelcontextprotocol/sdk` at version `^1.27.1` in `dependencies`, and a `build` script that compiles TypeScript output to a `dist/` directory.
Evidence: `package.json` content; `pnpm ls @modelcontextprotocol/sdk --filter @emerald/mcp-server` output showing correct version; build script existence.

### VAL-MCP-022: CLI Entry Point Compiles and Runs After pnpm build
Running `pnpm build` (or `pnpm --filter @emerald/mcp-server build`) must produce a `dist/index.js` (or equivalent bin target) with no TypeScript compilation errors. The compiled file must be executable via `node`.
Evidence: Build command exit code 0; `dist/index.js` file exists; no TypeScript errors on stderr during build; `node dist/index.js` starts without immediate error.

### VAL-MCP-023: Tool Response Shape Consistent Across Both Transports
Regardless of whether `search_documentation` is called via the HTTP transport (VAL-MCP-005) or the CLI stdio transport (VAL-MCP-017), the `result.content[0].text` JSON payload must conform to the same `SearchResponseSchema` contract. Field names, types, and structure must be identical across both transports.
Evidence: Both HTTP and CLI response payloads validated against `SearchResponseSchema` from `@emerald/contracts`; no schema diff between transports.
