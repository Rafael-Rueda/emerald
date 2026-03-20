import type {
  WorkspaceDocument,
  WorkspaceDocumentList,
  WorkspaceNavigation,
  WorkspaceNavigationList,
  WorkspaceVersion,
  WorkspaceVersionList,
  MutationResult,
} from "@emerald/contracts";

/**
 * Canonical workspace/admin fixtures.
 */

export const wsDocGettingStarted: WorkspaceDocument = {
  id: "doc-getting-started",
  title: "Getting Started",
  slug: "getting-started",
  space: "guides",
  status: "published",
  updatedAt: "2025-01-15T10:00:00Z",
};

export const wsDocApiReference: WorkspaceDocument = {
  id: "doc-api-reference",
  title: "API Reference",
  slug: "api-reference",
  space: "guides",
  status: "draft",
  updatedAt: "2025-01-20T14:30:00Z",
};

export const wsDocumentList: WorkspaceDocumentList = {
  documents: [wsDocGettingStarted, wsDocApiReference],
};

export const wsNavGettingStarted: WorkspaceNavigation = {
  id: "nav-getting-started",
  label: "Getting Started",
  slug: "getting-started",
  space: "guides",
  parentId: null,
  order: 0,
  updatedAt: "2025-01-15T10:00:00Z",
};

export const wsNavApiReference: WorkspaceNavigation = {
  id: "nav-api-reference",
  label: "API Reference",
  slug: "api-reference",
  space: "guides",
  parentId: null,
  order: 1,
  updatedAt: "2025-01-20T14:30:00Z",
};

export const wsNavigationList: WorkspaceNavigationList = {
  items: [wsNavGettingStarted, wsNavApiReference],
};

export const wsVersionV1: WorkspaceVersion = {
  id: "ver-v1",
  label: "v1",
  slug: "v1",
  space: "guides",
  status: "published",
  isDefault: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

export const wsVersionV2: WorkspaceVersion = {
  id: "ver-v2",
  label: "v2",
  slug: "v2",
  space: "guides",
  status: "draft",
  isDefault: false,
  createdAt: "2025-06-01T00:00:00Z",
  updatedAt: "2025-06-01T00:00:00Z",
};

export const wsVersionList: WorkspaceVersionList = {
  versions: [wsVersionV1, wsVersionV2],
};

export const mutationSuccess: MutationResult = {
  success: true,
  message: "Operation completed successfully.",
};

export const mutationFailure: MutationResult = {
  success: false,
  message: "Operation failed. Please try again.",
};
