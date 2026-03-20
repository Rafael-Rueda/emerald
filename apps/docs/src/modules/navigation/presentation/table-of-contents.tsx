"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type { TocEntry } from "../domain/navigation-context";

interface TableOfContentsProps {
  entries: TocEntry[];
}

/**
 * TableOfContents — in-page section navigation for headed documents.
 *
 * Features:
 * - Click-to-section: clicking a TOC entry scrolls to the corresponding heading.
 * - Active-section tracking: highlights the section currently in the viewport.
 * - Heading-less state: when no entries exist, shows an intentional "no sections" message.
 */
export function TableOfContents({ entries }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Observe heading elements for active section tracking
  useEffect(() => {
    if (entries.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const headingElements = entries
      .map((entry) => document.getElementById(entry.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    // Set initial active to first heading
    setActiveId(entries[0].id);

    const observer = new IntersectionObserver(
      (observerEntries) => {
        // Find the first entry that is intersecting
        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );

    headingElements.forEach((el) => observer.observe(el));
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [entries]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
        // Update URL hash without triggering navigation
        window.history.replaceState(null, "", `#${id}`);
      }
    },
    [],
  );

  // Heading-less documents: intentional no-sections state
  if (entries.length === 0) {
    return (
      <aside
        className="hidden xl:block"
        data-testid="toc-empty"
        aria-label="Table of contents"
      >
        <div className="sticky top-20 w-56">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            On this page
          </p>
          <p className="text-sm text-muted-foreground" data-testid="toc-no-sections">
            No sections in this document.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="hidden xl:block"
      data-testid="toc"
      aria-label="Table of contents"
    >
      <div className="sticky top-20 w-56">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          On this page
        </p>
        <nav className="space-y-1" data-testid="toc-nav">
          {entries.map((entry) => {
            const isActive = entry.id === activeId;
            return (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                onClick={(e) => handleClick(e, entry.id)}
                className={`block text-sm transition-colors ${
                  isActive
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  paddingLeft: `${(entry.level - 2) * 12}px`,
                }}
                aria-current={isActive ? "true" : undefined}
                data-testid={`toc-entry-${entry.id}`}
              >
                {entry.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
