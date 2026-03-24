"use client";

import React, { useState, useCallback } from "react";
import { ThemeToggle } from "../theme/theme-toggle";

export interface PublicShellProps {
  children: React.ReactNode;
  /** Sidebar content (e.g., navigation tree). */
  sidebar?: React.ReactNode;
  /** Header title (string or custom ReactNode like a selector). */
  title?: React.ReactNode;
  /** Controls rendered in the header left zone (e.g., version selector). */
  headerControls?: React.ReactNode;
  /** Content rendered centered in the header (e.g., search trigger). */
  headerSearch?: React.ReactNode;
}

/**
 * Responsive public documentation shell skeleton.
 *
 * Layout: header (with hamburger at narrow widths), collapsible sidebar, main content area.
 * At ~390px the sidebar collapses into an overlay toggled by a hamburger button.
 */
export function PublicShell({
  children,
  sidebar,
  title = "Emerald Docs",
  headerControls,
  headerSearch,
}: PublicShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — 3-column grid: left (nav + selectors) | center (search) | right (theme) */}
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-background px-4">
        {/* Left zone */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-foreground hover:bg-accent lg:hidden"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {sidebarOpen ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>

          {/* Desktop: title + controls inline */}
          <div className="hidden shrink-0 text-lg font-semibold text-primary lg:block">{title}</div>

          {headerControls ? (
            <div className="hidden items-center gap-3 lg:flex">
              {headerControls}
            </div>
          ) : null}
        </div>

        {/* Center zone — search */}
        {headerSearch ? (
          <div className="flex items-center justify-center">
            {headerSearch}
          </div>
        ) : <div />}

        {/* Right zone */}
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar overlay backdrop (mobile only) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background p-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="navigation"
          aria-label="Sidebar navigation"
        >
          {/* Mobile-only: workspace + version selects at top of sidebar */}
          {(title || headerControls) && (
            <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 lg:hidden">
              {title ? <div className="text-lg font-semibold text-primary">{title}</div> : null}
              {headerControls ? <div className="flex flex-col gap-2">{headerControls}</div> : null}
            </div>
          )}

          {sidebar ?? (
            <nav className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Navigation placeholder
              </p>
            </nav>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
