/**
 * @emerald/ui
 *
 * Shared UI primitives, compositions, tokens, and theme support.
 * This package must remain agnostic of app and domain module internals.
 */

export { AppProviders, AppErrorBoundary, createQueryClient } from "./providers";
export { ThemeProvider, useTheme, ThemeToggle } from "./theme";
export type { Theme, ThemeProviderProps, ThemeToggleProps } from "./theme";
export { PublicShell, WorkspaceShell } from "./shells";
export type { PublicShellProps, WorkspaceShellProps } from "./shells";

