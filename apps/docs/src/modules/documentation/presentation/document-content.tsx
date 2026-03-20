"use client";

import React from "react";
import type { Document } from "@emerald/contracts";

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
  return (
    <article
      className="max-w-3xl space-y-4"
      data-testid="document-content"
    >
      <h1
        className="text-3xl font-bold text-foreground"
        data-testid="doc-title"
      >
        {document.title}
      </h1>
      <div className="text-sm text-muted-foreground">
        <span data-testid="doc-meta">
          {document.space} / {document.version} / {document.slug}
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
