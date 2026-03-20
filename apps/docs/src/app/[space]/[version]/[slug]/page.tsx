/**
 * Public document route — /[space]/[version]/[slug]
 *
 * This is the canonical route for reading a specific document.
 * Full document resolution, rendering, and non-success states
 * will be implemented in the document-resolution feature.
 */

interface DocPageProps {
  params: Promise<{
    space: string;
    version: string;
    slug: string;
  }>;
}

export default async function DocPage({ params }: DocPageProps) {
  const { space, version, slug } = await params;

  return (
    <div className="max-w-3xl space-y-4">
      <h1
        className="text-3xl font-bold text-foreground"
        data-testid="doc-title"
      >
        {space}/{version}/{slug}
      </h1>
      <p className="text-muted-foreground">
        Document content will be loaded here.
      </p>
    </div>
  );
}
