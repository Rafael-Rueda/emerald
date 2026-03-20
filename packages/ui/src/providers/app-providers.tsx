"use client";

import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./query-client";
import { AppErrorBoundary } from "./error-boundary";
import { ThemeProvider } from "../theme/theme-provider";
import type { Theme } from "../theme/theme-provider";

interface AppProvidersProps {
  children: React.ReactNode;
  /** Override default theme for testing or Storybook. */
  defaultTheme?: Theme;
}

/**
 * Shared provider stack used by Storybook, apps/docs, and apps/workspace.
 *
 * Composes:
 * - AppErrorBoundary — catches unhandled errors in the React tree
 * - ThemeProvider — persisted light/dark theming via localStorage
 * - QueryClientProvider — TanStack Query for server state management
 */
export function AppProviders({ children, defaultTheme }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <AppErrorBoundary>
      <ThemeProvider defaultTheme={defaultTheme}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
