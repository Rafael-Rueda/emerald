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

export interface DocumentChunkStats {
  documentId: string;
  chunkCount: number;
  lastEmbeddedAt: string | null;
}

export type WorkspaceAiContextStatsFetchResult =
  | { status: "success"; data: DocumentChunkStats[] }
  | { status: "error"; message: string };

export type WorkspaceAiContextRegenerateResult =
  | { status: "success"; data: { success: boolean; documentId: string } }
  | { status: "error"; message: string };

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

export async function fetchWorkspaceAiContextStats(
  spaceId: string,
): Promise<WorkspaceAiContextStatsFetchResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const url = `${apiUrl}/api/workspace/ai-context/stats?spaceId=${encodeURIComponent(spaceId)}`;

  try {
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      return { status: "error", message: `Request failed with status ${response.status}` };
    }

    const data = await response.json();
    return { status: "success", data };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function regenerateWorkspaceAiContextEmbeddings(
  documentId: string,
): Promise<WorkspaceAiContextRegenerateResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const url = `${apiUrl}/api/workspace/ai-context/regenerate/${encodeURIComponent(documentId)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return { status: "error", message: `Request failed with status ${response.status}` };
    }

    const data = await response.json();
    return { status: "success", data };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
