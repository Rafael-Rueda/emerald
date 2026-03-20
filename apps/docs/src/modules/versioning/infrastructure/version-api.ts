/**
 * Version metadata API client — infrastructure layer.
 *
 * Fetches version metadata from the MSW-backed API endpoint
 * and validates the response with Zod at the boundary.
 */

import {
  VersionListResponseSchema,
  type VersionListResponse,
} from "@emerald/contracts";
import { buildVersionsApiPath } from "../domain/version-route";

/** Result type for version metadata fetch operations. */
export type VersionsFetchResult =
  | { status: "success"; data: VersionListResponse }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

/**
 * Fetch version metadata by docs space from the API.
 *
 * - On success (200 + valid schema): returns validated response.
 * - On 404: returns a not-found result.
 * - On other HTTP errors: returns an error result.
 * - On schema validation failure: returns a validation-error result
 *   so malformed payloads are never rendered as trusted content.
 */
export async function fetchVersions(space: string): Promise<VersionsFetchResult> {
  const path = buildVersionsApiPath(space);

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

  const parsed = VersionListResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid version metadata response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}
