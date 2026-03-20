/**
 * Navigation context — domain types and helpers for public docs navigation.
 *
 * Represents the navigation tree state, breadcrumb trail, and
 * active-item resolution for the public reading shell.
 */

import type { NavigationItem } from "@emerald/contracts";

/** Breadcrumb segment for the reading shell. */
export interface BreadcrumbItem {
  label: string;
  slug: string;
  path: string;
}

/**
 * Build the API path for fetching navigation data.
 */
export function buildNavigationApiPath(space: string, version: string): string {
  return `/api/navigation/${space}/${version}`;
}

/**
 * Find a navigation item by slug in a potentially nested tree.
 * Returns the item if found, or undefined.
 */
export function findNavigationItem(
  items: NavigationItem[],
  slug: string,
): NavigationItem | undefined {
  for (const item of items) {
    if (item.slug === slug) return item;
    if (item.children.length > 0) {
      const found = findNavigationItem(item.children, slug);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Build the breadcrumb trail for a given slug within the navigation tree.
 * Traverses the tree to find the path from root to the active item.
 */
export function buildBreadcrumbs(
  items: NavigationItem[],
  activeSlug: string,
  space: string,
  version: string,
): BreadcrumbItem[] {
  const trail: BreadcrumbItem[] = [];

  function walk(nodes: NavigationItem[], path: BreadcrumbItem[]): boolean {
    for (const node of nodes) {
      const crumb: BreadcrumbItem = {
        label: node.label,
        slug: node.slug,
        path: `/${space}/${version}/${node.slug}`,
      };
      const newPath = [...path, crumb];

      if (node.slug === activeSlug) {
        trail.push(...newPath);
        return true;
      }

      if (node.children.length > 0 && walk(node.children, newPath)) {
        return true;
      }
    }
    return false;
  }

  walk(items, []);
  return trail;
}

/**
 * Extract heading anchors from a document body's headings for TOC.
 */
export interface TocEntry {
  id: string;
  text: string;
  level: number;
}
