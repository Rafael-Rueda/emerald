# Testing

Testing strategy and conventions for this mission.

**What belongs here:** test-layer ownership, mocking strategy, validator expectations, scope rules.
**What does NOT belong here:** service lifecycle commands (use `.factory/services.yaml`).

---

## Test Layers

- **Domain / application:** Vitest unit tests for rules, use cases, mapping, canonical identity logic, and ports
- **Presentation:** RTL tests for components, shells, non-success states, and interaction behavior
- **Story-level UI:** Storybook docs/canvas coverage for shared UI categories and shell compositions
- **End-to-end:** Playwright for critical public/workspace flows and cross-surface parity

## Mocking Strategy

- Reuse `MSW` handlers across apps, Storybook, Vitest, and Playwright
- Keep fixtures scenario-driven: success, loading, empty, request failure, malformed payload
- Treat malformed payload coverage as a first-class validation target, not an optional extra

## Validation Rules

- Run targeted tests first while iterating, then broader checks before feature handoff
- If a feature changes shared packages, run `lint` and `typecheck` for the workspace, not only the local package
- Browser-visible assertions must be checked in the real app surface, not only in unit tests
- Cross-surface features must validate every affected surface before handoff
