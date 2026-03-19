---
name: public-docs-worker
description: Implement the public documentation experience, including route-driven reading flows, navigation, TOC, search, versioning, and public-side boundary hardening.
---

# Public Docs Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use this skill for public-surface features in `apps/docs`, especially:

- default route and deep-link handling
- documentation, navigation, search, and versioning modules
- route-param resolution and public shell composition
- loading, empty, error, and malformed-payload behavior for public read flows
- TOC, breadcrumbs, sidebar synchronization, and search/version handoffs

## Work Procedure

1. Read the feature, its `fulfills` assertions, mission `AGENTS.md`, `.factory/services.yaml`, and the library notes before coding.
2. Write failing tests first where practical:
   - pure/domain/application tests for mapping, contracts, and routing helpers
   - RTL/component tests for public presentation states
   - Playwright or route-flow tests when the assertion is about actual public navigation behavior
3. Implement data access through contracts, ports, and query/view-model helpers. Do not fetch directly inside arbitrary UI components.
4. Validate every external/mock payload with Zod at the boundary before rendering trusted content.
5. Manually verify in the real docs app for both happy and non-happy paths:
   - valid route
   - loading
   - unavailable/not-found
   - request failure or malformed payload
   - any cross-module sync required by the feature
6. When search, versioning, or navigation is touched, verify the downstream context as well: URL, breadcrumbs, active sidebar state, version label, TOC behavior.
7. Run scoped tests first, then the necessary broader validators before handoff. Do not leave dev servers or browser runners alive.

## Example Handoff

```json
{
  "salientSummary": "Implemented route-driven public docs resolution plus sidebar/TOC synchronization. Added non-success states for missing docs and request failures, then verified deep links and sidebar navigation in the live docs app.",
  "whatWasImplemented": "Built the public docs route resolver for `space/version/slug`, connected mocked document and navigation queries through Zod-validated boundaries, rendered the reading shell with breadcrumbs/sidebar/article/TOC regions, and added loading, unavailable, and error handling for public document requests. Sidebar navigation now updates URL, content, breadcrumbs, and active state together; TOC click and active-section behavior work for headed documents while heading-less documents show the intentional no-sections path.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "pnpm test -- --project public-docs",
        "exitCode": 0,
        "observation": "Public route, TOC, and boundary-state tests passed."
      },
      {
        "command": "pnpm typecheck",
        "exitCode": 0,
        "observation": "Public docs app and shared packages typechecked cleanly after the route and query changes."
      },
      {
        "command": "pnpm lint",
        "exitCode": 0,
        "observation": "No lint issues remained in docs route modules or shared helpers."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened a valid docs route, then navigated to another page through the sidebar.",
        "observed": "URL, content, breadcrumbs, and active sidebar state updated together without console errors."
      },
      {
        "action": "Opened a headed document and clicked TOC entries, then scrolled through sections.",
        "observed": "TOC anchors navigated to the correct sections and the active TOC item tracked the current section."
      },
      {
        "action": "Exercised delayed load, missing-route, and failed-request scenarios in the live docs app.",
        "observed": "Loading, unavailable, and error states rendered intentionally and stale content was not shown as current."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/docs/src/modules/documentation/application/use-cases/resolve-document.test.ts",
        "cases": [
          {
            "name": "maps space/version/slug to the expected fixture",
            "verifies": "route params resolve the intended document identity"
          }
        ]
      },
      {
        "file": "apps/docs/src/modules/navigation/presentation/components/toc.test.tsx",
        "cases": [
          {
            "name": "omits broken TOC links for heading-less documents",
            "verifies": "heading-less documents use the no-sections path"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A feature depends on canonical labels, shell behavior, or shared contracts that belong to another pending feature
- The public feature needs a new cross-surface rule that is not in mission artifacts
- The intended route behavior conflicts with the approved validation contract or milestone boundaries
- A missing foundation feature prevents clean public implementation (for example, no shared shell primitive or missing MSW/test harness support)
