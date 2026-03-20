/**
 * Document identity — canonical route-based identity for a public document.
 *
 * Represents the three route segments that uniquely identify a document
 * in the public docs surface: space, version, and slug.
 */

/** Canonical route-based document identity. */
export interface DocumentIdentity {
  space: string;
  version: string;
  slug: string;
}

/**
 * Build a DocumentIdentity from route parameters.
 * Normalizes and validates the route segments.
 */
export function buildDocumentIdentity(
  space: string,
  version: string,
  slug: string,
): DocumentIdentity {
  return {
    space: space.trim().toLowerCase(),
    version: version.trim().toLowerCase(),
    slug: slug.trim().toLowerCase(),
  };
}

/**
 * Build the API path for fetching a document by its identity.
 */
export function buildDocumentApiPath(identity: DocumentIdentity): string {
  return `/api/docs/${identity.space}/${identity.version}/${identity.slug}`;
}

/**
 * Check whether a document identity has valid non-empty segments.
 */
export function isValidDocumentIdentity(
  identity: DocumentIdentity,
): boolean {
  return (
    identity.space.length > 0 &&
    identity.version.length > 0 &&
    identity.slug.length > 0
  );
}
