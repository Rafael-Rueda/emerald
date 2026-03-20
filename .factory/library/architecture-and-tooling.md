# Package Management & Dependencies

## pnpm v10
In pnpm v10, settings like `onlyBuiltDependencies` are configured in `pnpm-workspace.yaml`, rather than the root `package.json`.

## UI Architecture
The baseline UI components rely on the following foundational dependencies:
- **Radix UI** for accessible unstyled primitives.
- **class-variance-authority (CVA)** for component variant mapping.
- **clsx** and **tailwind-merge** for dynamic class name composition.

## Storybook 9
When defining types for Storybook 9, public types like `Meta`, `StoryObj`, and `Preview` should be imported from `@storybook/react-vite`, rather than internal paths like `storybook/internal/types`.
