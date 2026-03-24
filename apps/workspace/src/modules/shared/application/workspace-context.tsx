"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Space } from "@emerald/contracts";
import { createApiClient, type WorkspaceReleaseVersion } from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);
const SPACE_STORAGE_KEY = "emerald:activeSpaceId";
const VERSION_STORAGE_KEY = "emerald:activeVersionId";

export interface WorkspaceContextValue {
  spaces: Space[];
  activeSpaceId: string | null;
  activeSpace: Space | null;
  setActiveSpaceId: (id: string) => void;
  versions: WorkspaceReleaseVersion[];
  activeVersionId: string | null;
  activeVersion: WorkspaceReleaseVersion | null;
  setActiveVersionId: (id: string) => void;
  isLoading: boolean;
  isLoadingVersions: boolean;
  refetchSpaces: () => void;
  refetchVersions: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WORKSPACE_SPACES_QUERY_KEY = ["workspace", "spaces", "context"] as const;

function workspaceVersionsContextQueryKey(spaceId: string): readonly string[] {
  return ["workspace", "versions", "context", spaceId] as const;
}

async function fetchSpaces(): Promise<Space[]> {
  const result = await workspaceApiClient.getSpaces();
  if (result.status === "success") return result.data;
  return [];
}

async function fetchVersionsForSpace(spaceId: string): Promise<WorkspaceReleaseVersion[]> {
  const result = await workspaceApiClient.getWorkspaceReleaseVersions(spaceId);
  if (result.status === "success") return result.data;
  return [];
}

function readStoredId(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredId(key: string, id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, id);
  } catch {
    // ignore
  }
}

export function WorkspaceContextProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [activeSpaceId, setActiveSpaceIdState] = useState<string | null>(readStoredId(SPACE_STORAGE_KEY));
  const [activeVersionId, setActiveVersionIdState] = useState<string | null>(readStoredId(VERSION_STORAGE_KEY));

  const { data: spaces = [], isLoading } = useQuery<Space[]>({
    queryKey: WORKSPACE_SPACES_QUERY_KEY,
    queryFn: fetchSpaces,
    retry: false,
    staleTime: 60_000,
  });

  const { data: versions = [], isLoading: isLoadingVersions } = useQuery<WorkspaceReleaseVersion[]>({
    queryKey: workspaceVersionsContextQueryKey(activeSpaceId ?? "none"),
    queryFn: () => fetchVersionsForSpace(activeSpaceId!),
    enabled: !!activeSpaceId,
    retry: false,
    staleTime: 30_000,
  });

  // Auto-select first space if none selected or stored one is invalid
  useEffect(() => {
    if (spaces.length === 0) return;

    if (!activeSpaceId || !spaces.some((s) => s.id === activeSpaceId)) {
      const fallback = spaces[0].id;
      setActiveSpaceIdState(fallback);
      writeStoredId(SPACE_STORAGE_KEY, fallback);
    }
  }, [spaces, activeSpaceId]);

  // Auto-select default version when versions load or when stored one is invalid
  useEffect(() => {
    if (versions.length === 0) {
      if (activeVersionId !== null) {
        setActiveVersionIdState(null);
      }
      return;
    }

    if (activeVersionId && versions.some((v) => v.id === activeVersionId)) {
      return;
    }

    const fallback =
      versions.find((v) => v.isDefault)
      ?? versions.find((v) => v.status === "published")
      ?? versions[0];

    setActiveVersionIdState(fallback.id);
    writeStoredId(VERSION_STORAGE_KEY, fallback.id);
  }, [versions, activeVersionId]);

  const setActiveSpaceId = useCallback((id: string) => {
    setActiveSpaceIdState(id);
    writeStoredId(SPACE_STORAGE_KEY, id);
    // Reset version when space changes — the versions effect will auto-select
    setActiveVersionIdState(null);
  }, []);

  const setActiveVersionId = useCallback((id: string) => {
    setActiveVersionIdState(id);
    writeStoredId(VERSION_STORAGE_KEY, id);
  }, []);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  const activeVersion = useMemo(
    () => versions.find((v) => v.id === activeVersionId) ?? null,
    [versions, activeVersionId],
  );

  const refetchSpaces = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: WORKSPACE_SPACES_QUERY_KEY });
  }, [queryClient]);

  const refetchVersions = useCallback(() => {
    if (activeSpaceId) {
      void queryClient.invalidateQueries({ queryKey: workspaceVersionsContextQueryKey(activeSpaceId) });
    }
  }, [queryClient, activeSpaceId]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      spaces,
      activeSpaceId,
      activeSpace,
      setActiveSpaceId,
      versions,
      activeVersionId,
      activeVersion,
      setActiveVersionId,
      isLoading,
      isLoadingVersions,
      refetchSpaces,
      refetchVersions,
    }),
    [spaces, activeSpaceId, activeSpace, setActiveSpaceId, versions, activeVersionId, activeVersion, setActiveVersionId, isLoading, isLoadingVersions, refetchSpaces, refetchVersions],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceContext must be used within WorkspaceContextProvider");
  return ctx;
}
