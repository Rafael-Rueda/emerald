import type {
  NavigationItem,
  NavigationTree,
  NavigationResponse,
} from "@emerald/contracts";

/**
 * Canonical navigation fixtures.
 */

export const navGettingStarted: NavigationItem = {
  id: "nav-getting-started",
  label: "Getting Started",
  slug: "getting-started",
  children: [],
};

export const navApiReference: NavigationItem = {
  id: "nav-api-reference",
  label: "API Reference",
  slug: "api-reference",
  children: [],
};

export const navigationTreeGuidesV1: NavigationTree = {
  space: "guides",
  version: "v1",
  items: [navGettingStarted, navApiReference],
};

export const navigationTreeGuidesV2: NavigationTree = {
  space: "guides",
  version: "v2",
  items: [
    { ...navGettingStarted, id: "nav-getting-started-v2" },
    { ...navApiReference, id: "nav-api-reference-v2" },
  ],
};

export const allNavigationTrees: NavigationTree[] = [
  navigationTreeGuidesV1,
  navigationTreeGuidesV2,
];

export function buildNavigationResponse(
  tree: NavigationTree,
): NavigationResponse {
  return { navigation: tree };
}

export function findNavigationTree(
  space: string,
  version: string,
): NavigationTree | undefined {
  return allNavigationTrees.find(
    (t) => t.space === space && t.version === version,
  );
}
