/**
 * Default document context resolution.
 *
 * Determines the canonical default docs route from version metadata
 * and navigation fixtures. The default entry point is the first
 * navigation item of the default version in the given space.
 */

import type { Version, NavigationItem } from "@emerald/contracts";

/** Canonical route segments for a public document. */
export interface DefaultDocumentContext {
  space: string;
  version: string;
  slug: string;
}

/**
 * Resolve the default version from a list of versions.
 * Returns the version marked as `isDefault`, or the first published version,
 * or the first version in the list as a fallback.
 */
export function resolveDefaultVersion(
  versions: Version[],
): Version | undefined {
  return (
    versions.find((v) => v.isDefault) ??
    versions.find((v) => v.status === "published") ??
    versions[0]
  );
}

/**
 * Resolve the first navigable slug from a navigation item list.
 * Recursively picks the first item with a slug.
 */
export function resolveFirstSlug(
  items: NavigationItem[],
): string | undefined {
  for (const item of items) {
    if (item.slug) return item.slug;
    if (item.children.length > 0) {
      const childSlug = resolveFirstSlug(item.children);
      if (childSlug) return childSlug;
    }
  }
  return undefined;
}

/**
 * Build the canonical default document context from space, version metadata,
 * and navigation items.
 */
export function buildDefaultDocumentContext(
  space: string,
  versions: Version[],
  navigationItems: NavigationItem[],
): DefaultDocumentContext | undefined {
  const defaultVersion = resolveDefaultVersion(versions);
  if (!defaultVersion) return undefined;

  const slug = resolveFirstSlug(navigationItems);
  if (!slug) return undefined;

  return {
    space,
    version: defaultVersion.slug,
    slug,
  };
}

/**
 * Build the canonical URL path from a document context.
 */
export function buildCanonicalPath(ctx: DefaultDocumentContext): string {
  return `/${ctx.space}/${ctx.version}/${ctx.slug}`;
}
