"use client";

import React from "react";
import { ReadingShell } from "@/modules/navigation";
import {
  VersionError,
  VersionSelector,
  useVersions,
} from "@/modules/versioning";

interface WelcomePageClientProps {
  space: string;
  version: string;
}

/**
 * WelcomePageClient — workspace is selected but no document yet.
 *
 * Shows the sidebar (navigation loaded) with a welcome message
 * in the article area, prompting the user to pick a document.
 */
export function WelcomePageClient({ space, version }: WelcomePageClientProps) {
  const versionState = useVersions(space);
  const isVersionLoading = versionState.state === "loading";

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
        slug=""
        versions={versionState.data.versions}
        disabled={false}
      />
    );

  return (
    <ReadingShell
      space={space}
      version={version}
      slug=""
      versionSelector={versionSelector}
      headings={[]}
      isDocumentLoading={false}
    >
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            aria-hidden="true"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Welcome
        </h2>
        <p className="text-muted-foreground max-w-sm">
          Select a document from the sidebar to start reading.
        </p>
      </div>
    </ReadingShell>
  );
}
