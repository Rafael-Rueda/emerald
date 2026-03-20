import { describe, it, expect } from "vitest";
import {
  DocumentSchema,
  DocumentResponseSchema,
  NavigationTreeSchema,
  NavigationResponseSchema,
  VersionListResponseSchema,
  SearchResponseSchema,
  AiContextResponseSchema,
  WorkspaceDocumentListSchema,
  WorkspaceNavigationListSchema,
  WorkspaceVersionListSchema,
  MutationResultSchema,
  buildCanonicalPathLabel,
  mapAiChunkToCanonicalProvenance,
} from "@emerald/contracts";
import {
  documentGettingStarted,
  documentApiReference,
  documentGettingStartedV2,
  allDocuments,
  findDocument,
  buildDocumentResponse,
} from "./documents";
import {
  navigationTreeGuidesV1,
  navigationTreeGuidesV2,
  navGettingStarted,
  navApiReference,
  allNavigationTrees,
  findNavigationTree,
  buildNavigationResponse,
} from "./navigation";
import {
  versionV1,
  versionV2,
  guidesVersions,
  buildVersionListResponse,
} from "./versions";
import {
  defaultSearchResults,
  buildSearchResponse,
} from "./search";
import {
  aiChunkInstallation,
  sourceRefGettingStarted,
  sourceRefApiReference,
  buildAiContextResponse,
} from "./ai-context";
import {
  wsDocGettingStarted,
  wsDocApiReference,
  wsDocumentList,
  wsNavigationList,
  wsVersionV1,
  wsVersionV2,
  wsVersionList,
  mutationSuccess,
  mutationFailure,
} from "./workspace";

describe("Fixtures: Documents", () => {
  it("all document fixtures are schema-valid", () => {
    for (const doc of allDocuments) {
      expect(DocumentSchema.parse(doc)).toEqual(doc);
    }
  });

  it("provides at least 2 documents for distinguishable test data", () => {
    expect(allDocuments.length).toBeGreaterThanOrEqual(2);
  });

  it("provides documents across at least 2 versions", () => {
    const versions = new Set(allDocuments.map((d) => d.version));
    expect(versions.size).toBeGreaterThanOrEqual(2);
  });

  it("findDocument resolves the right document by space/version/slug", () => {
    expect(findDocument("guides", "v1", "getting-started")).toBe(
      documentGettingStarted,
    );
    expect(findDocument("guides", "v1", "api-reference")).toBe(
      documentApiReference,
    );
    expect(findDocument("guides", "v2", "getting-started")).toBe(
      documentGettingStartedV2,
    );
  });

  it("findDocument returns undefined for non-existent documents", () => {
    expect(findDocument("guides", "v1", "nonexistent")).toBeUndefined();
    expect(findDocument("other-space", "v1", "getting-started")).toBeUndefined();
  });

  it("buildDocumentResponse produces schema-valid output", () => {
    const resp = buildDocumentResponse(documentGettingStarted);
    expect(DocumentResponseSchema.parse(resp)).toEqual(resp);
  });

  it("includes a document with headings and a document without headings", () => {
    const withHeadings = allDocuments.filter((d) => d.headings.length > 0);
    const withoutHeadings = allDocuments.filter((d) => d.headings.length === 0);
    expect(withHeadings.length).toBeGreaterThan(0);
    expect(withoutHeadings.length).toBeGreaterThan(0);
  });
});

describe("Fixtures: Navigation", () => {
  it("all navigation tree fixtures are schema-valid", () => {
    for (const tree of allNavigationTrees) {
      expect(NavigationTreeSchema.parse(tree)).toEqual(tree);
    }
  });

  it("findNavigationTree resolves the right tree", () => {
    expect(findNavigationTree("guides", "v1")).toBe(navigationTreeGuidesV1);
    expect(findNavigationTree("guides", "v2")).toBe(navigationTreeGuidesV2);
  });

  it("findNavigationTree returns undefined for unknown space/version", () => {
    expect(findNavigationTree("guides", "v99")).toBeUndefined();
  });

  it("buildNavigationResponse produces schema-valid output", () => {
    const resp = buildNavigationResponse(navigationTreeGuidesV1);
    expect(NavigationResponseSchema.parse(resp)).toEqual(resp);
  });
});

describe("Fixtures: Versions", () => {
  it("version list fixture is schema-valid", () => {
    expect(VersionListResponseSchema.parse(guidesVersions)).toEqual(
      guidesVersions,
    );
  });

  it("buildVersionListResponse resolves for known space", () => {
    expect(buildVersionListResponse("guides")).toEqual(guidesVersions);
  });

  it("buildVersionListResponse returns undefined for unknown space", () => {
    expect(buildVersionListResponse("unknown")).toBeUndefined();
  });

  it("includes at least one default version", () => {
    const defaultVers = guidesVersions.versions.filter((v) => v.isDefault);
    expect(defaultVers.length).toBeGreaterThan(0);
  });
});

describe("Fixtures: Search", () => {
  it("default search results are schema-valid", () => {
    const resp = buildSearchResponse("test", defaultSearchResults);
    expect(SearchResponseSchema.parse(resp)).toEqual(resp);
  });

  it("buildSearchResponse with empty results is valid", () => {
    const resp = buildSearchResponse("nomatch", []);
    expect(SearchResponseSchema.parse(resp)).toEqual(resp);
    expect(resp.totalCount).toBe(0);
  });

  it("search results include space/version context for disambiguation", () => {
    for (const result of defaultSearchResults) {
      expect(result.space).toBeTruthy();
      expect(result.version).toBeTruthy();
    }
  });
});

describe("Fixtures: AI Context", () => {
  it("AI context response is schema-valid", () => {
    const resp = buildAiContextResponse("doc-1", "document");
    expect(AiContextResponseSchema.parse(resp)).toEqual(resp);
  });

  it("AI context with empty chunks is valid", () => {
    const resp = buildAiContextResponse("doc-1", "document", []);
    expect(AiContextResponseSchema.parse(resp)).toEqual(resp);
    expect(resp.chunks).toHaveLength(0);
  });

  it("source references have all provenance fields", () => {
    for (const ref of [sourceRefGettingStarted, sourceRefApiReference]) {
      expect(ref.documentId).toBeTruthy();
      expect(ref.documentTitle).toBeTruthy();
      expect(ref.versionId).toBeTruthy();
      expect(ref.versionLabel).toBeTruthy();
      expect(ref.navigationLabel).toBeTruthy();
      expect(ref.sectionId).toBeTruthy();
      expect(ref.sectionTitle).toBeTruthy();
      expect(ref.slug).toBeTruthy();
      expect(ref.space).toBeTruthy();
    }
  });

  it("AI provenance maps back to canonical labels used by public docs", () => {
    const canonical = mapAiChunkToCanonicalProvenance(aiChunkInstallation);

    expect(canonical.documentLabel).toBe(documentGettingStarted.title);
    expect(canonical.versionLabel).toBe(versionV1.label);
    expect(canonical.navigationLabel).toBe(navGettingStarted.label);
    expect(canonical.pathLabel).toBe(
      buildCanonicalPathLabel({
        space: documentGettingStarted.space,
        slug: documentGettingStarted.slug,
      }),
    );
    expect(canonical.sectionLabel).toBe("Installation (installation)");
    expect(canonical.chunkLabel).toBe("chunk-installation");
  });
});

describe("Fixtures: Workspace", () => {
  it("workspace document list is schema-valid", () => {
    expect(WorkspaceDocumentListSchema.parse(wsDocumentList)).toEqual(
      wsDocumentList,
    );
  });

  it("workspace navigation list is schema-valid", () => {
    expect(WorkspaceNavigationListSchema.parse(wsNavigationList)).toEqual(
      wsNavigationList,
    );
  });

  it("workspace version list is schema-valid", () => {
    expect(WorkspaceVersionListSchema.parse(wsVersionList)).toEqual(
      wsVersionList,
    );
  });

  it("workspace documents have at least 2 distinguishable items", () => {
    expect(wsDocumentList.documents.length).toBeGreaterThanOrEqual(2);
    const ids = wsDocumentList.documents.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mutation results are schema-valid", () => {
    expect(MutationResultSchema.parse(mutationSuccess)).toEqual(
      mutationSuccess,
    );
    expect(MutationResultSchema.parse(mutationFailure)).toEqual(
      mutationFailure,
    );
  });

  it("workspace labels match public fixture labels for the same entities", () => {
    // VAL-CROSS-006: canonical label parity
    expect(wsDocGettingStarted.title).toBe(documentGettingStarted.title);
    expect(wsDocGettingStarted.slug).toBe(documentGettingStarted.slug);
    expect(wsDocApiReference.title).toBe(documentApiReference.title);
    expect(wsDocApiReference.slug).toBe(documentApiReference.slug);
    expect(wsNavigationList.items[0].label).toBe(navGettingStarted.label);
    expect(wsNavigationList.items[1].label).toBe(navApiReference.label);
    expect(wsVersionV1.label).toBe(versionV1.label);
    expect(wsVersionV2.label).toBe(versionV2.label);
    expect(
      buildCanonicalPathLabel({
        space: wsDocGettingStarted.space,
        slug: wsDocGettingStarted.slug,
      }),
    ).toBe(
      buildCanonicalPathLabel({
        space: documentGettingStarted.space,
        slug: documentGettingStarted.slug,
      }),
    );
  });
});
