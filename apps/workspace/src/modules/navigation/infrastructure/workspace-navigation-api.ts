import {
  MutationResultSchema,
  WorkspaceNavigationListSchema,
  WorkspaceNavigationSchema,
  type MutationResult,
  type WorkspaceNavigation,
  type WorkspaceNavigationList,
} from "@emerald/contracts";

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

async function parseMutationResult(
  response: Response,
): Promise<
  | { status: "success"; data: MutationResult }
  | { status: "validation-error"; message: string }
> {
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      status: "validation-error",
      message: "Failed to parse response as JSON",
    };
  }

  const parsed = MutationResultSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace mutation response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

export async function fetchWorkspaceNavigationList(): Promise<WorkspaceNavigationListFetchResult> {
  let response: Response;

  try {
    response = await fetch("/api/workspace/navigation");
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

  const parsed = WorkspaceNavigationListSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace navigation list response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

export async function fetchWorkspaceNavigationDetail(
  navigationId: string,
): Promise<WorkspaceNavigationDetailFetchResult> {
  let response: Response;

  try {
    response = await fetch(`/api/workspace/navigation/${encodeURIComponent(navigationId)}`);
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

  const parsed = WorkspaceNavigationSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid workspace navigation detail response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

export async function reorderWorkspaceNavigation(
  navigationId: string,
): Promise<WorkspaceNavigationReorderResult> {
  let response: Response;

  try {
    response = await fetch(
      `/api/workspace/navigation/${encodeURIComponent(navigationId)}/reorder`,
      {
        method: "POST",
      },
    );
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  const parsedResult = await parseMutationResult(response);

  if (!response.ok) {
    if (parsedResult.status === "success") {
      return {
        status: "error",
        message: parsedResult.data.message,
      };
    }

    return {
      status: "error",
      message: `Request failed with status ${response.status}`,
    };
  }

  if (parsedResult.status === "validation-error") {
    return parsedResult;
  }

  if (!parsedResult.data.success) {
    return {
      status: "error",
      message: parsedResult.data.message,
    };
  }

  return parsedResult;
}
