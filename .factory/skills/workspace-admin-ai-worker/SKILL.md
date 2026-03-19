---
name: workspace-admin-ai-worker
description: Implement the mocked workspace/admin surface, including shell routing, list/detail inspectors, representative admin actions, non-success guards, and AI context flows.
---

# Workspace Admin & AI Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use this skill for workspace/admin features in `apps/workspace`, especially:

- admin shell routing and section entry points
- documents, navigation, and versions list/detail inspectors
- representative selected-record actions with success/failure handling
- loading, empty, request-failure, and schema-failure states in admin views
- AI context routing, scoped entity changes, and provenance presentation

## Work Procedure

1. Read the feature, its `fulfills` assertions, mission `AGENTS.md`, `.factory/services.yaml`, and relevant library notes.
2. Write failing tests first where practical:
   - domain/application tests for entity selection, mutations, and provenance mapping
   - RTL/component tests for list/detail views and admin non-success states
   - targeted route or Playwright tests when the feature is about direct loads, shell persistence, or scoped AI flows
3. Keep the workspace shell mounted while section content changes. Do not let a feature solve routing by remounting the whole admin experience.
4. For list/detail features, prove that selecting different records changes the detail content in a meaningful way; do not settle for a static placeholder detail panel.
5. For action features, prove both success and failure paths. If optimistic updates are used, verify rollback or controlled failure state explicitly.
6. For AI context, ensure the selected workspace entity actually drives the request scope and the rendered context/provenance.
7. Run targeted tests, then required broader validators. Manually verify the live workspace app for the relevant success and failure states before handoff.

## Example Handoff

```json
{
  "salientSummary": "Implemented the workspace shell plus document and version inspectors, then added an entity-scoped AI context panel with safe non-success states. Verified direct admin sub-routes, selection-sensitive detail updates, and AI scope changes in the live workspace app.",
  "whatWasImplemented": "Built the `/admin` shell with route-aware navigation and direct section entry. Added selection-sensitive list/detail inspectors for documents and versions, representative selected-record actions with success/failure outcomes, and an AI-context surface that re-queries when the selected entity changes. Also added loading, empty, error, and schema-failure states across the affected workspace views.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "pnpm test -- --project workspace-admin",
        "exitCode": 0,
        "observation": "Workspace shell, inspector, action, and AI-context tests passed."
      },
      {
        "command": "pnpm typecheck",
        "exitCode": 0,
        "observation": "Workspace modules and shared helpers typechecked without errors."
      },
      {
        "command": "pnpm lint",
        "exitCode": 0,
        "observation": "No lint issues remained in workspace routes, view-models, or action handlers."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened `/admin`, `/admin/documents`, `/admin/versions`, and `/admin/ai-context` directly.",
        "observed": "Each route landed in the correct section with the admin shell still mounted and the active-location state matching the section."
      },
      {
        "action": "Selected two different document records and compared the detail panel.",
        "observed": "The detail panel updated to the currently selected record and exposed meaningful identifying fields."
      },
      {
        "action": "Triggered one successful and one failing admin action, then switched the selected entity feeding the AI-context panel.",
        "observed": "Success updated visible state, failure rolled back cleanly, and the AI-context panel re-scoped to the newly selected entity without dropping the workspace shell."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/workspace/src/modules/documents/presentation/components/document-inspector.test.tsx",
        "cases": [
          {
            "name": "updates detail when a different record is selected",
            "verifies": "selection-sensitive list/detail behavior"
          }
        ]
      },
      {
        "file": "apps/workspace/src/modules/ai-context/application/use-cases/resolve-ai-context.test.ts",
        "cases": [
          {
            "name": "rebuilds AI context when canonical entity identity changes",
            "verifies": "AI scope follows the selected workspace entity"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature needs a new canonical label/provenance rule shared with the public app that is not yet defined
- A workspace feature would have to violate the mission's MSW-only boundary or introduce a real backend dependency
- The feature depends on cross-surface integration or public-surface behavior that belongs to a later feature
- Shared shell, provider, or mocking foundations are missing or too incomplete to build the workspace feature cleanly
