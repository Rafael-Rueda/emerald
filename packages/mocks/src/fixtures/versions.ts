import type { Version, VersionListResponse } from "@emerald/contracts";

/**
 * Canonical version fixtures.
 */

export const versionV1: Version = {
  id: "ver-v1",
  label: "v1",
  slug: "v1",
  status: "published",
  isDefault: true,
  createdAt: "2025-01-01T00:00:00Z",
};

export const versionV2: Version = {
  id: "ver-v2",
  label: "v2",
  slug: "v2",
  status: "draft",
  isDefault: false,
  createdAt: "2025-06-01T00:00:00Z",
};

export const guidesVersions: VersionListResponse = {
  space: "guides",
  versions: [versionV1, versionV2],
};

export function buildVersionListResponse(
  space: string,
): VersionListResponse | undefined {
  if (space === "guides") return guidesVersions;
  return undefined;
}
