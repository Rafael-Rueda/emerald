/**
 * Public document route — /[space]/[version]/[slug]
 *
 * Canonical route for reading a specific public document.
 * Resolves document identity from URL params and renders
 * the document view which handles loading, success, not-found,
 * and error states through the documentation module.
 */

import { DocPageClient } from "./doc-page-client";

interface DocPageProps {
  params: Promise<{
    space: string;
    version: string;
    slug: string;
  }>;
}

export default async function DocPage({ params }: DocPageProps) {
  const { space, version, slug } = await params;

  return <DocPageClient space={space} version={version} slug={slug} />;
}
