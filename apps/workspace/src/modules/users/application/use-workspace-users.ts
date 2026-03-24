"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchWorkspaceUsers,
  createWorkspaceUser,
  updateWorkspaceUser,
  deleteWorkspaceUser,
  type UserResponse,
  type UserFetchResult,
  type UserListFetchResult,
} from "../infrastructure/workspace-users-api";

const USERS_QUERY_KEY = ["workspace", "users"] as const;

export function useWorkspaceUsers() {
  return useQuery<UserResponse[]>({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const result = await fetchWorkspaceUsers();
      if (result.status === "success") return result.data;
      return [];
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useCreateWorkspaceUserAction() {
  const queryClient = useQueryClient();

  return useMutation<
    UserFetchResult,
    Error,
    { username: string; email: string; password: string }
  >({
    mutationFn: createWorkspaceUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateWorkspaceUserAction() {
  const queryClient = useQueryClient();

  return useMutation<
    UserFetchResult,
    Error,
    {
      userId: string;
      payload: { username?: string; email?: string; password?: string; roles?: string[] };
    }
  >({
    mutationFn: ({ userId, payload }) => updateWorkspaceUser(userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useDeleteWorkspaceUserAction() {
  const queryClient = useQueryClient();

  return useMutation<UserFetchResult, Error, string>({
    mutationFn: deleteWorkspaceUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
