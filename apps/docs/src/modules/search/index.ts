/**
 * Search module — public interface.
 */

// Domain
export {
  type SearchResultDisplay,
  buildRouteContext,
  buildSearchResultPath,
  mapSearchResultToDisplay,
  mapSearchResults,
} from "./domain/search-result-mapping";

// Application
export {
  useSearch,
  searchQueryKey,
  type SearchViewState,
} from "./application/use-search";

// Infrastructure
export {
  fetchSearch,
  buildSearchApiPath,
  type SearchFetchResult,
} from "./infrastructure/search-api";

// Presentation
export { SearchPanel } from "./presentation/search-panel";
