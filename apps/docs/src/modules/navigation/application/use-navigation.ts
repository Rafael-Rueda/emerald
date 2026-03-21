"use client";

/**
 * useNavigation — TanStack Query hook for navigation tree resolution.
 *
 * Fetches and validates navigation data based on space and version.
 * Exposes a view model with explicit loading, error, not-found,
 * validation-error, and success states.
 */

import { useQuery } from "@tanstack/react-query";
import type { NavigationResponse } from "@emerald/contracts";
import {
  fetchNavigation,
  type NavigationFetchResult,
} from "../infrastructure/navigation-api";

/** Discriminated union of navigation view-model states. */
export type NavigationViewState =
  | { state: "loading" }
  | { state: "success"; data: NavigationResponse }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

/**
 * Query key factory for navigation queries.
 */
export function navigationQueryKey(
  space: string,
  version: string,
): readonly string[] {
  return ["navigation", space, version] as const;
}

/**
 * React hook that fetches navigation by space and version.
 *
 * Returns a discriminated view-state that the presentation layer
 * can consume without inspecting raw query internals.
 */
export function useNavigation(
  space: string,
  version: string,
): NavigationViewState {
  const enabled = space.length > 0 && version.length > 0;

  const { data, error, isLoading, isPending } =
    useQuery<NavigationFetchResult>({
      queryKey: navigationQueryKey(space, version),
      queryFn: () => fetchNavigation(space, version),
      enabled,
      retry: false,
      staleTime: 0,
      refetchOnMount: "always",
    });

  if (isLoading || isPending) {
    return { state: "loading" };
  }

  if (error) {
    return {
      state: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  if (!data) {
    return { state: "loading" };
  }

  switch (data.status) {
    case "success":
      return { state: "success", data: data.data };
    case "not-found":
      return { state: "not-found" };
    case "error":
      return { state: "error", message: data.message };
    case "validation-error":
      return { state: "validation-error", message: data.message };
  }
}
