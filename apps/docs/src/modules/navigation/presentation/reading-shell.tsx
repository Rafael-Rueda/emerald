"use client";

import React, { useMemo, useEffect } from "react";
import type { DocumentHeading } from "@emerald/contracts";
import { useNavigation } from "../application/use-navigation";
import {
  buildBreadcrumbs,
  type TocEntry,
} from "../domain/navigation-context";
import { Sidebar } from "./sidebar";
import { SidebarLoading } from "./sidebar-loading";
import { NavigationError } from "./navigation-error";
import { Breadcrumbs } from "./breadcrumbs";
import { TableOfContents } from "./table-of-contents";
import { useSetSidebar } from "./sidebar-context";
import { SearchPanel } from "@/modules/search";

interface ReadingShellProps {
  space: string;
  version: string;
  slug: string;
  /** Version selector region content. */
  versionSelector?: React.ReactNode;
  /** Document headings for TOC (empty array for heading-less docs) */
  headings: DocumentHeading[];
  /** Whether the document content is still loading */
  isDocumentLoading: boolean;
  /** The document content to render in the article area */
  children: React.ReactNode;
}

/**
 * ReadingShell — composes the public docs reading layout.
 *
 * Regions:
 * - Sidebar: navigation tree with active-item highlighting (injected into PublicShell via context)
 * - Breadcrumbs: trail from space > version > current doc
 * - Article: document content (passed as children)
 * - TOC: table of contents for headed documents, no-sections state otherwise
 *
 * During initial and route-driven document loading, shows a transition overlay
 * on the article area so stale content is never mixed with pending state.
 */
export function ReadingShell({
  space,
  version,
  slug,
  versionSelector,
  headings,
  isDocumentLoading,
  children,
}: ReadingShellProps) {
  const navState = useNavigation(space, version);
  const setSidebar = useSetSidebar();

  // Build breadcrumbs from navigation data
  const breadcrumbs = useMemo(() => {
    if (navState.state !== "success") return [];
    return buildBreadcrumbs(
      navState.data.navigation.items,
      slug,
      space,
      version,
    );
  }, [navState, slug, space, version]);

  // Build TOC entries from document headings
  const tocEntries: TocEntry[] = useMemo(() => {
    return headings.map((h) => ({
      id: h.id,
      text: h.text,
      level: h.level,
    }));
  }, [headings]);

  // Render sidebar content based on navigation state and inject it into the PublicShell
  const sidebarContent = useMemo(() => {
    switch (navState.state) {
      case "loading":
        return <SidebarLoading />;
      case "success":
        return (
          <Sidebar
            items={navState.data.navigation.items}
            activeSlug={slug}
            space={space}
            version={version}
          />
        );
      case "not-found":
        return <NavigationError message="Navigation tree not found" />;
      case "error":
        return <NavigationError message={navState.message} />;
      case "validation-error":
        return (
          <NavigationError
            message={navState.message}
            isValidationError
          />
        );
    }
  }, [navState, slug, space, version]);

  // Push sidebar content to PublicShell via context
  useEffect(() => {
    setSidebar(sidebarContent);
    return () => {
      setSidebar(null);
    };
  }, [sidebarContent, setSidebar]);

  // Show transition skeleton whenever document content is loading.
  const showTransition = isDocumentLoading;

  return (
    <div data-testid="reading-shell" className="flex flex-col gap-4">
      {/* Search + versioning regions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div data-testid="reading-shell-search" className="flex-1 min-w-0">
          <SearchPanel currentRoute={{ space, version, slug }} />
        </div>
        {versionSelector ? (
          <div data-testid="reading-shell-versioning">{versionSelector}</div>
        ) : null}
      </div>

      {/* Breadcrumbs region */}
      <div data-testid="reading-shell-breadcrumbs">
        <Breadcrumbs items={breadcrumbs} space={space} version={version} />
      </div>

      {/* Main content area with article and TOC */}
      <div className="flex gap-8">
        {/* Article region */}
        <div className="flex-1 min-w-0" data-testid="reading-shell-article">
          {showTransition ? (
            <div
              className="animate-pulse space-y-4"
              role="status"
              aria-label="Loading new document"
              data-testid="article-transition"
            >
              <div className="h-8 w-2/3 rounded bg-muted" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-4/6 rounded bg-muted" />
              </div>
              <span className="sr-only">Loading new document…</span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* TOC region */}
        <div data-testid="reading-shell-toc">
          <TableOfContents entries={tocEntries} />
        </div>
      </div>
    </div>
  );
}
