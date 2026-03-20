import {
  WorkspaceVersionListSchema,
  WorkspaceVersionSchema,
  type WorkspaceVersion,
  type WorkspaceVersionList,
} from "@emerald/contracts";

export type WorkspaceVersionsListFetchResult =
  | { status: "success"; data: WorkspaceVersionList }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceVersionDetailFetchResult =
  | { status: "success"; data: WorkspaceVersion }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceVersionsList(): Promise<WorkspaceVersionsListFetchResult> {
  let response: Response;

  try {
    response = await fetch("/api/workspace/versions");
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

  const parsed = WorkspaceVersionListSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace version list response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

export async function fetchWorkspaceVersionDetail(
  versionId: string,
): Promise<WorkspaceVersionDetailFetchResult> {
  let response: Response;

  try {
    response = await fetch(`/api/workspace/versions/${encodeURIComponent(versionId)}`);
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

  const parsed = WorkspaceVersionSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace version detail response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}
