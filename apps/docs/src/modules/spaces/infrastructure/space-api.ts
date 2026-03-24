/**
 * Space list API client — infrastructure layer.
 *
 * Fetches public spaces from the API (or MSW fallback)
 * and validates the response with Zod at the boundary.
 */

import { SpaceListResponseSchema, type SpaceListResponse } from "@emerald/contracts";
import { z } from "zod";

export type SpacesFetchResult =
  | { status: "success"; data: SpaceListResponse }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

const PublicSpacesResponseSchema = z.object({
  spaces: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
    }),
  ),
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

function resolveSpacesRequest(): {
  requestUrl: string;
  usesPublicApi: boolean;
} {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiBaseUrl || shouldUseMswFallback()) {
    return {
      requestUrl: "/api/public/spaces",
      usesPublicApi: false,
    };
  }

  return {
    requestUrl: `${apiBaseUrl}/api/public/spaces`,
    usesPublicApi: true,
  };
}

function normalizeSpacesResponse(
  payload: unknown,
  usesPublicApi: boolean,
): SpacesFetchResult {
  const schema = usesPublicApi ? PublicSpacesResponseSchema : SpaceListResponseSchema;
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid spaces response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

/**
 * Fetch the list of public spaces from the API.
 */
export async function fetchSpaces(): Promise<SpacesFetchResult> {
  const { requestUrl, usesPublicApi } = resolveSpacesRequest();

  let response: Response;
  try {
    response = await fetch(requestUrl);
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

  return normalizeSpacesResponse(json, usesPublicApi);
}
