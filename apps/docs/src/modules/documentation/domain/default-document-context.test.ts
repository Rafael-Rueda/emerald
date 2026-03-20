import { describe, it, expect } from "vitest";
import type { Version, NavigationItem } from "@emerald/contracts";
import {
  versionV1,
  versionV2,
  navGettingStarted,
  navApiReference,
} from "@emerald/mocks/fixtures";

import {
  resolveDefaultVersion,
  resolveFirstSlug,
  buildDefaultDocumentContext,
  buildCanonicalPath,
  MOCKED_DEFAULT_CONTEXT,
  DEFAULT_SPACE,
} from "./default-document-context";

describe("resolveDefaultVersion", () => {
  it("returns the version marked as isDefault", () => {
    const result = resolveDefaultVersion([versionV2, versionV1]);
    expect(result).toEqual(versionV1);
  });

  it("falls back to the first published version when none is default", () => {
    const noDefault: Version[] = [
      { ...versionV1, isDefault: false },
      { ...versionV2, isDefault: false, status: "published" },
    ];
    const result = resolveDefaultVersion(noDefault);
    expect(result?.slug).toBe("v1");
  });

  it("falls back to the first version when none is published or default", () => {
    const allDraft: Version[] = [
      { ...versionV1, isDefault: false, status: "draft" },
      { ...versionV2, isDefault: false, status: "draft" },
    ];
    const result = resolveDefaultVersion(allDraft);
    expect(result?.slug).toBe("v1");
  });

  it("returns undefined for an empty list", () => {
    expect(resolveDefaultVersion([])).toBeUndefined();
  });
});

describe("resolveFirstSlug", () => {
  it("returns the slug of the first item", () => {
    const items: NavigationItem[] = [navGettingStarted, navApiReference];
    expect(resolveFirstSlug(items)).toBe("getting-started");
  });

  it("recurses into children if the first item has no slug", () => {
    const parent: NavigationItem = {
      id: "parent",
      label: "Parent",
      slug: "",
      children: [navApiReference],
    };
    expect(resolveFirstSlug([parent])).toBe("api-reference");
  });

  it("returns undefined for an empty list", () => {
    expect(resolveFirstSlug([])).toBeUndefined();
  });

  it("returns undefined when no items have slugs", () => {
    const empty: NavigationItem = {
      id: "empty",
      label: "Empty",
      slug: "",
      children: [],
    };
    expect(resolveFirstSlug([empty])).toBeUndefined();
  });
});

describe("buildDefaultDocumentContext", () => {
  it("builds context from fixtures", () => {
    const result = buildDefaultDocumentContext(
      [versionV1, versionV2],
      [navGettingStarted, navApiReference],
    );
    expect(result).toEqual({
      space: DEFAULT_SPACE,
      version: "v1",
      slug: "getting-started",
    });
  });

  it("returns undefined when no versions exist", () => {
    expect(
      buildDefaultDocumentContext([], [navGettingStarted]),
    ).toBeUndefined();
  });

  it("returns undefined when no navigation items exist", () => {
    expect(
      buildDefaultDocumentContext([versionV1, versionV2], []),
    ).toBeUndefined();
  });
});

describe("buildCanonicalPath", () => {
  it("builds the expected URL path", () => {
    expect(buildCanonicalPath(MOCKED_DEFAULT_CONTEXT)).toBe(
      "/guides/v1/getting-started",
    );
  });

  it("constructs path from arbitrary context", () => {
    expect(
      buildCanonicalPath({ space: "api", version: "v3", slug: "overview" }),
    ).toBe("/api/v3/overview");
  });
});

describe("MOCKED_DEFAULT_CONTEXT", () => {
  it("matches the canonical fixtures", () => {
    expect(MOCKED_DEFAULT_CONTEXT).toEqual({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });
  });
});
