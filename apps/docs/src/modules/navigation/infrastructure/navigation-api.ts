/**
 * Navigation API client — infrastructure layer.
 *
 * Fetches navigation tree data from the MSW-backed API endpoint
 * and validates the response with Zod at the boundary.
 */

import {
  NavigationResponseSchema,
  type NavigationResponse,
} from "@emerald/contracts";
import { buildNavigationApiPath } from "../domain/navigation-context";

/** Result type for navigation fetch operations. */
export type NavigationFetchResult =
  | { status: "success"; data: NavigationResponse }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

/**
 * Fetch navigation tree by space and version from the API.
 *
 * - On success (200 + valid schema): returns the validated navigation response.
 * - On 404: returns a not-found result.
 * - On other HTTP errors: returns an error result.
 * - On schema validation failure: returns a validation-error result
 *   so malformed payloads are never rendered as trusted content.
 */
export async function fetchNavigation(
  space: string,
  version: string,
): Promise<NavigationFetchResult> {
  const path = buildNavigationApiPath(space, version);

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

  const parsed = NavigationResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid navigation response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}
