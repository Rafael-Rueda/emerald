import {
  type WorkspaceDocument,
  type WorkspaceNavigation,
  type WorkspaceNavigationList,
} from "@emerald/contracts";
import { createApiClient } from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);

export type WorkspaceNavigationListFetchResult =
  | { status: "success"; data: WorkspaceNavigationList }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceNavigationDocumentsFetchResult =
  | { status: "success"; data: WorkspaceDocument[] }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceNavigationMutationResult =
  | { status: "success"; data: WorkspaceNavigation }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceNavigationList(
  spaceId: string,
  releaseVersionId?: string | null,
): Promise<WorkspaceNavigationListFetchResult> {
  const result = await workspaceApiClient.getWorkspaceNavigation(spaceId, releaseVersionId);

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

export async function fetchWorkspaceNavigationDocuments(
  spaceId: string,
): Promise<WorkspaceNavigationDocumentsFetchResult> {
  const result = await workspaceApiClient.getWorkspaceDocuments(spaceId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data.documents };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "error", message: "Request failed with status 404" };
  }
}

export async function createWorkspaceNavigationNode(payload: {
  spaceId: string;
  releaseVersionId?: string | null;
  parentId?: string | null;
  documentId?: string | null;
  label: string;
  slug: string;
  order: number;
  nodeType: "document" | "group" | "external_link";
  externalUrl?: string | null;
}): Promise<WorkspaceNavigationMutationResult> {
  const result = await workspaceApiClient.createWorkspaceNavigation({
    spaceId: payload.spaceId,
    releaseVersionId: payload.releaseVersionId,
    parentId: payload.parentId,
    documentId: payload.documentId,
    label: payload.label,
    slug: payload.slug,
    order: payload.order,
    nodeType: payload.nodeType,
    externalUrl: payload.externalUrl,
  });

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

export async function updateWorkspaceNavigationNode(
  navigationId: string,
  payload: {
    documentId?: string | null;
    label?: string;
    slug?: string;
    order?: number;
    nodeType?: "document" | "group" | "external_link";
    externalUrl?: string | null;
  },
): Promise<WorkspaceNavigationMutationResult> {
  const result = await workspaceApiClient.updateWorkspaceNavigation(
    navigationId,
    payload,
  );

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

export async function moveWorkspaceNavigationNode(
  navigationId: string,
  payload: {
    parentId?: string | null;
    order: number;
  },
): Promise<WorkspaceNavigationMutationResult> {
  const result = await workspaceApiClient.moveWorkspaceNavigation(
    navigationId,
    payload,
  );

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
