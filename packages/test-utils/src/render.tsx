import React from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Creates a fresh QueryClient configured for testing.
 * All retries are disabled and stale time is 0 for deterministic tests.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface TestProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

/**
 * Minimal test provider wrapper with a fresh QueryClient per test.
 * Does not include ThemeProvider or shell wrappers to keep tests focused.
 */
function TestProviders({ children, queryClient }: TestProviderProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components in test providers.
 *
 * Usage:
 * ```tsx
 * import { renderWithProviders } from "@emerald/test-utils";
 *
 * const { getByText } = renderWithProviders(<MyComponent />);
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
): RenderResult {
  const { queryClient, ...renderOptions } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestProviders queryClient={queryClient}>{children}</TestProviders>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { createTestQueryClient };
