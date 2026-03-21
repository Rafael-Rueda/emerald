import {
  type MutationResult,
  type WorkspaceVersion,
  type WorkspaceVersionList,
} from "@emerald/contracts";
import { createApiClient } from "@emerald/data-access";

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

export type WorkspaceVersionsListFetchResult =
  | { status: "success"; data: WorkspaceVersionList }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceVersionDetailFetchResult =
  | { status: "success"; data: WorkspaceVersion }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceVersionPublishResult =
  | { status: "success"; data: MutationResult }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceVersionsList(): Promise<WorkspaceVersionsListFetchResult> {
  const spaceIdResult = await resolveWorkspaceSpaceId();

  if (spaceIdResult.status !== "success") {
    return spaceIdResult;
  }

  const result = await workspaceApiClient.getWorkspaceVersions(spaceIdResult.data);

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

export async function fetchWorkspaceVersionDetail(
  versionId: string,
): Promise<WorkspaceVersionDetailFetchResult> {
  const result = await workspaceApiClient.getWorkspaceVersion(versionId);

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

export async function publishWorkspaceVersion(
  versionId: string,
): Promise<WorkspaceVersionPublishResult> {
  const result = await workspaceApiClient.publishWorkspaceVersion(versionId);

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
