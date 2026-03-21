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
  buildDocumentPageTitle,
  buildFallbackPageTitle,
  fetchServerDocumentState,
  generateKnownDocumentStaticParams,
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

  const documentState = await fetchServerDocumentState(identity);

  if (documentState.state === "success") {
    return {
      title: buildDocumentPageTitle(documentState.document.title),
    };
  }

  return {
    title: buildFallbackPageTitle(slug),
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
