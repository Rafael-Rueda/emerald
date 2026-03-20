/**
 * Search API client — infrastructure layer.
 *
 * Fetches search data from the MSW-backed API endpoint
 * and validates the response with Zod at the boundary.
 */

import {
  SearchResponseSchema,
  type SearchResponse,
} from "@emerald/contracts";

/** Result type for search fetch operations. */
export type SearchFetchResult =
  | { status: "success"; data: SearchResponse }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

/**
 * Build the API path for searching documents by query.
 */
export function buildSearchApiPath(query: string): string {
  return `/api/search?q=${encodeURIComponent(query)}`;
}

/**
 * Fetch search results from the API.
 *
 * - On success (200 + valid schema): returns validated search response.
 * - On non-2xx response: returns an error result.
 * - On schema validation failure: returns a validation-error result
 *   so malformed payloads are never rendered as trusted content.
 */
export async function fetchSearch(query: string): Promise<SearchFetchResult> {
  const path = buildSearchApiPath(query);

  let response: Response;
  try {
    response = await fetch(path);
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

  const parsed = SearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid search response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}
