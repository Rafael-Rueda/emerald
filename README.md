# Emerald

A pnpm monorepo boilerplate for a React/Next.js documentation and workspace admin system. All data is served through MSW (Mock Service Worker) — there is no real backend.

## Monorepo Structure

```
apps/
  docs/         Public documentation portal (port 3100)
  workspace/    Workspace admin portal (port 3101)

packages/
  ui/           Shared design system (ThemeProvider, shells, Button, TextInput, Dialog, Tabs, Alert)
  contracts/    Zod schemas for all domains (document, navigation, search, version, workspace, ai-context, canonical-labels)
  mocks/        MSW browser/node/storybook handlers, fixtures, and scenarios
  test-utils/   RTL and MSW test helpers
  data-access/  Data access stub
  configs/      Shared TypeScript config, Tailwind preset, Vitest base config
```

## Prerequisites

- Node.js 18+
- pnpm 9+

## Setup

```bash
pnpm install
```

## Running

```bash
# Start the public docs portal (http://localhost:3100)
pnpm dev:docs

# Start the workspace admin portal (http://localhost:3101)
pnpm dev:workspace

# Start Storybook (http://localhost:6100)
pnpm storybook
```

## Building

```bash
pnpm build
```

## Testing

```bash
# Run Vitest unit/integration suite (255+ tests)
pnpm test

# Run Playwright end-to-end tests
pnpm test:e2e
```

## Linting and Type Checking

```bash
pnpm lint
pnpm typecheck
```

## Architecture Notes

**Data layer:** All API responses are provided by MSW handlers in `packages/mocks`. There is no real backend. Handlers are wired for browser, Node (Vitest), and Storybook environments.

**Contracts:** All domain schemas are defined with Zod in `packages/contracts` and shared across apps, mocks, and tests to enforce a single source of truth.

**Theming:** Light/dark theme is persisted via a host-scoped cookie and shared across both apps through `packages/ui`'s `ThemeProvider`.

**Component library:** `packages/ui` exports a Radix UI-based design system with a shared Tailwind preset from `packages/configs`.

**Data fetching:** TanStack Query is used in both apps for server-state management against the MSW boundary.
