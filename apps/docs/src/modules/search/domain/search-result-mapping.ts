/**
 * Search result mapping — domain layer.
 *
 * Maps search results to route-disambiguating display models and
 * provides navigation targets for result selection.
 */

import type { SearchResult } from "@emerald/contracts";

/** A search result enriched with route context for disambiguation. */
export interface SearchResultDisplay {
  id: string;
  title: string;
  snippet: string;
  /** Route context label showing space/version for disambiguation */
  routeContext: string;
  /** The full route path for navigation */
  routePath: string;
  /** Individual route segments */
  space: string;
  version: string;
  slug: string;
}

/**
 * Build the route context label that disambiguates similarly named docs
 * across spaces or versions.
 *
 * Example: "guides / v1" or "tutorials / v2"
 */
export function buildRouteContext(space: string, version: string): string {
  return `${space} / ${version}`;
}

/**
 * Build the docs route path from search result identity.
 */
export function buildSearchResultPath(result: SearchResult): string {
  return `/${result.space}/${result.version}/${result.slug}`;
}

/**
 * Map a contract-valid SearchResult to a display model
 * with route-disambiguating context.
 */
export function mapSearchResultToDisplay(
  result: SearchResult,
): SearchResultDisplay {
  return {
    id: result.id,
    title: result.title,
    snippet: result.snippet,
    routeContext: buildRouteContext(result.space, result.version),
    routePath: buildSearchResultPath(result),
    space: result.space,
    version: result.version,
    slug: result.slug,
  };
}

/**
 * Map an array of contract-valid search results to display models.
 */
export function mapSearchResults(
  results: SearchResult[],
): SearchResultDisplay[] {
  return results.map(mapSearchResultToDisplay);
}
