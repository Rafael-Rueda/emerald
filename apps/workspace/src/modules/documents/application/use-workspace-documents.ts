"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { WorkspaceDocument, WorkspaceDocumentList } from "@emerald/contracts";
import {
  fetchWorkspaceDocumentDetail,
  fetchWorkspaceDocumentsList,
  publishWorkspaceDocument,
  type WorkspaceDocumentDetailFetchResult,
  type WorkspaceDocumentPublishResult,
  type WorkspaceDocumentsListFetchResult,
} from "../infrastructure/workspace-documents-api";

export type WorkspaceDocumentsListViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceDocumentList }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export type WorkspaceDocumentDetailViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceDocument }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export function workspaceDocumentsListQueryKey(): readonly string[] {
  return ["workspace", "documents", "list"] as const;
}

export function workspaceDocumentDetailQueryKey(
  documentId: string,
): readonly string[] {
  return ["workspace", "documents", "detail", documentId] as const;
}

export function useWorkspaceDocumentsList(): WorkspaceDocumentsListViewState {
  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceDocumentsListFetchResult>({
      queryKey: workspaceDocumentsListQueryKey(),
      queryFn: fetchWorkspaceDocumentsList,
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

export function useWorkspaceDocumentDetail(
  documentId: string | null,
): WorkspaceDocumentDetailViewState {
  const enabled = typeof documentId === "string" && documentId.length > 0;

  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceDocumentDetailFetchResult>({
      queryKey: workspaceDocumentDetailQueryKey(documentId ?? "none"),
      queryFn: () => fetchWorkspaceDocumentDetail(documentId ?? ""),
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
    case "not-found":
      return { state: "not-found" };
    case "error":
      return { state: "error", message: data.message };
    case "validation-error":
      return { state: "validation-error", message: data.message };
  }
}

export function usePublishWorkspaceDocumentAction() {
  return useMutation<WorkspaceDocumentPublishResult, Error, string>({
    mutationFn: publishWorkspaceDocument,
  });
}
