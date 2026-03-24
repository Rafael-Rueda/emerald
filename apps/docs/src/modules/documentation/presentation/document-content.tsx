"use client";

import React from "react";
import type { Document } from "@emerald/contracts";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@emerald/ui/lib/cn";
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
    "thead",
    "tbody",
    "img",
    "a",
    "blockquote",
    "strong",
    "em",
    "span",
    "div",
    "figure",
    "figcaption",
    "section"
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "class", "id", "data-asset-id", "data-callout-tone", "data-tabs", "data-tab-label"],
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
  const updatedAtLabel = new Date(document.updatedAt).toLocaleDateString("en-US");

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
        className={cn(
          "max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1",
          "[&_p]:leading-relaxed [&_p]:text-foreground [&_p]:my-2",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1",
          "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_code]:text-sm [&_code]:font-mono",
          "[&_strong]:font-bold [&_em]:italic",
          "[&_div[data-callout-tone]]:rounded-lg [&_div[data-callout-tone]]:p-4 [&_div[data-callout-tone]]:my-4 [&_div[data-callout-tone]]:border-l-4",
          "[&_div[data-callout-tone='info']]:bg-blue-500/10 [&_div[data-callout-tone='info']]:border-blue-500 [&_div[data-callout-tone='info']]:text-blue-300",
          "[&_div[data-callout-tone='warn']]:bg-amber-500/10 [&_div[data-callout-tone='warn']]:border-amber-500 [&_div[data-callout-tone='warn']]:text-amber-300",
          "[&_div[data-callout-tone='danger']]:bg-red-500/10 [&_div[data-callout-tone='danger']]:border-red-500 [&_div[data-callout-tone='danger']]:text-red-300",
          "[&_div[data-callout-tone='success']]:bg-emerald-500/10 [&_div[data-callout-tone='success']]:border-emerald-500 [&_div[data-callout-tone='success']]:text-emerald-300",
          "[&_div[data-tabs]]:border [&_div[data-tabs]]:rounded-md [&_div[data-tabs]]:overflow-hidden [&_div[data-tabs]]:my-4",
          "[&_section[data-tab-label]]:p-4 [&_section[data-tab-label]]:bg-card [&_section[data-tab-label]]:border-t",
          "[&_section[data-tab-label]]:before:content-[attr(data-tab-label)] [&_section[data-tab-label]]:before:block [&_section[data-tab-label]]:before:font-semibold [&_section[data-tab-label]]:before:mb-2 [&_section[data-tab-label]]:before:text-sm",
          "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:p-2 [&_th]:bg-accent [&_td]:border [&_td]:p-2",
          "[&_figure]:my-4 [&_img]:rounded-md [&_img]:border [&_img]:max-h-96 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_figcaption]:mt-2"
        )}
        data-testid="doc-body"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />
      <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        Last updated: <span suppressHydrationWarning>{updatedAtLabel}</span>
      </div>
    </article>
  );
}
