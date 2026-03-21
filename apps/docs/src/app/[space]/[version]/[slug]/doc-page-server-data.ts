import "server-only";

import {
  DocumentResponseSchema,
  type Document,
} from "@emerald/contracts";
import {
  allDocuments,
  buildVersionListResponse,
  findDocument,
  findNavigationTree,
} from "@emerald/mocks";
import { z } from "zod";
import type { DocumentIdentity } from "@/modules/documentation";
import { buildDocumentIdentity } from "@/modules/documentation";

const DEFAULT_PAGE_TITLE = "Emerald Docs";

const PUBLIC_DOCUMENT_RESPONSE_SCHEMA = z.object({
  document: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    space: z.string(),
    version: z.string(),
    rendered_html: z.string(),
    updatedAt: z.string(),
  }),
});

const PUBLIC_VERSION_SCHEMA = z.object({
  key: z.string(),
  status: z.enum(["published", "draft", "archived"]),
  isDefault: z.boolean(),
});

const PUBLIC_VERSIONS_RESPONSE_SCHEMA = z.object({
  space: z.string(),
  versions: z.array(PUBLIC_VERSION_SCHEMA),
});

interface PublicNavigationItem {
  slug: string;
  children: PublicNavigationItem[];
}

const PUBLIC_NAVIGATION_ITEM_SCHEMA: z.ZodType<PublicNavigationItem> = z.lazy(() =>
  z
    .object({
      slug: z.string(),
      children: z.array(PUBLIC_NAVIGATION_ITEM_SCHEMA),
    })
    .passthrough(),
);

const PUBLIC_NAVIGATION_RESPONSE_SCHEMA = z.object({
  items: z.array(PUBLIC_NAVIGATION_ITEM_SCHEMA),
});

const KNOWN_SPACES = Array.from(new Set(allDocuments.map((document) => document.space)));

export type ServerDocumentState =
  | { state: "success"; document: Document }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "validation-error"; message: string };

export interface StaticDocumentParams {
  space: string;
  version: string;
  slug: string;
}

function resolveApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
}

function extractHeadingsFromHtml(html: string) {
  const headingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const headings: Document["headings"] = [];

  let match = headingRegex.exec(html);
  while (match) {
    const [, levelRaw, attributes, content] = match;
    const level = Number(levelRaw);
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const idMatch = /\sid=["']([^"']+)["']/i.exec(attributes);
    const fallbackId = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    if (text.length > 0) {
      headings.push({
        id: idMatch?.[1] ?? fallbackId,
        text,
        level,
      });
    }

    match = headingRegex.exec(html);
  }

  return headings;
}

function collectSlugs(items: PublicNavigationItem[]): string[] {
  const slugs: string[] = [];

  for (const item of items) {
    if (item.slug) {
      slugs.push(item.slug);
    }

    if (item.children.length > 0) {
      slugs.push(...collectSlugs(item.children));
    }
  }

  return slugs;
}

function dedupeParams(params: StaticDocumentParams[]): StaticDocumentParams[] {
  const map = new Map<string, StaticDocumentParams>();

  for (const param of params) {
    const normalized = buildDocumentIdentity(param.space, param.version, param.slug);
    const key = `${normalized.space}::${normalized.version}::${normalized.slug}`;
    map.set(key, normalized);
  }

  return Array.from(map.values());
}

function fetchDocumentFromFixtures(identity: DocumentIdentity): ServerDocumentState {
  const fallbackDocument = findDocument(identity.space, identity.version, identity.slug);

  if (!fallbackDocument) {
    return { state: "not-found" };
  }

  return {
    state: "success",
    document: fallbackDocument,
  };
}

async function fetchDocumentFromPublicApi(
  identity: DocumentIdentity,
  apiBaseUrl: string,
): Promise<ServerDocumentState | null> {
  const path = `/api/public/spaces/${encodeURIComponent(identity.space)}/versions/${encodeURIComponent(identity.version)}/documents/${encodeURIComponent(identity.slug)}`;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`);
  } catch {
    return null;
  }

  if (response.status === 404) {
    return { state: "not-found" };
  }

  if (!response.ok) {
    return {
      state: "error",
      message: `Request failed with status ${response.status}`,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      state: "validation-error",
      message: "Failed to parse response as JSON",
    };
  }

  const parsedPublic = PUBLIC_DOCUMENT_RESPONSE_SCHEMA.safeParse(json);
  if (!parsedPublic.success) {
    return {
      state: "validation-error",
      message: `Invalid document response: ${parsedPublic.error.message}`,
    };
  }

  const adaptedDocument = {
    id: parsedPublic.data.document.id,
    title: parsedPublic.data.document.title,
    slug: parsedPublic.data.document.slug,
    space: parsedPublic.data.document.space,
    version: parsedPublic.data.document.version,
    body: parsedPublic.data.document.rendered_html,
    headings: extractHeadingsFromHtml(parsedPublic.data.document.rendered_html),
    updatedAt: parsedPublic.data.document.updatedAt,
  };

  const parsedAdaptedDocument = DocumentResponseSchema.safeParse({
    document: adaptedDocument,
  });

  if (!parsedAdaptedDocument.success) {
    return {
      state: "validation-error",
      message: `Invalid document response: ${parsedAdaptedDocument.error.message}`,
    };
  }

  return {
    state: "success",
    document: parsedAdaptedDocument.data.document,
  };
}

async function fetchStaticParamsFromPublicApi(
  apiBaseUrl: string,
): Promise<StaticDocumentParams[] | null> {
  const params: StaticDocumentParams[] = [];

  for (const space of KNOWN_SPACES) {
    let versionsResponse: Response;
    try {
      versionsResponse = await fetch(
        `${apiBaseUrl}/api/public/spaces/${encodeURIComponent(space)}/versions`,
      );
    } catch {
      return null;
    }

    if (!versionsResponse.ok) {
      continue;
    }

    let versionsJson: unknown;
    try {
      versionsJson = await versionsResponse.json();
    } catch {
      continue;
    }

    const parsedVersions = PUBLIC_VERSIONS_RESPONSE_SCHEMA.safeParse(versionsJson);
    if (!parsedVersions.success) {
      continue;
    }

    for (const version of parsedVersions.data.versions) {
      let navigationResponse: Response;
      try {
        navigationResponse = await fetch(
          `${apiBaseUrl}/api/public/spaces/${encodeURIComponent(space)}/versions/${encodeURIComponent(version.key)}/navigation`,
        );
      } catch {
        continue;
      }

      if (!navigationResponse.ok) {
        continue;
      }

      let navigationJson: unknown;
      try {
        navigationJson = await navigationResponse.json();
      } catch {
        continue;
      }

      const parsedNavigation = PUBLIC_NAVIGATION_RESPONSE_SCHEMA.safeParse(navigationJson);
      if (!parsedNavigation.success) {
        continue;
      }

      const versionNavigation = {
        space,
        version: version.key,
        items: parsedNavigation.data.items,
      };

      for (const slug of collectSlugs(versionNavigation.items)) {
        params.push({
          space,
          version: version.key,
          slug,
        });
      }
    }
  }

  if (params.length === 0) {
    return null;
  }

  return dedupeParams(params);
}

function getStaticParamsFromFixtures(): StaticDocumentParams[] {
  const fixtureParams = allDocuments.map((document) => ({
    space: document.space,
    version: document.version,
    slug: document.slug,
  }));

  // Prefer navigation-derived slugs when available so generated routes
  // stay aligned with the fixture navigation structure.
  for (const space of KNOWN_SPACES) {
    const versions = buildVersionListResponse(space);
    if (!versions) {
      continue;
    }

    for (const version of versions.versions) {
      const navigation = findNavigationTree(space, version.slug);
      if (!navigation) {
        continue;
      }

      for (const slug of collectSlugs(navigation.items)) {
        fixtureParams.push({
          space,
          version: version.slug,
          slug,
        });
      }
    }
  }

  return dedupeParams(fixtureParams);
}

export async function fetchServerDocumentState(
  identity: DocumentIdentity,
): Promise<ServerDocumentState> {
  const normalizedIdentity = buildDocumentIdentity(
    identity.space,
    identity.version,
    identity.slug,
  );

  const apiBaseUrl = resolveApiBaseUrl();

  if (apiBaseUrl) {
    const apiResult = await fetchDocumentFromPublicApi(normalizedIdentity, apiBaseUrl);
    if (apiResult) {
      return apiResult;
    }
  }

  return fetchDocumentFromFixtures(normalizedIdentity);
}

export async function generateKnownDocumentStaticParams() {
  const apiBaseUrl = resolveApiBaseUrl();

  if (apiBaseUrl) {
    const apiParams = await fetchStaticParamsFromPublicApi(apiBaseUrl);
    if (apiParams) {
      return apiParams;
    }
  }

  return getStaticParamsFromFixtures();
}

export function buildDocumentPageTitle(documentTitle: string) {
  return `${documentTitle} | ${DEFAULT_PAGE_TITLE}`;
}

export function buildFallbackPageTitle(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return DEFAULT_PAGE_TITLE;
  }

  const label = normalizedSlug
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return label.length > 0 ? `${label} | ${DEFAULT_PAGE_TITLE}` : DEFAULT_PAGE_TITLE;
}
