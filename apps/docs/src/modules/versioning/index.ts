/**
 * Versioning module — public interface.
 */

// Domain
export {
  buildVersionsApiPath,
  buildVersionRoutePath,
  findActiveVersion,
} from "./domain/version-route";

// Application
export {
  useVersions,
  versionsQueryKey,
  type VersionsViewState,
} from "./application/use-versions";

// Infrastructure
export {
  fetchVersions,
  type VersionsFetchResult,
} from "./infrastructure/version-api";

// Presentation
export { VersionSelector } from "./presentation/version-selector";
export { VersionError } from "./presentation/version-error";
