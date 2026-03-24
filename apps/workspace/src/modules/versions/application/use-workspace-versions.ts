"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { WorkspaceReleaseVersion } from "@emerald/data-access";
import { useWorkspaceContext } from "../../shared/application/workspace-context";
import {
  createWorkspaceVersion,
  fetchWorkspaceVersionsList,
  publishWorkspaceVersion,
  setDefaultWorkspaceVersion,
  type WorkspaceVersionMutationResult,
  type WorkspaceVersionsListFetchResult,
} from "../infrastructure/workspace-versions-api";

export type WorkspaceVersionsListViewState =
  | { state: "loading" }
  | { state: "success"; data: WorkspaceReleaseVersion[] }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export function workspaceVersionsListQueryKey(
  spaceId: string,
): readonly string[] {
  return ["workspace", "versions", "list", spaceId] as const;
}

export function useWorkspaceVersionsList(
  spaceId?: string | null,
): WorkspaceVersionsListViewState {
  const { activeSpaceId } = useWorkspaceContext();
  const resolvedSpaceId = spaceId ?? activeSpaceId;

  const { data, error, isLoading, isPending } =
    useQuery<WorkspaceVersionsListFetchResult>({
      queryKey: workspaceVersionsListQueryKey(resolvedSpaceId ?? "none"),
      queryFn: () => fetchWorkspaceVersionsList(resolvedSpaceId!),
      enabled: !!resolvedSpaceId,
      retry: false,
      staleTime: 30_000,
    });

  if (!resolvedSpaceId || isLoading || isPending) {
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

export function useCreateWorkspaceVersionAction() {
  return useMutation<WorkspaceVersionMutationResult, Error, {
    spaceId: string;
    label: string;
    key: string;
  }>({
    mutationFn: createWorkspaceVersion,
  });
}

export function usePublishWorkspaceVersionAction() {
  return useMutation<WorkspaceVersionMutationResult, Error, string>({
    mutationFn: publishWorkspaceVersion,
  });
}

export function useSetDefaultWorkspaceVersionAction() {
  return useMutation<WorkspaceVersionMutationResult, Error, string>({
    mutationFn: setDefaultWorkspaceVersion,
  });
}
