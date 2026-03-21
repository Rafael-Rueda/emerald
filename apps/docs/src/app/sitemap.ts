import type { MetadataRoute } from "next";
import {
  allDocuments,
  buildVersionListResponse,
  findDocument,
  findNavigationTree,
} from "@emerald/mocks";
import { z } from "zod";
import { resolveDocsSiteOrigin } from "./[space]/[version]/[slug]/doc-page-server-data";

const PUBLIC_VERSION_SCHEMA = z.object({
  key: z.string(),
  status: z.enum(["published", "draft", "archived"]),
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

const PUBLIC_DOCUMENT_RESPONSE_SCHEMA = z.object({
  document: z.object({
    updatedAt: z.string(),
  }),
});

const KNOWN_SPACES = Array.from(new Set(allDocuments.map((document) => document.space)));

function resolveApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
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

function dedupeEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const map = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of entries) {
    map.set(entry.url, entry);
  }

  return Array.from(map.values());
}

async function fetchPublishedEntriesFromApi(
  apiBaseUrl: string,
  docsSiteOrigin: string,
): Promise<MetadataRoute.Sitemap | null> {
  const entries: MetadataRoute.Sitemap = [];

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
      if (version.status !== "published") {
        continue;
      }

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

      for (const slug of collectSlugs(parsedNavigation.data.items)) {
        let documentResponse: Response;
        try {
          documentResponse = await fetch(
            `${apiBaseUrl}/api/public/spaces/${encodeURIComponent(space)}/versions/${encodeURIComponent(version.key)}/documents/${encodeURIComponent(slug)}`,
          );
        } catch {
          continue;
        }

        if (!documentResponse.ok) {
          continue;
        }

        let documentJson: unknown;
        try {
          documentJson = await documentResponse.json();
        } catch {
          continue;
        }

        const parsedDocument = PUBLIC_DOCUMENT_RESPONSE_SCHEMA.safeParse(documentJson);
        if (!parsedDocument.success) {
          continue;
        }

        entries.push({
          url: `${docsSiteOrigin}/${space}/${version.key}/${slug}`,
          lastModified: new Date(parsedDocument.data.document.updatedAt),
        });
      }
    }
  }

  return entries.length > 0 ? dedupeEntries(entries) : null;
}

function buildFallbackEntries(docsSiteOrigin: string): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const space of KNOWN_SPACES) {
    const versions = buildVersionListResponse(space);
    if (!versions) {
      continue;
    }

    for (const version of versions.versions) {
      if (version.status !== "published") {
        continue;
      }

      const navigation = findNavigationTree(space, version.slug);
      if (!navigation) {
        continue;
      }

      for (const slug of collectSlugs(navigation.items)) {
        const document = findDocument(space, version.slug, slug);
        if (!document) {
          continue;
        }

        entries.push({
          url: `${docsSiteOrigin}/${space}/${version.slug}/${slug}`,
          lastModified: new Date(document.updatedAt),
        });
      }
    }
  }

  return dedupeEntries(entries);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docsSiteOrigin = resolveDocsSiteOrigin();
  const apiBaseUrl = resolveApiBaseUrl();

  if (apiBaseUrl) {
    const apiEntries = await fetchPublishedEntriesFromApi(apiBaseUrl, docsSiteOrigin);
    if (apiEntries) {
      return apiEntries;
    }
  }

  return buildFallbackEntries(docsSiteOrigin);
}
