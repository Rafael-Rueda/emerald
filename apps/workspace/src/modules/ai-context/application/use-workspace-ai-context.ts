"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchWorkspaceAiContext,
  fetchWorkspaceAiContextStats,
  regenerateWorkspaceAiContextEmbeddings,
  type AiContextScope,
  type DocumentChunkStats,
  type WorkspaceAiContextFetchResult,
  type WorkspaceAiContextRegenerateResult,
  type WorkspaceAiContextStatsFetchResult,
} from "../infrastructure/workspace-ai-context-api";
import type { AiContextResponse } from "@emerald/contracts";

export type WorkspaceAiContextViewState =
  | { state: "loading" }
  | { state: "success"; data: AiContextResponse }
  | { state: "empty" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export type WorkspaceAiContextStatsViewState =
  | { state: "loading" }
  | { state: "success"; data: DocumentChunkStats[] }
  | { state: "error"; message: string };

export function workspaceAiContextQueryKey(scope: AiContextScope | null) {
  return [
    "workspace",
    "ai-context",
    scope?.entityType ?? "none",
    scope?.entityId ?? "none",
  ] as const;
}

export function workspaceAiContextStatsQueryKey(spaceId: string | null) {
  return ["workspace", "ai-context", "stats", spaceId ?? "none"] as const;
}

export function useWorkspaceAiContext(
  scope: AiContextScope | null,
): WorkspaceAiContextViewState {
  const enabled =
    typeof scope?.entityType === "string" &&
    scope.entityType.length > 0 &&
    typeof scope.entityId === "string" &&
    scope.entityId.length > 0;

  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceAiContextFetchResult>({
      queryKey: workspaceAiContextQueryKey(scope),
      queryFn: () =>
        fetchWorkspaceAiContext(
          scope ?? {
            entityType: "",
            entityId: "",
          },
        ),
      enabled,
      retry: false,
      staleTime: 30_000,
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
      if (data.data.chunks.length === 0) {
        return { state: "empty" };
      }

      return {
        state: "success",
        data: data.data,
      };
    case "error":
      return {
        state: "error",
        message: data.message,
      };
    case "validation-error":
      return {
        state: "validation-error",
        message: data.message,
      };
  }
}

export function useWorkspaceAiContextStats(
  spaceId: string | null,
): WorkspaceAiContextStatsViewState {
  const enabled = !!spaceId;

  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceAiContextStatsFetchResult>({
      queryKey: workspaceAiContextStatsQueryKey(spaceId),
      queryFn: () => fetchWorkspaceAiContextStats(spaceId!),
      enabled,
      retry: false,
      staleTime: 30_000,
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
    case "error":
      return { state: "error", message: data.message };
  }
}

export function useRegenerateEmbeddingsAction() {
  return useMutation<WorkspaceAiContextRegenerateResult, Error, string>({
    mutationFn: regenerateWorkspaceAiContextEmbeddings,
  });
}
