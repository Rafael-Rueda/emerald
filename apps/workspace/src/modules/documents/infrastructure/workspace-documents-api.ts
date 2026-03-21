import {
  type DocumentContent,
  type MutationResult,
  type Space,
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

type WorkspaceSpaceIdResult =
  | { status: "success"; data: string }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

async function resolveWorkspaceSpaceId(): Promise<WorkspaceSpaceIdResult> {
  const spacesResult = await workspaceApiClient.getSpaces();

  switch (spacesResult.status) {
    case "success": {
      const [firstSpace] = spacesResult.data;

      if (!firstSpace) {
        return { status: "error", message: "No workspace spaces available" };
      }

      return { status: "success", data: firstSpace.id };
    }
    case "validation-error":
      return { status: "validation-error", message: spacesResult.message };
    case "error":
      return { status: "error", message: spacesResult.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

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

export type WorkspaceSpacesFetchResult =
  | { status: "success"; data: Space[] }
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

export async function fetchWorkspaceDocumentsList(): Promise<WorkspaceDocumentsListFetchResult> {
  const spaceIdResult = await resolveWorkspaceSpaceId();

  if (spaceIdResult.status !== "success") {
    return spaceIdResult;
  }

  const result = await workspaceApiClient.getWorkspaceDocuments(spaceIdResult.data);

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

export async function fetchWorkspaceSpaces(): Promise<WorkspaceSpacesFetchResult> {
  const result = await workspaceApiClient.getSpaces();

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
