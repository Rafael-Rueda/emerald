/**
 * @emerald/data-access
 *
 * Query helpers, ports, adapters, and shared data wiring.
 * This package must remain agnostic of app and domain module internals.
 */

import {
  AiContextResponseSchema,
  DocumentContentSchema,
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
const WORKSPACE_AUTH_CLIENT_COOKIE_NAME = "emerald_workspace_auth_token_client";

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

const WorkspaceDocumentEditorSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  space: z.string(),
  spaceId: z.string(),
  releaseVersionId: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  content_json: DocumentContentSchema.nullable(),
  currentRevisionId: z.string().nullable(),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const WorkspaceRevisionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  revisionNumber: z.number().int(),
  content_json: DocumentContentSchema,
  createdBy: z.string(),
  changeNote: z.string().nullable(),
  createdAt: z.string(),
});

const WorkspaceRevisionListSchema = z
  .object({
    revisions: z.array(WorkspaceRevisionSchema),
  })
  .transform((payload) => payload.revisions);

const WorkspaceReleaseVersionSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  key: z.string(),
  label: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  isDefault: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const WorkspaceReleaseVersionListSchema = z
  .object({
    versions: z.array(WorkspaceReleaseVersionSchema),
  })
  .transform((payload) => payload.versions);

const StorageUploadResponseSchema = z.object({
  url: z.url(),
});

const WorkspacePublishDocumentResultSchema = z
  .union([
    MutationResultSchema,
    WorkspaceDocumentEditorSchema,
  ])
  .transform((payload) => {
    if ("success" in payload) {
      return payload;
    }

    return {
      success: payload.status === "published",
      message:
        payload.status === "published"
          ? "Document published successfully."
          : `Document status is ${payload.status}.`,
    };
  });

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

function shouldRetryWorkspaceRequestWithRelativePath(
  baseUrl: string,
  path: string,
): boolean {
  if (!baseUrl) {
    return false;
  }

  return /^\/api\/workspace(?:\/|$)/.test(path);
}

function readAuthCookieToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName !== WORKSPACE_AUTH_CLIENT_COOKIE_NAME) {
      continue;
    }

    const value = rawValue.join("=");
    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

async function request<TSchema extends z.ZodTypeAny>(
  baseUrl: string,
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<FetchResult<z.infer<TSchema>>> {
  let response: Response;
  const requestUrl = buildRequestUrl(baseUrl, path);
  const requestInit: RequestInit = {
    method: init?.method ?? "GET",
    ...init,
  };

  if (baseUrl) {
    const token = readAuthCookieToken();

    if (token) {
      const headers = new Headers(requestInit.headers);

      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      requestInit.headers = headers;
    }
  }

  try {
    response = await fetch(requestUrl, requestInit);
  } catch (error) {
    if (shouldRetryWorkspaceRequestWithRelativePath(baseUrl, path)) {
      try {
        response = await fetch(buildRequestUrl("", path), requestInit);
      } catch {
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Network error",
        };
      }
    } else {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      };
    }
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

async function executeWorkspaceDocumentPublishMutation(
  baseUrl: string,
  path: string,
): Promise<FetchResult<z.infer<typeof MutationResultSchema>>> {
  const result = await request(baseUrl, path, WorkspacePublishDocumentResultSchema, {
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
export type WorkspaceDocumentEditor = z.infer<typeof WorkspaceDocumentEditorSchema>;
export type WorkspaceRevision = z.infer<typeof WorkspaceRevisionSchema>;
export type WorkspaceReleaseVersion = z.infer<typeof WorkspaceReleaseVersionSchema>;

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

    getWorkspaceDocuments(spaceId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents?spaceId=${encodeURIComponent(spaceId)}`,
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

    getWorkspaceDocumentEditor(documentId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}`,
        WorkspaceDocumentEditorSchema,
      );
    },

    createWorkspaceDocument(payload: {
      spaceId: string;
      releaseVersionId: string;
      title: string;
      slug: string;
      content_json: z.infer<typeof DocumentContentSchema>;
    }) {
      return request(
        resolvedBaseUrl,
        "/api/workspace/documents",
        WorkspaceDocumentEditorSchema,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    updateWorkspaceDocument(documentId: string, payload: {
      title?: string;
      content_json?: z.infer<typeof DocumentContentSchema>;
    }) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}`,
        WorkspaceDocumentEditorSchema,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    createWorkspaceDocumentRevision(
      documentId: string,
      payload: {
        content_json: z.infer<typeof DocumentContentSchema>;
        changeNote?: string;
      },
    ) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}/revisions`,
        WorkspaceRevisionSchema,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    getWorkspaceDocumentRevisions(documentId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}/revisions`,
        WorkspaceRevisionListSchema,
      );
    },

    publishWorkspaceDocument(documentId: string) {
      return executeWorkspaceDocumentPublishMutation(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}/publish`,
      );
    },

    unpublishWorkspaceDocument(documentId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/documents/${encodeURIComponent(documentId)}/unpublish`,
        WorkspaceDocumentEditorSchema,
        {
          method: "POST",
        },
      );
    },

    getWorkspaceNavigation(spaceId: string, releaseVersionId?: string | null) {
      const params = new URLSearchParams({ spaceId });
      if (releaseVersionId) {
        params.set("releaseVersionId", releaseVersionId);
      }
      return request(
        resolvedBaseUrl,
        `/api/workspace/navigation?${params.toString()}`,
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

    createWorkspaceNavigation(payload: {
      spaceId: string;
      releaseVersionId?: string | null;
      parentId?: string | null;
      documentId?: string | null;
      label: string;
      slug: string;
      order: number;
      nodeType: "document" | "group" | "external_link";
      externalUrl?: string | null;
    }) {
      return request(
        resolvedBaseUrl,
        "/api/workspace/navigation",
        WorkspaceNavigationSchema,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    updateWorkspaceNavigation(
      navigationId: string,
      payload: {
        documentId?: string | null;
        label?: string;
        slug?: string;
        order?: number;
        nodeType?: "document" | "group" | "external_link";
        externalUrl?: string | null;
      },
    ) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/navigation/${encodeURIComponent(navigationId)}`,
        WorkspaceNavigationSchema,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    moveWorkspaceNavigation(
      navigationId: string,
      payload: { parentId?: string | null; order: number },
    ) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/navigation/${encodeURIComponent(navigationId)}/move`,
        WorkspaceNavigationSchema,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    reorderWorkspaceNavigation(navigationId: string) {
      return executeWorkspaceMutation(
        resolvedBaseUrl,
        `/api/workspace/navigation/${encodeURIComponent(navigationId)}/reorder`,
      );
    },

    getWorkspaceVersions(spaceId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/versions?spaceId=${encodeURIComponent(spaceId)}`,
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

    getWorkspaceReleaseVersions(spaceId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/versions?spaceId=${encodeURIComponent(spaceId)}`,
        WorkspaceReleaseVersionListSchema,
      );
    },

    getWorkspaceReleaseVersion(versionId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/versions/${encodeURIComponent(versionId)}`,
        WorkspaceReleaseVersionSchema,
      );
    },

    createWorkspaceReleaseVersion(payload: {
      spaceId: string;
      key: string;
      label: string;
    }) {
      return request(
        resolvedBaseUrl,
        "/api/workspace/versions",
        WorkspaceReleaseVersionSchema,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
    },

    publishWorkspaceReleaseVersion(versionId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/versions/${encodeURIComponent(versionId)}/publish`,
        WorkspaceReleaseVersionSchema,
        {
          method: "POST",
        },
      );
    },

    setDefaultWorkspaceReleaseVersion(versionId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/versions/${encodeURIComponent(versionId)}/set-default`,
        WorkspaceReleaseVersionSchema,
        {
          method: "POST",
        },
      );
    },

    uploadWorkspaceStorageImage(payload: {
      entityType: string;
      entityId: string;
      field: string;
      file: File;
    }) {
      if (typeof FormData === "undefined") {
        return Promise.resolve({
          status: "error" as const,
          message: "File uploads are not supported in this environment",
        });
      }

      const formData = new FormData();
      formData.set("file", payload.file);
      formData.set("entityType", payload.entityType);
      formData.set("entityId", payload.entityId);
      formData.set("field", payload.field);

      return request(
        resolvedBaseUrl,
        "/api/storage/upload",
        StorageUploadResponseSchema,
        {
          method: "POST",
          body: formData,
        },
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

    createSpace(payload: { key: string; name: string; description: string }) {
      return request(resolvedBaseUrl, "/api/workspace/spaces", SpaceSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },

    updateSpace(spaceId: string, payload: { name?: string; description?: string; key?: string }) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/spaces/${encodeURIComponent(spaceId)}`,
        SpaceSchema,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    },

    deleteSpace(spaceId: string) {
      return request(
        resolvedBaseUrl,
        `/api/workspace/spaces/${encodeURIComponent(spaceId)}`,
        SpaceSchema,
        { method: "DELETE" },
      );
    },

    async getAiContext(
      entityType: string,
      entityId: string,
    ): Promise<FetchResult<z.infer<typeof AiContextResponseSchema>>> {
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
          status: "validation-error" as const,
          message: "Invalid AI context response: payload scope mismatch",
        };
      }

      return result;
    },
  };
}
