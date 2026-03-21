import { createApiClient } from "@emerald/data-access";

const workspaceApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL);

export type EditorImageUploadResult =
  | { status: "success"; data: { url: string } }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

export async function uploadWorkspaceEditorImageAsset(payload: {
  entityType: string;
  entityId: string;
  field: string;
  file: File;
}): Promise<EditorImageUploadResult> {
  const result = await workspaceApiClient.uploadWorkspaceStorageImage(payload);

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
