# Architecture

Architectural decisions and code-organization rules for this mission.

**What belongs here:** repo layout, package responsibilities, module boundaries, canonical patterns.
**What does NOT belong here:** runtime commands/ports (use `.factory/services.yaml`).

---

## Repo Shape

- `apps/docs` — public documentation surface
- `apps/workspace` — mocked admin/workspace surface
- `packages/ui` — shared UI primitives, compositions, tokens, theme support
- `packages/configs` — shared TypeScript, lint, test, and tooling config
- `packages/contracts` — Zod contracts, DTOs, canonical identity/provenance types
- `packages/data-access` — query helpers, ports, adapters, shared data wiring
- `packages/mocks` — MSW handlers, fixtures, scenario builders
- `packages/test-utils` — RTL helpers, test providers, shared MSW test setup

## App-Level Structure

Inside app source, organize by domain and not by global technical dumping grounds.

- `app/` — route composition, providers, layouts, boundaries
- `shared/` — only truly domain-agnostic helpers/UI/hooks
- `modules/` — bounded business contexts with `domain`, `application`, `infrastructure`, `presentation`
- `widgets/` — larger UI compositions spanning modules
- `features/` — smaller transversal behaviors that do not justify a full domain module

## Core Rules

- `shared` and shared packages must not import app/module internals
- Cross-module usage should go through public interfaces only
- React components stay near the presentation edge
- Domain rules, mapping, and contracts do not live inside arbitrary components or `useEffect`
- Use `TanStack Query` for remote state, URL for navigable state, and Zod at every external boundary
