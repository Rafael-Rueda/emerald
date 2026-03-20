"use client";

/**
 * useDocument — TanStack Query hook for document resolution.
 *
 * Fetches and validates a document based on route identity.
 * Exposes a view model with explicit loading, error, not-found,
 * validation-error, and success states.
 */

import { useQuery } from "@tanstack/react-query";
import type { DocumentResponse } from "@emerald/contracts";
import type { DocumentIdentity } from "../domain/document-identity";
import { isValidDocumentIdentity } from "../domain/document-identity";
import { fetchDocument, type DocumentFetchResult } from "../infrastructure/document-api";

/** Discriminated union of document view-model states. */
export type DocumentViewState =
  | { state: "loading" }
  | { state: "success"; data: DocumentResponse }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

/**
 * Query key factory for document queries.
 */
export function documentQueryKey(identity: DocumentIdentity): readonly string[] {
  return ["document", identity.space, identity.version, identity.slug] as const;
}

/**
 * React hook that fetches a document by route identity.
 *
 * Returns a discriminated view-state that the presentation layer
 * can consume without inspecting raw query internals.
 */
export function useDocument(identity: DocumentIdentity): DocumentViewState {
  const enabled = isValidDocumentIdentity(identity);

  const { data, error, isLoading, isPending } = useQuery<DocumentFetchResult>({
    queryKey: documentQueryKey(identity),
    queryFn: () => fetchDocument(identity),
    enabled,
    retry: false,
    staleTime: 30_000,
  });

  // Show loading if we're still fetching
  if (isLoading || isPending) {
    return { state: "loading" };
  }

  // If the query itself errored (network failure before our handler)
  if (error) {
    return {
      state: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // If we have no data yet (shouldn't happen after loading, but safety)
  if (!data) {
    return { state: "loading" };
  }

  // Map our fetch result to view state
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
