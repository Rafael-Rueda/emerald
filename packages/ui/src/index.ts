/**
 * @emerald/ui
 *
 * Shared UI primitives, compositions, tokens, and theme support.
 * This package must remain agnostic of app and domain module internals.
 */

export { AppProviders, AppErrorBoundary, createQueryClient } from "./providers";
export { ThemeProvider, useTheme, ThemeToggle, themeInitScript, THEME_COOKIE_NAME } from "./theme";
export type { Theme, ThemeProviderProps, ThemeToggleProps } from "./theme";
export { PublicShell, WorkspaceShell } from "./shells";
export type { PublicShellProps, WorkspaceShellProps } from "./shells";

/* Shared UI Primitives */
export {
  Button,
  buttonVariants,
  TextInput,
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  AlertTitle,
  AlertDescription,
  alertVariants,
} from "./primitives";
export type {
  ButtonProps,
  TextInputProps,
  AlertProps,
  AlertTitleProps,
  AlertDescriptionProps,
} from "./primitives";

/* Utilities */
export { cn } from "./lib/cn";

