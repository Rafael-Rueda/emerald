import {
  type DocumentContent,
  type MutationResult,
  type WorkspaceDocument,
  type WorkspaceDocumentList,
} from "@emerald/contracts";
import {
  createApiClient,
  type WorkspaceDocumentEditor,
  type WorkspaceReleaseVersion,
  type WorkspaceRevision,
} from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);

export type WorkspaceDocumentsListFetchResult =
  | { status: "success"; data: WorkspaceDocumentList }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentDetailFetchResult =
  | { status: "success"; data: WorkspaceDocument }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentEditorFetchResult =
  | { status: "success"; data: WorkspaceDocumentEditor }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceReleaseVersionsFetchResult =
  | { status: "success"; data: WorkspaceReleaseVersion[] }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentPublishResult =
  | { status: "success"; data: MutationResult }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentCreateResult =
  | { status: "success"; data: WorkspaceDocumentEditor }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentRevisionCreateResult =
  | { status: "success"; data: WorkspaceRevision }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentRevisionsFetchResult =
  | { status: "success"; data: WorkspaceRevision[] }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceDocumentsList(
  spaceId: string,
): Promise<WorkspaceDocumentsListFetchResult> {
  const result = await workspaceApiClient.getWorkspaceDocuments(spaceId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

export async function fetchWorkspaceDocumentDetail(
  documentId: string,
): Promise<WorkspaceDocumentDetailFetchResult> {
  const result = await workspaceApiClient.getWorkspaceDocument(documentId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "not-found":
      return { status: "not-found" };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
  }
}

export async function fetchWorkspaceDocumentEditor(
  documentId: string,
): Promise<WorkspaceDocumentEditorFetchResult> {
  const result = await workspaceApiClient.getWorkspaceDocumentEditor(documentId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "not-found":
      return { status: "not-found" };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
  }
}

export async function fetchWorkspaceReleaseVersions(
  spaceId: string,
): Promise<WorkspaceReleaseVersionsFetchResult> {
  const result = await workspaceApiClient.getWorkspaceReleaseVersions(spaceId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

export async function createWorkspaceDocumentDraft(payload: {
  spaceId: string;
  releaseVersionId: string;
  title: string;
  slug: string;
  content_json: DocumentContent;
}): Promise<WorkspaceDocumentCreateResult> {
  const result = await workspaceApiClient.createWorkspaceDocument(payload);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

export async function createWorkspaceDocumentRevision(payload: {
  documentId: string;
  content_json: DocumentContent;
  changeNote?: string;
}): Promise<WorkspaceDocumentRevisionCreateResult> {
  const result = await workspaceApiClient.createWorkspaceDocumentRevision(
    payload.documentId,
    {
      content_json: payload.content_json,
      ...(payload.changeNote ? { changeNote: payload.changeNote } : {}),
    },
  );

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

export async function fetchWorkspaceDocumentRevisions(
  documentId: string,
): Promise<WorkspaceDocumentRevisionsFetchResult> {
  const result = await workspaceApiClient.getWorkspaceDocumentRevisions(documentId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "not-found":
      return { status: "not-found" };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
  }
}

export async function publishWorkspaceDocument(
  documentId: string,
): Promise<WorkspaceDocumentPublishResult> {
  const result = await workspaceApiClient.publishWorkspaceDocument(documentId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

export type WorkspaceDocumentUnpublishResult =
  | { status: "success" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function unpublishWorkspaceDocument(
  documentId: string,
): Promise<WorkspaceDocumentUnpublishResult> {
  const result = await workspaceApiClient.unpublishWorkspaceDocument(documentId);

  switch (result.status) {
    case "success":
      return { status: "success" };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}
