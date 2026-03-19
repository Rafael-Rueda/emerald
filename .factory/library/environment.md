# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** required env vars, external service assumptions, local environment constraints, dependency quirks.
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

- Platform detected during planning: Windows 10, Node `22.21.1`, pnpm `10.12.4`, npm `10.9.4`
- This mission is **frontend-only**
- Do not introduce a real backend, database, queue, or third-party runtime dependency for core flows
- Use `MSW` as the authoritative mock transport for public docs, workspace/admin, Storybook, and tests
- Current repo warning discovered during worker execution: pnpm `10.12.4` may report ignored build scripts for `esbuild`, `msw`, and `sharp`; if this affects build/runtime behavior, resolve it in a deterministic repo-local way or return to orchestrator with the exact blocker
- Existing local listeners on `5432`, `5672`, and `27017` are off-limits and unrelated to this mission
- Storybook and both app surfaces must work without requiring credentials or external accounts
