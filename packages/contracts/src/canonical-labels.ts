import type { AiContextChunk } from "./ai-context";

export interface CanonicalPathIdentity {
  space: string;
  slug: string;
}

export interface CanonicalSectionIdentity {
  sectionId: string;
  sectionTitle: string;
}

export interface CanonicalAiProvenance {
  documentLabel: string;
  versionLabel: string;
  pathLabel: string;
  navigationLabel: string;
  sectionLabel: string;
  chunkLabel: string;
}

export function buildCanonicalDocumentTitleLabel(value: string): string {
  return value;
}

export function buildCanonicalVersionLabel(value: string): string {
  return value;
}

export function buildCanonicalNavigationLabel(value: string): string {
  return value;
}

export function buildCanonicalPathLabel(identity: CanonicalPathIdentity): string {
  return `${identity.space}/${identity.slug}`;
}

export function buildCanonicalSectionLabel(identity: CanonicalSectionIdentity): string {
  return `${identity.sectionTitle} (${identity.sectionId})`;
}

export function buildCanonicalChunkLabel(chunkId: string): string {
  return chunkId;
}

export function mapAiChunkToCanonicalProvenance(
  chunk: Pick<AiContextChunk, "id" | "source">,
): CanonicalAiProvenance {
  return {
    documentLabel: buildCanonicalDocumentTitleLabel(chunk.source.documentTitle),
    versionLabel: buildCanonicalVersionLabel(chunk.source.versionLabel),
    pathLabel: buildCanonicalPathLabel({
      space: chunk.source.space,
      slug: chunk.source.slug,
    }),
    navigationLabel: buildCanonicalNavigationLabel(chunk.source.navigationLabel),
    sectionLabel: buildCanonicalSectionLabel({
      sectionId: chunk.source.sectionId,
      sectionTitle: chunk.source.sectionTitle,
    }),
    chunkLabel: buildCanonicalChunkLabel(chunk.id),
  };
}
