import {
  createApiClient,
  type WorkspaceReleaseVersion,
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

export type WorkspaceVersionsListFetchResult =
  | { status: "success"; data: WorkspaceReleaseVersion[] }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceVersionMutationResult =
  | { status: "success"; data: WorkspaceReleaseVersion }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceVersionsList(): Promise<WorkspaceVersionsListFetchResult> {
  const spaceIdResult = await resolveWorkspaceSpaceId();

  if (spaceIdResult.status !== "success") {
    return spaceIdResult;
  }

  const result = await workspaceApiClient.getWorkspaceReleaseVersions(spaceIdResult.data);

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
  label: string;
  key: string;
}): Promise<WorkspaceVersionMutationResult> {
  const spaceIdResult = await resolveWorkspaceSpaceId();

  if (spaceIdResult.status !== "success") {
    return spaceIdResult;
  }

  const result = await workspaceApiClient.createWorkspaceReleaseVersion({
    spaceId: spaceIdResult.data,
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
