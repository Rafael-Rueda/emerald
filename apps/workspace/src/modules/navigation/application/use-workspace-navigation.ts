"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  WorkspaceDocument,
  WorkspaceNavigationList,
} from "@emerald/contracts";
import {
  createWorkspaceNavigationNode,
  fetchWorkspaceNavigationDocuments,
  fetchWorkspaceNavigationList,
  moveWorkspaceNavigationNode,
  updateWorkspaceNavigationNode,
  type WorkspaceNavigationDocumentsFetchResult,
  type WorkspaceNavigationListFetchResult,
  type WorkspaceNavigationMutationResult,
} from "../infrastructure/workspace-navigation-api";

// The hooks don't import context themselves - the presentation layer passes spaceId

export type WorkspaceNavigationListViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceNavigationList }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export type WorkspaceNavigationDocumentsViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceDocument[] }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export function workspaceNavigationListQueryKey(
  spaceId: string,
  releaseVersionId?: string | null,
): readonly string[] {
  return ["workspace", "navigation", "list", spaceId, releaseVersionId ?? "all"] as const;
}

export function workspaceNavigationDetailQueryKey(
  spaceId: string,
  scope: string,
): readonly string[] {
  return ["workspace", "navigation", "detail", spaceId, scope] as const;
}

export function useWorkspaceNavigationList(
  spaceId: string | null,
  releaseVersionId?: string | null,
): WorkspaceNavigationListViewState {
  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceNavigationListFetchResult>({
      queryKey: workspaceNavigationListQueryKey(spaceId ?? "", releaseVersionId),
      queryFn: () => fetchWorkspaceNavigationList(spaceId!, releaseVersionId),
      enabled: !!spaceId,
      retry: false,
      staleTime: 30_000,
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

export function useWorkspaceNavigationDocuments(
  spaceId: string | null,
): WorkspaceNavigationDocumentsViewState {
  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceNavigationDocumentsFetchResult>({
      queryKey: workspaceNavigationDetailQueryKey(spaceId ?? "", "documents"),
      queryFn: () => fetchWorkspaceNavigationDocuments(spaceId!),
      enabled: !!spaceId,
      retry: false,
      staleTime: 30_000,
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

export function useCreateWorkspaceNavigationAction() {
  return useMutation<
    WorkspaceNavigationMutationResult,
    Error,
    {
      spaceId: string;
      releaseVersionId?: string | null;
      parentId?: string | null;
      documentId?: string | null;
      label: string;
      slug: string;
      order: number;
      nodeType: "document" | "group" | "external_link";
      externalUrl?: string | null;
    }
  >({
    mutationFn: createWorkspaceNavigationNode,
  });
}

export function useUpdateWorkspaceNavigationAction() {
  return useMutation<
    WorkspaceNavigationMutationResult,
    Error,
    {
      navigationId: string;
      payload: {
        documentId?: string | null;
        label?: string;
        slug?: string;
        order?: number;
        nodeType?: "document" | "group" | "external_link";
        externalUrl?: string | null;
      };
    }
  >({
    mutationFn: ({ navigationId, payload }) =>
      updateWorkspaceNavigationNode(navigationId, payload),
  });
}

export function useMoveWorkspaceNavigationAction() {
  return useMutation<
    WorkspaceNavigationMutationResult,
    Error,
    {
      navigationId: string;
      payload: { parentId?: string | null; order: number };
    }
  >({
    mutationFn: ({ navigationId, payload }) =>
      moveWorkspaceNavigationNode(navigationId, payload),
  });
}
