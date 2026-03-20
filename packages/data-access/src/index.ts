/**
 * @emerald/data-access
 *
 * Query helpers, ports, adapters, and shared data wiring.
 * This package must remain agnostic of app and domain module internals.
 */

import {
  AiContextResponseSchema,
  DocumentResponseSchema,
  MutationResultSchema,
  NavigationResponseSchema,
  SearchResponseSchema,
  SpaceSchema,
  VersionListResponseSchema,
  WorkspaceDocumentListSchema,
  WorkspaceDocumentSchema,
  WorkspaceNavigationListSchema,
  WorkspaceNavigationSchema,
  WorkspaceVersionListSchema,
  WorkspaceVersionSchema,
} from "@emerald/contracts";
import { z } from "zod";

export type FetchResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | { status: "validation-error"; message: string };

type ProcessLike = {
  env?: Record<string, string | undefined>;
};

type QueryTuple = readonly [string, ...string[]];

const DOCUMENT_QUERY_KEY_ROOT = ["documents"] as const;
const NAVIGATION_QUERY_KEY_ROOT = ["navigation"] as const;
const VERSION_QUERY_KEY_ROOT = ["versions"] as const;
const SEARCH_QUERY_KEY_ROOT = ["search"] as const;
const SPACES_QUERY_KEY_ROOT = ["spaces"] as const;
const WORKSPACE_QUERY_KEY_ROOT = ["workspace"] as const;

export const documentQueryKeys = {
  all: (): typeof DOCUMENT_QUERY_KEY_ROOT => DOCUMENT_QUERY_KEY_ROOT,
  detail: (space: string, version: string, slug: string) =>
    ["documents", "detail", space, version, slug] as const,
  workspaceList: () => ["documents", "workspace", "list"] as const,
  workspaceDetail: (documentId: string) =>
    ["documents", "workspace", "detail", documentId] as const,
};

export const navigationQueryKeys = {
  all: (): typeof NAVIGATION_QUERY_KEY_ROOT => NAVIGATION_QUERY_KEY_ROOT,
  detail: (space: string, version: string) =>
    ["navigation", "detail", space, version] as const,
  workspaceList: () => ["navigation", "workspace", "list"] as const,
  workspaceDetail: (navigationId: string) =>
    ["navigation", "workspace", "detail", navigationId] as const,
};

export const versionQueryKeys = {
  all: (): typeof VERSION_QUERY_KEY_ROOT => VERSION_QUERY_KEY_ROOT,
  detail: (space: string) => ["versions", "detail", space] as const,
  workspaceList: () => ["versions", "workspace", "list"] as const,
  workspaceDetail: (versionId: string) =>
    ["versions", "workspace", "detail", versionId] as const,
};

export const searchQueryKeys = {
  all: (): typeof SEARCH_QUERY_KEY_ROOT => SEARCH_QUERY_KEY_ROOT,
  detail: (query: string) => ["search", "detail", query] as const,
};

export const spacesQueryKeys = {
  all: (): typeof SPACES_QUERY_KEY_ROOT => SPACES_QUERY_KEY_ROOT,
  detail: (spaceId: string) => ["spaces", "detail", spaceId] as const,
  workspaceList: () => ["spaces", "workspace", "list"] as const,
};

export const workspaceQueryKeys = {
  all: (): typeof WORKSPACE_QUERY_KEY_ROOT => WORKSPACE_QUERY_KEY_ROOT,
  documents: (): QueryTuple => ["workspace", "documents"],
  documentDetail: (documentId: string): QueryTuple => [
    "workspace",
    "documents",
    documentId,
  ],
  navigation: (): QueryTuple => ["workspace", "navigation"],
  navigationDetail: (navigationId: string): QueryTuple => [
    "workspace",
    "navigation",
    navigationId,
  ],
  versions: (): QueryTuple => ["workspace", "versions"],
  versionDetail: (versionId: string): QueryTuple => [
    "workspace",
    "versions",
    versionId,
  ],
  spaces: (): QueryTuple => ["workspace", "spaces"],
  aiContext: (entityType: string, entityId: string): QueryTuple => [
    "workspace",
    "ai-context",
    entityType,
    entityId,
  ],
};

const DocumentSchema = DocumentResponseSchema.transform((payload) => payload.document);
const NavigationSchema = NavigationResponseSchema.transform(
  (payload) => payload.navigation,
);
const VersionsSchema = VersionListResponseSchema.transform(
  (payload) => payload.versions,
);
const SpacesSchema = z
  .union([z.array(SpaceSchema), z.object({ spaces: z.array(SpaceSchema) })])
  .transform((payload) => (Array.isArray(payload) ? payload : payload.spaces));

function getEnvironmentApiUrl(): string {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: ProcessLike;
  };

  const apiUrl = globalWithProcess.process?.env?.NEXT_PUBLIC_API_URL;
  return typeof apiUrl === "string" ? apiUrl : "";
}

function normalizeBaseUrl(baseUrl?: string): string {
  const resolved = (baseUrl ?? getEnvironmentApiUrl()).trim();

  if (!resolved) {
    return "";
  }

  return resolved.replace(/\/+$/, "");
}

function buildRequestUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

async function request<TSchema extends z.ZodTypeAny>(
  baseUrl: string,
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<FetchResult<z.infer<TSchema>>> {
  let response: Response;

  try {
    response = await fetch(buildRequestUrl(baseUrl, path), {
      method: init?.method ?? "GET",
      ...init,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Network error",
    };
  }

  if (response.status === 404) {
    return { status: "not-found" };
  }

  if (!response.ok) {
    return {
      status: "error",
      message: `Request failed with status ${response.status}`,
    };
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return {
      status: "validation-error",
      message: "Failed to parse response as JSON",
    };
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid response payload: ${parsed.error.message}`,
    };
  }

  return {
    status: "success",
    data: parsed.data,
  };
}

async function executeWorkspaceMutation(
  baseUrl: string,
  path: string,
): Promise<FetchResult<z.infer<typeof MutationResultSchema>>> {
  const result = await request(baseUrl, path, MutationResultSchema, {
    method: "POST",
  });

  if (result.status !== "success") {
    return result;
  }

  if (!result.data.success) {
    return {
      status: "error",
      message: result.data.message,
    };
  }

  return result;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(baseUrl?: string) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    baseUrl: resolvedBaseUrl,

    getDocument(space: string, version: string, slug: string) {
      return request(
        resolvedBaseUrl,
        `/api/docs/${encodeURIComponent(space)}/${encodeURIComponent(version)}/${encodeURIComponent(slug)}`,
        DocumentSchema,
      );
    },

    getNavigation(space: string, version: string) {
      return request(
        resolvedBaseUrl,
        `/api/navigation/${encodeURIComponent(space)}/${encodeURIComponent(version)}`,
        NavigationSchema,
      );
    },

    getVersions(space: string) {
      return request(
        resolvedBaseUrl,
        `/api/versions/${encodeURIComponent(space)}`,
        VersionsSchema,
      );
    },

    search(query: string) {
      return request(
        resolvedBaseUrl,
        `/api/search?q=${encodeURIComponent(query)}`,
        SearchResponseSchema,
      );
    },

    getWorkspaceDocuments() {
      return request(
        resolvedBaseUrl,
        "/api/workspace/documents",
        WorkspaceDocumentListSchema,
      );
    },

    getWorkspaceDocument(documentId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}`,
        WorkspaceDocumentSchema,
      );
    },

    publishWorkspaceDocument(documentId: string) {
      return executeWorkspaceMutation(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}/publish`,
      );
    },

    getWorkspaceNavigation() {
      return request(
        resolvedBaseUrl,
        "/api/workspace/navigation",
        WorkspaceNavigationListSchema,
      );
    },

    getWorkspaceNavigationItem(navigationId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/navigation/${encodeURIComponent(navigationId)}`,
        WorkspaceNavigationSchema,
      );
    },

    reorderWorkspaceNavigation(navigationId: string) {
      return executeWorkspaceMutation(
        resolvedBaseUrl,
        `/api/workspace/navigation/${encodeURIComponent(navigationId)}/reorder`,
      );
    },

    getWorkspaceVersions() {
      return request(
        resolvedBaseUrl,
        "/api/workspace/versions",
        WorkspaceVersionListSchema,
      );
    },

    getWorkspaceVersion(versionId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/versions/${encodeURIComponent(versionId)}`,
        WorkspaceVersionSchema,
      );
    },

    publishWorkspaceVersion(versionId: string) {
      return executeWorkspaceMutation(
        resolvedBaseUrl,
        `/api/workspace/versions/${encodeURIComponent(versionId)}/publish`,
      );
    },

    getSpaces() {
      return request(resolvedBaseUrl, "/api/workspace/spaces", SpacesSchema);
    },

    getSpace(spaceId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/spaces/${encodeURIComponent(spaceId)}`,
        SpaceSchema,
      );
    },

    async getAiContext(entityType: string, entityId: string) {
      const result = await request(
        resolvedBaseUrl,
        `/api/workspace/ai-context/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
        AiContextResponseSchema,
      );

      if (result.status !== "success") {
        return result;
      }

      if (
        result.data.entityType !== entityType ||
        result.data.entityId !== entityId
      ) {
        return {
          status: "validation-error",
          message: "Invalid AI context response: payload scope mismatch",
        };
      }

      return result;
    },
  };
}
