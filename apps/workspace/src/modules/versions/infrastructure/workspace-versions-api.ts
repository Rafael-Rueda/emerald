import {
  createApiClient,
  type WorkspaceReleaseVersion,
} from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);

export type WorkspaceVersionsListFetchResult =
  | { status: "success"; data: WorkspaceReleaseVersion[] }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceVersionMutationResult =
  | { status: "success"; data: WorkspaceReleaseVersion }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceVersionsList(
  spaceId: string,
): Promise<WorkspaceVersionsListFetchResult> {
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

export async function createWorkspaceVersion(payload: {
  spaceId: string;
  label: string;
  key: string;
}): Promise<WorkspaceVersionMutationResult> {
  const result = await workspaceApiClient.createWorkspaceReleaseVersion({
    spaceId: payload.spaceId,
    label: payload.label,
    key: payload.key,
  });

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

export async function publishWorkspaceVersion(
  versionId: string,
): Promise<WorkspaceVersionMutationResult> {
  const result = await workspaceApiClient.publishWorkspaceReleaseVersion(versionId);

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

export async function setDefaultWorkspaceVersion(
  versionId: string,
): Promise<WorkspaceVersionMutationResult> {
  const result = await workspaceApiClient.setDefaultWorkspaceReleaseVersion(versionId);

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
