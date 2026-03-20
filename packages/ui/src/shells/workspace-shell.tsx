"use client";

import React, { useState, useCallback } from "react";
import { ThemeToggle } from "../theme/theme-toggle";

export interface WorkspaceShellProps {
  children: React.ReactNode;
  /** Navigation items for the admin sidebar. */
  navigation?: React.ReactNode;
  /** Header title. */
  title?: string;
}

/**
 * Responsive workspace/admin shell skeleton.
 *
 * Layout: header (with hamburger at narrow widths), collapsible admin sidebar, main content area.
 * At ~390px the sidebar collapses into an overlay toggled by a hamburger button.
 */
export function WorkspaceShell({
  children,
  navigation,
  title = "Emerald Workspace",
}: WorkspaceShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  const toggleNav = useCallback(() => {
    setNavOpen((prev) => !prev);
  }, []);

  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background px-4">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={toggleNav}
          className="mr-3 inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent lg:hidden"
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
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
            {navOpen ? (
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

        <span className="text-lg font-semibold text-primary">{title}</span>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Overlay backdrop (mobile only) */}
        {navOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={closeNav}
            aria-hidden="true"
          />
        )}

        {/* Admin navigation sidebar */}
        <aside
          className={`fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-56 border-r border-border bg-card p-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="navigation"
          aria-label="Admin navigation"
        >
          {navigation ?? (
            <nav className="space-y-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
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
