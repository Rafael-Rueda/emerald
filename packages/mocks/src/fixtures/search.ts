import type { SearchResult, SearchResponse } from "@emerald/contracts";

/**
 * Canonical search fixtures.
 */

export const searchResultGettingStarted: SearchResult = {
  id: "sr-getting-started",
  title: "Getting Started",
  slug: "getting-started",
  space: "guides",
  version: "v1",
  snippet: "Follow these steps to install Emerald.",
};

export const searchResultApiReference: SearchResult = {
  id: "sr-api-reference",
  title: "API Reference",
  slug: "api-reference",
  space: "guides",
  version: "v1",
  snippet: "This document contains the API reference for the Emerald platform.",
};

export const searchResultGettingStartedV2: SearchResult = {
  id: "sr-getting-started-v2",
  title: "Getting Started",
  slug: "getting-started",
  space: "guides",
  version: "v2",
  snippet: "Updated quick start guide for v2.",
};

export function buildSearchResponse(
  query: string,
  results: SearchResult[] = [],
): SearchResponse {
  return {
    query,
    results,
    totalCount: results.length,
  };
}

export const defaultSearchResults: SearchResult[] = [
  searchResultGettingStarted,
  searchResultApiReference,
  searchResultGettingStartedV2,
];
