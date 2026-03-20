"use client";

import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a new QueryClient instance with shared default options.
 *
 * Each consumer (app root, Storybook, tests) should call this to get a fresh
 * client. This avoids sharing cached state between unrelated contexts.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
