import { describe, it, expect } from "vitest";
import type { SearchResult } from "@emerald/contracts";
import {
  buildRouteContext,
  buildSearchResultPath,
  mapSearchResultToDisplay,
  mapSearchResults,
} from "./search-result-mapping";

describe("buildRouteContext", () => {
  it("combines space and version with separator", () => {
    expect(buildRouteContext("guides", "v1")).toBe("guides / v1");
  });

  it("handles different space/version values", () => {
    expect(buildRouteContext("tutorials", "v2")).toBe("tutorials / v2");
  });
});

describe("buildSearchResultPath", () => {
  it("builds a docs route path from result identity", () => {
    const result: SearchResult = {
      id: "sr-1",
      title: "Getting Started",
      slug: "getting-started",
      space: "guides",
      version: "v1",
      snippet: "Install Emerald.",
    };
    expect(buildSearchResultPath(result)).toBe("/guides/v1/getting-started");
  });
});

describe("mapSearchResultToDisplay", () => {
  it("maps a search result to a display model with route context", () => {
    const result: SearchResult = {
      id: "sr-1",
      title: "Getting Started",
      slug: "getting-started",
      space: "guides",
      version: "v1",
      snippet: "Install Emerald.",
    };

    const display = mapSearchResultToDisplay(result);

    expect(display.id).toBe("sr-1");
    expect(display.title).toBe("Getting Started");
    expect(display.snippet).toBe("Install Emerald.");
    expect(display.routeContext).toBe("guides / v1");
    expect(display.routePath).toBe("/guides/v1/getting-started");
    expect(display.space).toBe("guides");
    expect(display.version).toBe("v1");
    expect(display.slug).toBe("getting-started");
  });
});

describe("mapSearchResults", () => {
  it("maps an array of results preserving order", () => {
    const results: SearchResult[] = [
      {
        id: "sr-1",
        title: "Getting Started",
        slug: "getting-started",
        space: "guides",
        version: "v1",
        snippet: "Install Emerald.",
      },
      {
        id: "sr-2",
        title: "Getting Started",
        slug: "getting-started",
        space: "guides",
        version: "v2",
        snippet: "Updated quick start.",
      },
    ];

    const displays = mapSearchResults(results);

    expect(displays).toHaveLength(2);
    expect(displays[0].routeContext).toBe("guides / v1");
    expect(displays[1].routeContext).toBe("guides / v2");
    // Same title, different route context — disambiguation works
    expect(displays[0].title).toBe(displays[1].title);
    expect(displays[0].routeContext).not.toBe(displays[1].routeContext);
  });

  it("returns empty array for empty input", () => {
    expect(mapSearchResults([])).toEqual([]);
  });
});
