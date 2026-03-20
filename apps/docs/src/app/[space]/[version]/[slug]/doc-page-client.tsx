"use client";

import React, { useMemo } from "react";
import { buildDocumentIdentity, useDocument } from "@/modules/documentation";
import { DocumentLoading } from "@/modules/documentation/presentation/document-loading";
import { DocumentContent } from "@/modules/documentation/presentation/document-content";
import { DocumentUnavailable } from "@/modules/documentation/presentation/document-unavailable";
import { DocumentError } from "@/modules/documentation/presentation/document-error";
import { ReadingShell } from "@/modules/navigation";
import {
  VersionError,
  VersionSelector,
  useVersions,
} from "@/modules/versioning";

interface DocPageClientProps {
  space: string;
  version: string;
  slug: string;
}

export function DocPageClient({ space, version, slug }: DocPageClientProps) {
  const identity = useMemo(
    () => buildDocumentIdentity(space, version, slug),
    [space, version, slug],
  );

  const versionState = useVersions(space);
  const viewState = useDocument(identity);

  // Determine headings from the document data (empty for non-success states)
  const headings = useMemo(() => {
    if (viewState.state === "success") {
      return viewState.data.document.headings;
    }
    return [];
  }, [viewState]);

  if (versionState.state === "loading") {
    return <DocumentLoading />;
  }

  if (versionState.state === "not-found" || versionState.state === "error") {
    return <VersionError />;
  }

  if (versionState.state === "validation-error") {
    return <VersionError isValidationError />;
  }

  // Render document content based on view state
  const documentContent = (() => {
    switch (viewState.state) {
      case "loading":
        return <DocumentLoading />;
      case "success":
        return <DocumentContent document={viewState.data.document} />;
      case "not-found":
        return (
          <DocumentUnavailable
            space={identity.space}
            version={identity.version}
            slug={identity.slug}
          />
        );
      case "error":
        return <DocumentError message={viewState.message} />;
      case "validation-error":
        return (
          <DocumentError message={viewState.message} isValidationError />
        );
    }
  })();

  return (
    <ReadingShell
      space={space}
      version={version}
      slug={slug}
      versionSelector={
        <VersionSelector
          space={space}
          activeVersion={version}
          slug={slug}
          versions={versionState.data.versions}
          disabled={viewState.state === "loading"}
        />
      }
      headings={headings}
      isDocumentLoading={viewState.state === "loading"}
    >
      {documentContent}
    </ReadingShell>
  );
}
