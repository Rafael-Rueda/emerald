---
name: foundation-platform-worker
description: Build the monorepo foundation, shared configs, Storybook, shells, theming, shared UI baseline, and reusable test/mocking infrastructure.
---

# Foundation Platform Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use this skill for foundational features that shape the repo and shared frontend platform, including:

- monorepo/bootstrap and workspace configuration
- shared TypeScript, lint, test, Tailwind, and Playwright config
- Storybook setup and shared preview/provider composition
- shared shells, tokens, theming, responsive shell behavior, and baseline UI primitives
- shared contracts, mocks, test utilities, and MSW/testing platform work

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, and the relevant `.factory/library/*.md` files before changing anything.
2. Identify the feature's `fulfills` assertions. For every user-visible assertion, decide which automated tests and which browser/Storybook checks will prove it.
3. Write tests first where practical:
   - config/platform smoke tests for workspace/package resolution
   - component tests for shared primitives
   - story-level checks for documented states
   - shell/theming tests for providers and persisted theme behavior
4. Implement changes in shared packages first, then wire them into apps/Storybook. Keep shared packages free of app/domain internals.
5. When the feature touches Storybook or shells, manually verify:
   - Storybook is reachable
   - the intended stories load
   - theme behavior is correct
   - responsive shell controls operate at the narrow viewport
6. Run the narrowest meaningful validators first, then broader ones before handoff. At minimum run relevant tests plus `typecheck` and `lint` if shared code changed.
7. Leave the repo in a reusable state: no watch processes, no orphan ports, no half-wired config.

## Example Handoff

```json
{
  "salientSummary": "Bootstrapped the pnpm monorepo foundation and wired Storybook + shared AppProviders. Added token previews, persisted theme handling across docs/workspace shells, and documented baseline shared UI categories.",
  "whatWasImplemented": "Created apps/docs and apps/workspace plus shared packages for ui, configs, contracts, mocks, and test-utils. Wired shared TypeScript/Vitest/Playwright config, Next-compatible Storybook on port 6100, provider composition, theme persistence, responsive shell scaffolds, and baseline stories for action/input/overlay/navigation/feedback/theme-toggle categories.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "pnpm lint",
        "exitCode": 0,
        "observation": "All workspace packages passed lint with shared config inheritance."
      },
      {
        "command": "pnpm typecheck",
        "exitCode": 0,
        "observation": "Docs, workspace, and shared packages typechecked cleanly."
      },
      {
        "command": "pnpm test -- --project foundation",
        "exitCode": 0,
        "observation": "Provider, theming, and shared UI smoke tests passed."
      },
      {
        "command": "pnpm storybook:build",
        "exitCode": 0,
        "observation": "Storybook built successfully with shared preview decorators and docs pages."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened Storybook at http://localhost:6100 and visited the tokens page plus baseline shared component stories.",
        "observed": "Storybook loaded without console errors; tokens and docs/canvas pages rendered as expected."
      },
      {
        "action": "Toggled theme in Storybook, docs shell, and workspace shell, then reloaded both apps.",
        "observed": "Theme persisted across both apps and Storybook visuals updated without unreadable text or broken surfaces."
      },
      {
        "action": "Checked docs and workspace shells at desktop width and ~390px width, including opening the narrow navigation control.",
        "observed": "Both shells stayed operable and the narrow navigation control opened/closed correctly."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/ui/src/theme/theme-provider.test.tsx",
        "cases": [
          {
            "name": "persists theme choice across reloads",
            "verifies": "theme state survives reload and initializes from stored preference"
          }
        ]
      },
      {
        "file": "packages/ui/src/button/button.test.tsx",
        "cases": [
          {
            "name": "renders baseline action variant",
            "verifies": "baseline shared action primitive renders with shared tokens"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature requires changing mission boundaries, ports, or external services
- Storybook/Next/tooling integration requires a new architectural decision not already in mission artifacts
- The monorepo/bootstrap plan in the repo conflicts with the approved mission structure
- A foundational dependency choice would invalidate multiple downstream features if guessed incorrectly
