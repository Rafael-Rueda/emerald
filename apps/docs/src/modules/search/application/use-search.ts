"use client";

/**
 * useSearch — TanStack Query hook for public docs search.
 */

import { useQuery } from "@tanstack/react-query";
import { mapSearchResults, type SearchResultDisplay } from "../domain/search-result-mapping";
import {
  fetchSearch,
  type SearchFetchResult,
} from "../infrastructure/search-api";

/** Discriminated union of search view-model states. */
export type SearchViewState =
  | { state: "idle" }
  | { state: "loading"; query: string }
  | { state: "success"; query: string; results: SearchResultDisplay[] }
  | { state: "empty"; query: string }
  | { state: "error"; query: string; message: string }
  | { state: "validation-error"; query: string; message: string };

/** Query key factory for search queries. */
export function searchQueryKey(query: string): readonly string[] {
  return ["search", query] as const;
}

/**
 * React hook that searches docs by query and returns a discriminated view state.
 */
export function useSearch(rawQuery: string): SearchViewState {
  const query = rawQuery.trim();
  const enabled = query.length > 0;

  const { data, error, isLoading, isPending } = useQuery<SearchFetchResult>({
    queryKey: searchQueryKey(query),
    queryFn: () => fetchSearch(query),
    enabled,
    retry: false,
    staleTime: 15_000,
  });

  if (!enabled) {
    return { state: "idle" };
  }

  if (isLoading || isPending) {
    return { state: "loading", query };
  }

  if (error) {
    return {
      state: "error",
      query,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  if (!data) {
    return { state: "loading", query };
  }

  switch (data.status) {
    case "success": {
      const results = mapSearchResults(data.data.results);
      if (results.length === 0) {
        return { state: "empty", query: data.data.query };
      }
      return {
        state: "success",
        query: data.data.query,
        results,
      };
    }
    case "error":
      return { state: "error", query, message: data.message };
    case "validation-error":
      return {
        state: "validation-error",
        query,
        message: data.message,
      };
  }
}
