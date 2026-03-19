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

## Validation Concurrency

- **Browser-based validation (docs/workspace/storybook combined): max 6 concurrent validators total**
  - Planning snapshot: ~66.7 GB RAM total, ~23.3 GB free, 16 logical processors
  - 70% of free-memory headroom leaves comfortable room for local Next.js + Storybook + browser automation
  - Keep the limit conservative because real app complexity may rise after scaffold and feature implementation

## Validation Notes

- Default browser validation path: Chromium-based automation plus direct browser sanity checks
- Prefer validating the exact assertions from `validation-contract.md`, not approximate visual guesses
- For cross-surface assertions, compare the same mocked entity across public docs, workspace, and AI-context surfaces in one run when possible
