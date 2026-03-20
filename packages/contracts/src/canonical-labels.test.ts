import { describe, expect, it } from "vitest";
import {
  buildCanonicalChunkLabel,
  buildCanonicalDocumentTitleLabel,
  buildCanonicalNavigationLabel,
  buildCanonicalPathLabel,
  buildCanonicalSectionLabel,
  buildCanonicalVersionLabel,
  mapAiChunkToCanonicalProvenance,
} from "./canonical-labels";

describe("canonical labels", () => {
  it("formats canonical labels deterministically", () => {
    expect(buildCanonicalDocumentTitleLabel("Getting Started")).toBe("Getting Started");
    expect(buildCanonicalVersionLabel("v1")).toBe("v1");
    expect(buildCanonicalNavigationLabel("Getting Started")).toBe(
      "Getting Started",
    );
    expect(
      buildCanonicalPathLabel({
        space: "guides",
        slug: "getting-started",
      }),
    ).toBe("guides/getting-started");
    expect(
      buildCanonicalSectionLabel({
        sectionId: "installation",
        sectionTitle: "Installation",
      }),
    ).toBe("Installation (installation)");
    expect(buildCanonicalChunkLabel("chunk-installation")).toBe(
      "chunk-installation",
    );
  });

  it("maps AI provenance into the canonical public entity chain", () => {
    const provenance = mapAiChunkToCanonicalProvenance({
      id: "chunk-installation",
      source: {
        documentId: "doc-getting-started",
        documentTitle: "Getting Started",
        versionId: "ver-v1",
        versionLabel: "v1",
        navigationLabel: "Getting Started",
        sectionId: "installation",
        sectionTitle: "Installation",
        slug: "getting-started",
        space: "guides",
      },
    });

    expect(provenance.documentLabel).toBe("Getting Started");
    expect(provenance.versionLabel).toBe("v1");
    expect(provenance.pathLabel).toBe("guides/getting-started");
    expect(provenance.navigationLabel).toBe("Getting Started");
    expect(provenance.sectionLabel).toBe("Installation (installation)");
    expect(provenance.chunkLabel).toBe("chunk-installation");
  });
});
