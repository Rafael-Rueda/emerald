/**
 * Public document route — /[space]/[version]/[slug]
 *
 * Canonical route for reading a specific public document.
 * Resolves document identity from URL params and renders
 * the document view which handles loading, success, not-found,
 * and error states through the documentation module.
 */

import type { Metadata } from "next";
import { buildDocumentIdentity } from "@/modules/documentation";
import { DocPageClient } from "./doc-page-client";
import {
  buildDocumentDescription,
  buildDocumentOgImage,
  buildDocumentPageTitle,
  buildFallbackPageTitle,
  fetchServerDocumentState,
  generateKnownDocumentStaticParams,
  resolveDocsSiteOrigin,
} from "./doc-page-server-data";

export const revalidate = 60;

interface DocPageProps {
  params: Promise<{
    space: string;
    version: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return generateKnownDocumentStaticParams();
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { space, version, slug } = await params;
  const identity = buildDocumentIdentity(space, version, slug);
  const metadataBase = new URL(resolveDocsSiteOrigin());

  const documentState = await fetchServerDocumentState(identity);

  if (documentState.state === "success") {
    const title = buildDocumentPageTitle(documentState.document.title);
    const description = buildDocumentDescription(documentState.document.body);
    const image = buildDocumentOgImage(documentState.document.body);

    return {
      metadataBase,
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: [image],
      },
    };
  }

  const title = buildFallbackPageTitle(slug);
  const description = "Read technical documentation on Emerald Docs.";
  const image = buildDocumentOgImage("");

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [image],
    },
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { space, version, slug } = await params;
  const identity = buildDocumentIdentity(space, version, slug);
  const documentState = await fetchServerDocumentState(identity);

  return (
    <DocPageClient
      space={identity.space}
      version={identity.version}
      slug={identity.slug}
      initialDocumentState={documentState}
    />
  );
}
