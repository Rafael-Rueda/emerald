"use client";

/**
 * useSpaces — TanStack Query hook for public space list.
 */

import { useQuery } from "@tanstack/react-query";
import type { SpaceListResponse } from "@emerald/contracts";
import {
  fetchSpaces,
  type SpacesFetchResult,
} from "../infrastructure/space-api";

export type SpacesViewState =
  | { state: "loading" }
  | { state: "success"; data: SpaceListResponse }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export function spacesQueryKey(): readonly string[] {
  return ["spaces"] as const;
}

export function useSpaces(): SpacesViewState {
  const { data, error, isLoading, isPending } = useQuery<SpacesFetchResult>({
    queryKey: spacesQueryKey(),
    queryFn: () => fetchSpaces(),
    retry: false,
    staleTime: 60_000,
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
    case "error":
      return { state: "error", message: data.message };
    case "validation-error":
      return { state: "validation-error", message: data.message };
  }
}
