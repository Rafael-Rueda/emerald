"use client";

import React from "react";
import type { Document } from "@emerald/contracts";
import {
  buildCanonicalDocumentTitleLabel,
  buildCanonicalPathLabel,
  buildCanonicalVersionLabel,
} from "@emerald/contracts";

/**
 * DocumentContent — renders the resolved document with title and body.
 *
 * The body is pre-rendered HTML from the fixture/API. In a real system
 * this would be sanitized; for the mocked surface it renders directly.
 */
interface DocumentContentProps {
  document: Document;
}

export function DocumentContent({ document }: DocumentContentProps) {
  const versionLabel = buildCanonicalVersionLabel(document.version);
  const pathLabel = buildCanonicalPathLabel({
    space: document.space,
    slug: document.slug,
  });

  return (
    <article
      className="max-w-3xl space-y-4"
      data-testid="document-content"
    >
      <h1
        className="text-3xl font-bold text-foreground"
        data-testid="doc-title"
      >
        {buildCanonicalDocumentTitleLabel(document.title)}
      </h1>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground" data-testid="doc-meta">
        <span>
          Version:{" "}
          <span data-testid="doc-version-label">{versionLabel}</span>
        </span>
        <span>
          Path: <span data-testid="doc-path-label">{pathLabel}</span>
        </span>
      </div>
      <div
        className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:leading-relaxed [&_p]:text-foreground"
        data-testid="doc-body"
        dangerouslySetInnerHTML={{ __html: document.body }}
      />
      <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        Last updated: {new Date(document.updatedAt).toLocaleDateString()}
      </div>
    </article>
  );
}
