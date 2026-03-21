/**
 * Version metadata API client — infrastructure layer.
 *
 * Fetches version metadata from the public API endpoint (or MSW fallback)
 * and validates the response with Zod at the boundary.
 */

import {
  VersionListResponseSchema,
  type VersionListResponse,
} from "@emerald/contracts";
import { z } from "zod";
import { buildVersionsApiPath } from "../domain/version-route";

/** Result type for version metadata fetch operations. */
export type VersionsFetchResult =
  | { status: "success"; data: VersionListResponse }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

const PublicVersionSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  status: z.enum(["published", "draft", "archived"]),
  isDefault: z.boolean(),
  createdAt: z.string(),
});

const PublicVersionsResponseSchema = z.object({
  space: z.string(),
  versions: z.array(PublicVersionSchema),
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

function resolveVersionsRequest(space: string): {
  requestUrl: string;
  usesPublicApi: boolean;
} {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiBaseUrl || shouldUseMswFallback()) {
    return {
      requestUrl: buildVersionsApiPath(space),
      usesPublicApi: false,
    };
  }

  const path = `/api/public/spaces/${encodeURIComponent(space)}/versions`;
  return {
    requestUrl: `${apiBaseUrl}${path}`,
    usesPublicApi: true,
  };
}

function normalizeVersionsResponse(
  payload: unknown,
  usesPublicApi: boolean,
): VersionsFetchResult {
  if (!usesPublicApi) {
    const parsed = VersionListResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: "validation-error",
        message: `Invalid version metadata response: ${parsed.error.message}`,
      };
    }

    return { status: "success", data: parsed.data };
  }

  const parsedPublic = PublicVersionsResponseSchema.safeParse(payload);
  if (!parsedPublic.success) {
    return {
      status: "validation-error",
      message: `Invalid version metadata response: ${parsedPublic.error.message}`,
    };
  }

  const adapted = {
    space: parsedPublic.data.space,
    versions: parsedPublic.data.versions.map((version) => ({
      id: version.id,
      label: version.label,
      slug: version.key,
      status: version.status,
      isDefault: version.isDefault,
      createdAt: version.createdAt,
    })),
  };

  const parsed = VersionListResponseSchema.safeParse(adapted);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid version metadata response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

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
  const { requestUrl, usesPublicApi } = resolveVersionsRequest(space);

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

  return normalizeVersionsResponse(json, usesPublicApi);
}
