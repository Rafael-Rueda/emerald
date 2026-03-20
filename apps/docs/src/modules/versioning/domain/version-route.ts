import type { Version } from "@emerald/contracts";

/**
 * Build the API path for fetching version metadata by docs space.
 */
export function buildVersionsApiPath(space: string): string {
  return `/api/versions/${space}`;
}

/**
 * Build a docs route path for a target version while keeping space/slug.
 */
export function buildVersionRoutePath(
  space: string,
  version: string,
  slug: string,
): string {
  return `/${space}/${version}/${slug}`;
}

/**
 * Resolve the active version metadata entry by route version slug.
 */
export function findActiveVersion(
  versions: Version[],
  activeVersionSlug: string,
): Version | undefined {
  return versions.find((version) => version.slug === activeVersionSlug);
}
