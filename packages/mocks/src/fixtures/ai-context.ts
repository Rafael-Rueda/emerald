import type {
  AiContextChunk,
  AiContextResponse,
  AiSourceReference,
} from "@emerald/contracts";

/**
 * Canonical AI context fixtures.
 */

export const sourceRefGettingStarted: AiSourceReference = {
  documentId: "doc-getting-started",
  documentTitle: "Getting Started",
  versionId: "ver-v1",
  versionLabel: "v1",
  sectionId: "installation",
  sectionTitle: "Installation",
  slug: "getting-started",
  space: "guides",
};

export const sourceRefApiReference: AiSourceReference = {
  documentId: "doc-api-reference",
  documentTitle: "API Reference",
  versionId: "ver-v1",
  versionLabel: "v1",
  sectionId: "root",
  sectionTitle: "API Reference",
  slug: "api-reference",
  space: "guides",
};

export const aiChunkInstallation: AiContextChunk = {
  id: "chunk-installation",
  content: "Follow these steps to install Emerald.",
  relevanceScore: 0.95,
  source: sourceRefGettingStarted,
};

export const aiChunkApiOverview: AiContextChunk = {
  id: "chunk-api-overview",
  content:
    "This document contains the API reference for the Emerald platform.",
  relevanceScore: 0.82,
  source: sourceRefApiReference,
};

export function buildAiContextResponse(
  entityId: string,
  entityType: string,
  chunks: AiContextChunk[] = [aiChunkInstallation, aiChunkApiOverview],
): AiContextResponse {
  return { entityId, entityType, chunks };
}
