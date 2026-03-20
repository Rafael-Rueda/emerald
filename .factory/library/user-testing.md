# User Testing

Runtime validation notes for browser-facing surfaces.

## Validation Surface

- **Public docs app:** `http://localhost:3100`
  - Validate route resolution, reading shell, TOC, search, versioning, and public error states
- **Workspace app:** `http://localhost:3101`
  - Validate admin shell, list/detail flows, representative actions, AI context, and workspace error states
- **Storybook:** `http://localhost:6100`
  - Validate shared UI categories, tokens/foundations, theme behavior, and shell compositions

### Accepted limitation from planning

The dry run happened before the app existed, so planning validated the **machine + toolchain path**, not real project scripts. Once the scaffold exists, workers and validators should treat service startup and browser accessibility as something to verify, not assume.

### Browser validation path — resolved

An early foundation worker hit an `agent-browser` startup failure on Windows (`EACCES` while attempting to bind a local port). Investigation determined:

- **Root cause:** The `EACCES` error was an `agent-browser` process-level port-binding issue, not a project or Playwright problem. `agent-browser` binds an internal communication port on startup, and on this Windows machine that specific port request was blocked by OS-level restrictions (possibly Windows Defender, Hyper-V port reservations, or ephemeral port exhaustion).
- **Playwright itself works:** Playwright Chromium (v1.58.2) is installed at `C:\Users\rafae\AppData\Local\ms-playwright\chromium-1208` and runs e2e tests successfully via `pnpm test:e2e`. The Playwright `webServer` config starts both apps automatically.
- **Storybook build works:** `pnpm storybook:build` compiles and produces `storybook-static/` without issues.
- **Deterministic fallback:** For browser-validation flows that need `agent-browser`, workers should use Playwright directly via `pnpm test:e2e -- --project=chromium` as the primary automated path. For interactive Storybook/manual checks, start services using the manifest and open Chromium manually.
- **If agent-browser is needed:** Retry with a `--session` flag as documented. The `EACCES` may be transient (port contention). If it persists, it is an external OS-level issue outside the project's control.

## Validation Concurrency

- **Browser-based validation (docs/workspace/storybook combined): max 6 concurrent validators total**
  - Planning snapshot: ~66.7 GB RAM total, ~23.3 GB free, 16 logical processors
  - 70% of free-memory headroom leaves comfortable room for local Next.js + Storybook + browser automation
  - Keep the limit conservative because real app complexity may rise after scaffold and feature implementation

## MSW Test Harness

The `@emerald/mocks` package provides reusable MSW infrastructure for all test surfaces:

- **Vitest:** Use `createTestServer()` from `@emerald/test-utils/msw-server` with `beforeAll/afterEach/afterAll` lifecycle hooks
- **Playwright:** MSW runs in-browser via the service worker (`mockServiceWorker.js`). Playwright e2e tests exercise the full app with MSW already integrated via the app's browser entry point
- **Storybook:** Use `withMsw(config)` decorator from `@emerald/mocks/storybook` to opt stories into MSW-backed data

### Scenario-driven testing

All handlers support 5 scenarios: `success`, `loading`, `error`, `not-found`, `malformed`. Use `ScenarioConfig` to configure per-domain scenarios:

```ts
const server = createTestServer({ document: "error", search: "malformed" });
```

### Handler URL matching

MSW handlers use `*/api/...` wildcard patterns that match requests from any origin. In Node.js (Vitest), fetch to `http://localhost/api/...` is intercepted. In the browser (Storybook/apps), relative `/api/...` requests are intercepted. The `apiUrl()` utility in `@emerald/mocks/handlers` is available for building absolute URLs if needed.

## Validation Notes

- Default browser validation path: Chromium-based automation plus direct browser sanity checks
- Prefer validating the exact assertions from `validation-contract.md`, not approximate visual guesses
- For cross-surface assertions, compare the same mocked entity across public docs, workspace, and AI-context surfaces in one run when possible
