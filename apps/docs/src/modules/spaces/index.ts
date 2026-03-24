/**
 * Spaces module — public interface.
 */

// Application
export {
  useSpaces,
  spacesQueryKey,
  type SpacesViewState,
} from "./application/use-spaces";

// Infrastructure
export {
  fetchSpaces,
  type SpacesFetchResult,
} from "./infrastructure/space-api";

// Presentation
export { SpaceSelector } from "./presentation/space-selector";
