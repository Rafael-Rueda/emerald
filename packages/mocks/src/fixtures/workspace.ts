import type {
  DocumentContent,
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
  spaceId: "space-guides",
  releaseVersionId: "ver-v1",
  status: "published",
  updatedAt: "2025-01-15T10:00:00Z",
};

export const wsDocApiReference: WorkspaceDocument = {
  id: "doc-api-reference",
  title: "API Reference",
  slug: "api-reference",
  space: "guides",
  spaceId: "space-guides",
  releaseVersionId: "ver-v1",
  status: "draft",
  updatedAt: "2025-01-20T14:30:00Z",
};

export const wsDocumentList: WorkspaceDocumentList = {
  documents: [wsDocGettingStarted, wsDocApiReference],
};

function createParagraphContent(text: string): DocumentContent {
  return {
    type: "doc",
    version: 1,
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", text }],
      },
    ],
  };
}

export const wsDocumentRevisions = {
  "doc-getting-started": [
    {
      id: "rev-getting-started-2",
      documentId: "doc-getting-started",
      revisionNumber: 2,
      content_json: createParagraphContent("Getting Started latest revision"),
      createdBy: "admin@test.com",
      changeNote: "Updated intro section",
      createdAt: "2025-01-16T10:00:00Z",
    },
    {
      id: "rev-getting-started-1",
      documentId: "doc-getting-started",
      revisionNumber: 1,
      content_json: createParagraphContent("Getting Started initial revision"),
      createdBy: "admin@test.com",
      changeNote: "Initial draft",
      createdAt: "2025-01-15T10:00:00Z",
    },
  ],
  "doc-api-reference": [
    {
      id: "rev-api-reference-1",
      documentId: "doc-api-reference",
      revisionNumber: 1,
      content_json: createParagraphContent("API Reference initial revision"),
      createdBy: "admin@test.com",
      changeNote: "Initial draft",
      createdAt: "2025-01-20T14:30:00Z",
    },
  ],
} as const;

export const wsNavGettingStarted: WorkspaceNavigation = {
  id: "nav-getting-started",
  spaceId: "space-guides",
  releaseVersionId: "ver-v1",
  parentId: null,
  documentId: "doc-getting-started",
  label: "Getting Started",
  slug: "getting-started",
  order: 0,
  nodeType: "document",
  externalUrl: null,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
  children: [
    {
      id: "nav-installation",
      spaceId: "space-guides",
      releaseVersionId: "ver-v1",
      parentId: "nav-getting-started",
      documentId: null,
      label: "Installation",
      slug: "installation",
      order: 0,
      nodeType: "group",
      externalUrl: null,
      createdAt: "2025-01-16T10:00:00Z",
      updatedAt: "2025-01-16T10:00:00Z",
      children: [],
    },
  ],
};

export const wsNavApiReference: WorkspaceNavigation = {
  id: "nav-api-reference",
  spaceId: "space-guides",
  releaseVersionId: "ver-v1",
  parentId: null,
  documentId: "doc-api-reference",
  label: "API Reference",
  slug: "api-reference",
  order: 1,
  nodeType: "document",
  externalUrl: null,
  createdAt: "2025-01-20T14:30:00Z",
  updatedAt: "2025-01-20T14:30:00Z",
  children: [],
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
