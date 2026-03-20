"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  WorkspaceNavigation,
  WorkspaceNavigationList,
} from "@emerald/contracts";
import {
  fetchWorkspaceNavigationDetail,
  fetchWorkspaceNavigationList,
  type WorkspaceNavigationDetailFetchResult,
  type WorkspaceNavigationListFetchResult,
} from "../infrastructure/workspace-navigation-api";

export type WorkspaceNavigationListViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceNavigationList }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export type WorkspaceNavigationDetailViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceNavigation }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export function workspaceNavigationListQueryKey(): readonly string[] {
  return ["workspace", "navigation", "list"] as const;
}

export function workspaceNavigationDetailQueryKey(
  navigationId: string,
): readonly string[] {
  return ["workspace", "navigation", "detail", navigationId] as const;
}

export function useWorkspaceNavigationList(): WorkspaceNavigationListViewState {
  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceNavigationListFetchResult>({
      queryKey: workspaceNavigationListQueryKey(),
      queryFn: fetchWorkspaceNavigationList,
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

export function useWorkspaceNavigationDetail(
  navigationId: string | null,
): WorkspaceNavigationDetailViewState {
  const enabled = typeof navigationId === "string" && navigationId.length > 0;

  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceNavigationDetailFetchResult>({
      queryKey: workspaceNavigationDetailQueryKey(navigationId ?? "none"),
      queryFn: () => fetchWorkspaceNavigationDetail(navigationId ?? ""),
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
