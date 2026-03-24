"use client";

import { useMutation } from "@tanstack/react-query";
import type { Space } from "@emerald/contracts";
import {
  createWorkspaceSpace,
  updateWorkspaceSpace,
  deleteWorkspaceSpace,
  type SpaceFetchResult,
} from "../infrastructure/workspace-spaces-api";

export function useCreateWorkspaceSpaceAction() {
  return useMutation<SpaceFetchResult, Error, { key: string; name: string; description: string }>({
    mutationFn: createWorkspaceSpace,
  });
}

export function useUpdateWorkspaceSpaceAction() {
  return useMutation<
    SpaceFetchResult,
    Error,
    { spaceId: string; payload: { name?: string; description?: string; key?: string } }
  >({
    mutationFn: ({ spaceId, payload }) => updateWorkspaceSpace(spaceId, payload),
  });
}

export function useDeleteWorkspaceSpaceAction() {
  return useMutation<SpaceFetchResult, Error, string>({
    mutationFn: deleteWorkspaceSpace,
  });
}
