"use client";

/**
 * useVersions — TanStack Query hook for docs version metadata.
 */

import { useQuery } from "@tanstack/react-query";
import type { VersionListResponse } from "@emerald/contracts";
import {
  fetchVersions,
  type VersionsFetchResult,
} from "../infrastructure/version-api";

/** Discriminated union of version-metadata view-model states. */
export type VersionsViewState =
  | { state: "loading" }
  | { state: "success"; data: VersionListResponse }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

/** Query key factory for version metadata queries. */
export function versionsQueryKey(space: string): readonly string[] {
  return ["versions", space] as const;
}

/**
 * React hook that fetches version metadata for a docs space.
 */
export function useVersions(space: string): VersionsViewState {
  const enabled = space.length > 0;

  const { data, error, isLoading, isPending } = useQuery<VersionsFetchResult>({
    queryKey: versionsQueryKey(space),
    queryFn: () => fetchVersions(space),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (!enabled || isLoading || isPending) {
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
