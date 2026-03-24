import { describe, it, expect } from "vitest";
import type { NavigationItem } from "@emerald/contracts";
import {
  buildNavigationApiPath,
  findNavigationItem,
  buildBreadcrumbs,
} from "./navigation-context";

const sampleItems: NavigationItem[] = [
  {
    id: "nav-getting-started",
    label: "Getting Started",
    slug: "getting-started",
    nodeType: "document",
    documentId: "doc-1",
    externalUrl: null,
    children: [],
  },
  {
    id: "nav-api-reference",
    label: "API Reference",
    slug: "api-reference",
    nodeType: "group",
    documentId: null,
    externalUrl: null,
    children: [
      {
        id: "nav-endpoints",
        label: "Endpoints",
        slug: "endpoints",
        nodeType: "document",
        documentId: "doc-2",
        externalUrl: null,
        children: [],
      },
    ],
  },
];

describe("buildNavigationApiPath", () => {
  it("builds the correct API path", () => {
    expect(buildNavigationApiPath("guides", "v1")).toBe(
      "/api/navigation/guides/v1",
    );
  });
});

describe("findNavigationItem", () => {
  it("finds a top-level item by slug", () => {
    const item = findNavigationItem(sampleItems, "getting-started");
    expect(item).toBeDefined();
    expect(item?.label).toBe("Getting Started");
  });

  it("finds a nested item by slug", () => {
    const item = findNavigationItem(sampleItems, "endpoints");
    expect(item).toBeDefined();
    expect(item?.label).toBe("Endpoints");
  });

  it("returns undefined for unknown slug", () => {
    expect(findNavigationItem(sampleItems, "nonexistent")).toBeUndefined();
  });
});

describe("buildBreadcrumbs", () => {
  it("builds breadcrumbs for a top-level item", () => {
    const crumbs = buildBreadcrumbs(
      sampleItems,
      "getting-started",
      "guides",
      "v1",
    );
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toEqual({
      label: "Getting Started",
      slug: "getting-started",
      path: "/guides/v1/getting-started",
    });
  });

  it("builds breadcrumbs for a nested item", () => {
    const crumbs = buildBreadcrumbs(sampleItems, "endpoints", "guides", "v1");
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0].label).toBe("API Reference");
    expect(crumbs[1].label).toBe("Endpoints");
    expect(crumbs[1].path).toBe("/guides/v1/endpoints");
  });

  it("returns empty array for unknown slug", () => {
    const crumbs = buildBreadcrumbs(
      sampleItems,
      "nonexistent",
      "guides",
      "v1",
    );
    expect(crumbs).toHaveLength(0);
  });
});
