/**
 * Document API client — infrastructure layer.
 *
 * Fetches document data from the MSW-backed API endpoint
 * and validates the response with Zod at the boundary.
 */

import { DocumentResponseSchema, type DocumentResponse } from "@emerald/contracts";
import type { DocumentIdentity } from "../domain/document-identity";
import { buildDocumentApiPath } from "../domain/document-identity";

/** Result type for document fetch operations. */
export type DocumentFetchResult =
  | { status: "success"; data: DocumentResponse }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

/**
 * Fetch a document by its identity from the API.
 *
 * - On success (200 + valid schema): returns the validated document response.
 * - On 404: returns a not-found result.
 * - On other HTTP errors: returns an error result.
 * - On schema validation failure: returns a validation-error result
 *   so malformed payloads are never rendered as trusted content.
 */
export async function fetchDocument(
  identity: DocumentIdentity,
): Promise<DocumentFetchResult> {
  const path = buildDocumentApiPath(identity);

  let response: Response;
  try {
    response = await fetch(path);
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

  const parsed = DocumentResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid document response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}
