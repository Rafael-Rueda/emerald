"use client";

import React, { useMemo } from "react";
import type { Document } from "@emerald/contracts";
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
  initialDocumentState:
    | { state: "success"; document: Document }
    | { state: "not-found" }
    | { state: "error"; message: string }
    | { state: "validation-error"; message: string };
}

export function DocPageClient({
  space,
  version,
  slug,
  initialDocumentState,
}: DocPageClientProps) {
  const versionState = useVersions(space);
  const isVersionLoading = versionState.state === "loading";

  // Determine headings from the document data (empty for non-success states)
  const headings = useMemo(() => {
    if (initialDocumentState.state === "success") {
      return initialDocumentState.document.headings;
    }
    return [];
  }, [initialDocumentState]);

  if (versionState.state === "not-found" || versionState.state === "error") {
    return <VersionError />;
  }

  if (versionState.state === "validation-error") {
    return <VersionError isValidationError />;
  }

  const versionSelector = isVersionLoading
    ? undefined
    : (
      <VersionSelector
        space={space}
        activeVersion={version}
        slug={slug}
        versions={versionState.data.versions}
        disabled={false}
      />
    );

  // Render document content based on view state.
  // Keep the reading shell mounted while versions load so navigation can fetch in parallel.
  const documentContent = isVersionLoading
    ? <DocumentLoading />
    : (() => {
      switch (initialDocumentState.state) {
        case "success":
          return <DocumentContent document={initialDocumentState.document} />;
        case "not-found":
          return (
            <DocumentUnavailable
              space={space}
              version={version}
              slug={slug}
            />
          );
        case "error":
          return <DocumentError message={initialDocumentState.message} />;
        case "validation-error":
          return (
            <DocumentError
              message={initialDocumentState.message}
              isValidationError
            />
          );
      }
    })();

  return (
    <ReadingShell
      space={space}
      version={version}
      slug={slug}
      versionSelector={versionSelector}
      headings={headings}
      isDocumentLoading={false}
    >
      {documentContent}
    </ReadingShell>
  );
}
