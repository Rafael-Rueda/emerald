/**
 * Documentation module — public interface.
 */

// Domain: default document context
export {
  type DefaultDocumentContext,
  DEFAULT_SPACE,
  resolveDefaultVersion,
  resolveFirstSlug,
  buildDefaultDocumentContext,
  buildCanonicalPath,
} from "./domain/default-document-context";

// Domain: document identity
export {
  type DocumentIdentity,
  buildDocumentIdentity,
  buildDocumentApiPath,
  isValidDocumentIdentity,
} from "./domain/document-identity";

// Application: document query hook
export {
  useDocument,
  documentQueryKey,
  type DocumentViewState,
} from "./application/use-document";

// Infrastructure: document API client
export {
  fetchDocument,
  type DocumentFetchResult,
} from "./infrastructure/document-api";

// Presentation: document view components
export { DocumentView } from "./presentation/document-view";
export { DocumentContent } from "./presentation/document-content";
export { DocumentLoading } from "./presentation/document-loading";
export { DocumentUnavailable } from "./presentation/document-unavailable";
export { DocumentError } from "./presentation/document-error";
