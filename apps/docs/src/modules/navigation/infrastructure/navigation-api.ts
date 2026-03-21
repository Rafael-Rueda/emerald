/**
 * Navigation API client — infrastructure layer.
 *
 * Fetches navigation tree data from the public API endpoint (or MSW fallback)
 * and validates the response with Zod at the boundary.
 */

import {
  NavigationResponseSchema,
  type NavigationResponse,
} from "@emerald/contracts";
import { z } from "zod";
import { buildNavigationApiPath } from "../domain/navigation-context";

/** Result type for navigation fetch operations. */
export type NavigationFetchResult =
  | { status: "success"; data: NavigationResponse }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

interface PublicNavigationItem {
  id: string;
  label: string;
  slug: string;
  children: PublicNavigationItem[];
}

const PublicNavigationItemSchema: z.ZodType<PublicNavigationItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    slug: z.string(),
    children: z.array(PublicNavigationItemSchema),
  }).passthrough(),
);

const PublicNavigationResponseSchema = z.object({
  space: z.string(),
  version: z.string(),
  items: z.array(PublicNavigationItemSchema),
});

function shouldUseMswFallback(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
      .__EMERALD_USE_MSW_FALLBACK__,
  );
}

function resolveNavigationRequest(space: string, version: string): {
  requestUrl: string;
  usesPublicApi: boolean;
} {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiBaseUrl || shouldUseMswFallback()) {
    return {
      requestUrl: buildNavigationApiPath(space, version),
      usesPublicApi: false,
    };
  }

  const path = `/api/public/spaces/${encodeURIComponent(space)}/versions/${encodeURIComponent(version)}/navigation`;
  return {
    requestUrl: `${apiBaseUrl}${path}`,
    usesPublicApi: true,
  };
}

function toNavigationItem(
  item: z.infer<typeof PublicNavigationItemSchema>,
): NavigationResponse["navigation"]["items"][number] {
  return {
    id: item.id,
    label: item.label,
    slug: item.slug,
    children: item.children.map(toNavigationItem),
  };
}

function normalizeNavigationResponse(
  payload: unknown,
  usesPublicApi: boolean,
): NavigationFetchResult {
  if (!usesPublicApi) {
    const parsed = NavigationResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: "validation-error",
        message: `Invalid navigation response: ${parsed.error.message}`,
      };
    }

    return { status: "success", data: parsed.data };
  }

  const parsedPublic = PublicNavigationResponseSchema.safeParse(payload);
  if (!parsedPublic.success) {
    return {
      status: "validation-error",
      message: `Invalid navigation response: ${parsedPublic.error.message}`,
    };
  }

  const adapted = {
    navigation: {
      space: parsedPublic.data.space,
      version: parsedPublic.data.version,
      items: parsedPublic.data.items.map(toNavigationItem),
    },
  };

  const parsed = NavigationResponseSchema.safeParse(adapted);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid navigation response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

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
  const { requestUrl, usesPublicApi } = resolveNavigationRequest(space, version);

  let response: Response;
  try {
    response = await fetch(requestUrl);
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

  return normalizeNavigationResponse(json, usesPublicApi);
}
