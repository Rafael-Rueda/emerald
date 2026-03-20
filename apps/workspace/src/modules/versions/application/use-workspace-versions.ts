"use client";

import { useQuery } from "@tanstack/react-query";
import type { WorkspaceVersion, WorkspaceVersionList } from "@emerald/contracts";
import {
  fetchWorkspaceVersionDetail,
  fetchWorkspaceVersionsList,
  type WorkspaceVersionDetailFetchResult,
  type WorkspaceVersionsListFetchResult,
} from "../infrastructure/workspace-versions-api";

export type WorkspaceVersionsListViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceVersionList }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export type WorkspaceVersionDetailViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceVersion }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export function workspaceVersionsListQueryKey(): readonly string[] {
  return ["workspace", "versions", "list"] as const;
}

export function workspaceVersionDetailQueryKey(
  versionId: string,
): readonly string[] {
  return ["workspace", "versions", "detail", versionId] as const;
}

export function useWorkspaceVersionsList(): WorkspaceVersionsListViewState {
  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceVersionsListFetchResult>({
      queryKey: workspaceVersionsListQueryKey(),
      queryFn: fetchWorkspaceVersionsList,
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

export function useWorkspaceVersionDetail(
  versionId: string | null,
): WorkspaceVersionDetailViewState {
  const enabled = typeof versionId === "string" && versionId.length > 0;

  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceVersionDetailFetchResult>({
      queryKey: workspaceVersionDetailQueryKey(versionId ?? "none"),
      queryFn: () => fetchWorkspaceVersionDetail(versionId ?? ""),
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
