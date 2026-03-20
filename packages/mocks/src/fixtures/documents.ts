import type { Document, DocumentResponse } from "@emerald/contracts";

/**
 * Canonical document fixtures used across all test and mock surfaces.
 */

export const documentGettingStarted: Document = {
  id: "doc-getting-started",
  title: "Getting Started",
  slug: "getting-started",
  space: "guides",
  version: "v1",
  body: "<h2 id=\"installation\">Installation</h2><p>Follow these steps to install Emerald.</p><h2 id=\"configuration\">Configuration</h2><p>Configure the project by editing the config file.</p>",
  headings: [
    { id: "installation", text: "Installation", level: 2 },
    { id: "configuration", text: "Configuration", level: 2 },
  ],
  updatedAt: "2025-01-15T10:00:00Z",
};

export const documentApiReference: Document = {
  id: "doc-api-reference",
  title: "API Reference",
  slug: "api-reference",
  space: "guides",
  version: "v1",
  body: "<p>This document contains the API reference for the Emerald platform. No headings are present in this section.</p>",
  headings: [],
  updatedAt: "2025-01-20T14:30:00Z",
};

export const documentGettingStartedV2: Document = {
  id: "doc-getting-started-v2",
  title: "Getting Started",
  slug: "getting-started",
  space: "guides",
  version: "v2",
  body: "<h2 id=\"quick-start\">Quick Start</h2><p>Updated quick start guide for v2.</p><h2 id=\"migration\">Migration from v1</h2><p>Steps to migrate from v1 to v2.</p>",
  headings: [
    { id: "quick-start", text: "Quick Start", level: 2 },
    { id: "migration", text: "Migration from v1", level: 2 },
  ],
  updatedAt: "2025-06-01T09:00:00Z",
};

export const allDocuments: Document[] = [
  documentGettingStarted,
  documentApiReference,
  documentGettingStartedV2,
];

export function buildDocumentResponse(doc: Document): DocumentResponse {
  return { document: doc };
}

export function findDocument(
  space: string,
  version: string,
  slug: string,
): Document | undefined {
  return allDocuments.find(
    (d) => d.space === space && d.version === version && d.slug === slug,
  );
}
