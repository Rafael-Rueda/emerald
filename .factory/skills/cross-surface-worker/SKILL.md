---
name: cross-surface-worker
description: Implement integration features that span public docs, workspace, Storybook, and shared contracts, including parity, hardening, provenance, and cross-app consistency.
---

# Cross-Surface Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use this skill when a feature spans multiple surfaces or modules and cannot be owned cleanly by a single product area, including:

- canonical label and provenance alignment across public docs, workspace, and AI context
- public-shell hardening for malformed doc/nav/version payloads
- default-state parity and deep-link parity checks
- cross-app consistency for search/version handoffs or theme persistence when a feature explicitly owns the integration

## Work Procedure

1. Read the feature, its `fulfills` assertions, mission `AGENTS.md`, `.factory/services.yaml`, and the library files that describe architecture and user-testing.
2. Identify which already-built surfaces the feature depends on. Confirm that the prerequisite features exist before editing.
3. Write failing integration tests first where practical:
   - shared formatter/provenance mapping tests
   - route/context parity tests
   - malformed-payload rejection tests that span multiple public data boundaries
   - Playwright checks when the assertion is about visible parity across routes or apps
4. Prefer shared mapping/view-model layers over patching duplicated UI text in multiple surfaces.
5. When the feature touches more than one app, manually verify all affected surfaces in the same session and compare the exact visible labels/state that the assertion cares about.
6. Run the relevant targeted tests for every affected surface, then broader validators. If a feature changed both public and workspace surfaces, validate both before handoff.

## Example Handoff

```json
{
  "salientSummary": "Completed the cross-surface label/provenance alignment work. Public docs, workspace detail views, and AI references now use the same canonical document/version/navigation labels, and malformed public shell-data now fails through the shared non-success path.",
  "whatWasImplemented": "Added shared canonical label and provenance mappers consumed by the public docs app, workspace inspectors, and AI-context surface. Hardened public document/navigation/version shell-data boundaries so malformed payloads render stable non-success states. Verified default-state parity, deep-link parity, and public/workspace/AI label consistency against the same mocked records.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "pnpm test -- --project public-docs",
        "exitCode": 0,
        "observation": "Public hardening and route-context parity tests passed."
      },
      {
        "command": "pnpm test -- --project workspace-admin",
        "exitCode": 0,
        "observation": "Workspace label/provenance alignment tests passed."
      },
      {
        "command": "pnpm typecheck",
        "exitCode": 0,
        "observation": "Shared mappers and all affected apps typechecked cleanly."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened the canonical default docs state and then opened the same document through a direct deep link.",
        "observed": "Visible title, breadcrumbs, sidebar active state, version label, and TOC behavior matched in both entry paths."
      },
      {
        "action": "Compared one mocked record across public docs, workspace detail, and AI-context provenance labels.",
        "observed": "Document title, version label, slug/path label, navigation label, and section/chunk identity matched across all three surfaces."
      },
      {
        "action": "Injected malformed public document, navigation, and version shell-data payloads.",
        "observed": "The public app rendered stable non-success states and did not show malformed payloads as trusted content."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/contracts/src/provenance/canonical-labels.test.ts",
        "cases": [
          {
            "name": "maps shared canonical labels consistently across public and workspace",
            "verifies": "the same mocked entity produces the same visible labels in all surfaces"
          }
        ]
      },
      {
        "file": "apps/docs/tests/public-context-parity.spec.ts",
        "cases": [
          {
            "name": "direct deep link matches in-app navigation state",
            "verifies": "default-state and deep-link parity for the same canonical document"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature requires redefining canonical entity identity, label semantics, or another mission-wide rule
- A requested parity rule conflicts with the validation contract or with already-sealed milestone behavior
- The feature spans surfaces that are not yet implemented enough to compare meaningfully
- The feature would require a new worker type or a major mission restructuring to implement safely
