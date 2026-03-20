import {
  AiContextResponseSchema,
  type AiContextResponse,
} from "@emerald/contracts";

export interface AiContextScope {
  entityType: string;
  entityId: string;
}

export type WorkspaceAiContextFetchResult =
  | { status: "success"; data: AiContextResponse }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function fetchWorkspaceAiContext(
  scope: AiContextScope,
): Promise<WorkspaceAiContextFetchResult> {
  let response: Response;

  try {
    response = await fetch(
      `/api/workspace/ai-context/${encodeURIComponent(scope.entityType)}/${encodeURIComponent(scope.entityId)}`,
    );
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Network error",
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

  const parsed = AiContextResponseSchema.safeParse(json);

  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid AI context response: ${parsed.error.message}`,
    };
  }

  if (
    parsed.data.entityType !== scope.entityType ||
    parsed.data.entityId !== scope.entityId
  ) {
    return {
      status: "validation-error",
      message: "Invalid AI context response: payload scope mismatch",
    };
  }

  return {
    status: "success",
    data: parsed.data,
  };
}
