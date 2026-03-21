"use client";

import React from "react";
import type { Document } from "@emerald/contracts";
import DOMPurify from "isomorphic-dompurify";
import {
  buildCanonicalDocumentTitleLabel,
  buildCanonicalPathLabel,
  buildCanonicalVersionLabel,
} from "@emerald/contracts";

/**
 * DocumentContent — renders the resolved document with title and body.
 *
 * The body is pre-rendered HTML from the fixture/API and is sanitized
 * before rendering to prevent script and attribute injection.
 */
interface DocumentContentProps {
  document: Document;
}

export const DOCUMENT_HTML_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "ul",
    "ol",
    "li",
    "pre",
    "code",
    "table",
    "tr",
    "td",
    "th",
    "img",
    "a",
    "blockquote",
    "strong",
    "em",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "class", "id"],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ["script", "iframe", "object", "embed"],
  FORBID_ATTR: ["style"],
  ALLOW_UNKNOWN_PROTOCOLS: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

export function DocumentContent({ document }: DocumentContentProps) {
  const versionLabel = buildCanonicalVersionLabel(document.version);
  const pathLabel = buildCanonicalPathLabel({
    space: document.space,
    slug: document.slug,
  });
  const sanitizedBody = DOMPurify.sanitize(document.body, DOCUMENT_HTML_SANITIZE_CONFIG);

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
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />
      <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        Last updated: {new Date(document.updatedAt).toLocaleDateString()}
      </div>
    </article>
  );
}
