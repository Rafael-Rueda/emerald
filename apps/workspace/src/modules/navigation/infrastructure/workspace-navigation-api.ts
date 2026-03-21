import {
  type MutationResult,
  type WorkspaceNavigation,
  type WorkspaceNavigationList,
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

export type WorkspaceNavigationListFetchResult =
  | { status: "success"; data: WorkspaceNavigationList }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceNavigationDetailFetchResult =
  | { status: "success"; data: WorkspaceNavigation }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export type WorkspaceNavigationReorderResult =
  | { status: "success"; data: MutationResult }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceNavigationList(): Promise<WorkspaceNavigationListFetchResult> {
  const spaceIdResult = await resolveWorkspaceSpaceId();

  if (spaceIdResult.status !== "success") {
    return spaceIdResult;
  }

  const result = await workspaceApiClient.getWorkspaceNavigation(spaceIdResult.data);

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

export async function fetchWorkspaceNavigationDetail(
  navigationId: string,
): Promise<WorkspaceNavigationDetailFetchResult> {
  const result = await workspaceApiClient.getWorkspaceNavigationItem(navigationId);

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

export async function reorderWorkspaceNavigation(
  navigationId: string,
): Promise<WorkspaceNavigationReorderResult> {
  const result = await workspaceApiClient.reorderWorkspaceNavigation(navigationId);

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
