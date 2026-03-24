import type { Space } from "@emerald/contracts";
import { createApiClient } from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);

export type SpaceFetchResult =
  | { status: "success"; data: Space }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | { status: "validation-error"; message: string };

export type SpaceListFetchResult =
  | { status: "success"; data: Space[] }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceSpacesList(): Promise<SpaceListFetchResult> {
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

export async function createWorkspaceSpace(payload: {
  key: string;
  name: string;
  description: string;
}): Promise<SpaceFetchResult> {
  const result = await workspaceApiClient.createSpace(payload);

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

export async function updateWorkspaceSpace(
  spaceId: string,
  payload: { name?: string; description?: string; key?: string },
): Promise<SpaceFetchResult> {
  const result = await workspaceApiClient.updateSpace(spaceId, payload);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "not-found" };
  }
}

export async function deleteWorkspaceSpace(spaceId: string): Promise<SpaceFetchResult> {
  const result = await workspaceApiClient.deleteSpace(spaceId);

  switch (result.status) {
    case "success":
      return { status: "success", data: result.data };
    case "validation-error":
      return { status: "validation-error", message: result.message };
    case "error":
      return { status: "error", message: result.message };
    case "not-found":
      return { status: "not-found" };
  }
}
