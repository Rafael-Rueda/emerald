"use client";

import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./query-client";
import { AppErrorBoundary } from "./error-boundary";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Shared provider stack used by Storybook, apps/docs, and apps/workspace.
 *
 * Composes:
 * - AppErrorBoundary — catches unhandled errors in the React tree
 * - QueryClientProvider — TanStack Query for server state management
 *
 * Future additions (by other features):
 * - Theme provider (persisted light/dark)
 * - MSW integration hooks
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
