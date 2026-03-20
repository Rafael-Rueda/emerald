import {
  WorkspaceDocumentListSchema,
  WorkspaceDocumentSchema,
  type WorkspaceDocument,
  type WorkspaceDocumentList,
} from "@emerald/contracts";

export type WorkspaceDocumentsListFetchResult =
  | { status: "success"; data: WorkspaceDocumentList }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceDocumentDetailFetchResult =
  | { status: "success"; data: WorkspaceDocument }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceDocumentsList(): Promise<WorkspaceDocumentsListFetchResult> {
  let response: Response;

  try {
    response = await fetch("/api/workspace/documents");
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  if (!response.ok) {
    return {
      status: "error",
      message: `Request failed with status ${response.status}`,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      status: "validation-error",
      message: "Failed to parse response as JSON",
    };
  }

  const parsed = WorkspaceDocumentListSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace document list response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

export async function fetchWorkspaceDocumentDetail(
  documentId: string,
): Promise<WorkspaceDocumentDetailFetchResult> {
  let response: Response;

  try {
    response = await fetch(`/api/workspace/documents/${encodeURIComponent(documentId)}`);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Network error",
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

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      status: "validation-error",
      message: "Failed to parse response as JSON",
    };
  }

  const parsed = WorkspaceDocumentSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace document detail response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}
