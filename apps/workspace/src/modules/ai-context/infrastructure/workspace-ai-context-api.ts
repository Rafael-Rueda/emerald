import {
  type AiContextResponse,
} from "@emerald/contracts";
import { createApiClient } from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);

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
  const result = await workspaceApiClient.getAiContext(
    scope.entityType,
    scope.entityId,
  );

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
