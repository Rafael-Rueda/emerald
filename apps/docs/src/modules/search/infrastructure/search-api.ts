/**
 * Search API client — infrastructure layer.
 *
 * Fetches search data from the public API endpoint (or MSW fallback)
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

function resolveSearchRequestUrl(path: string): string {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiBaseUrl || shouldUseMswFallback()) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

function shouldUseMswFallback(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
      .__EMERALD_USE_MSW_FALLBACK__,
  );
}

function buildSearchRequestPath(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (apiBaseUrl.length > 0 && !shouldUseMswFallback()) {
    return `/api/public/search?q=${encodedQuery}`;
  }

  return `/api/search?q=${encodedQuery}`;
}

/**
 * Build the API path for searching documents by query.
 */
export function buildSearchApiPath(query: string): string {
  const path = buildSearchRequestPath(query);
  return resolveSearchRequestUrl(path);
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
