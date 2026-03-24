"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSearch } from "../application/use-search";

function toRoutePath(space: string, version: string, slug: string): string {
  return `/${space}/${version}/${slug}`;
}

/**
 * SearchPanel — Ctrl+K command-palette search for documentation.
 *
 * Renders a trigger button in the header. When activated (click or Ctrl+K),
 * opens a centered dialog overlay with the search input and dropdown results.
 */
export function SearchPanel() {
  const params = useParams<{ space?: string; version?: string; slug?: string }>();
  const space = params?.space ?? "";
  const version = params?.version ?? "";
  const slug = params?.slug ?? "";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const state = useSearch(submittedQuery);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentRoutePath = useMemo(
    () => (space && version && slug ? toRoutePath(space, version, slug) : ""),
    [space, version, slug],
  );

  const hasResults =
    state.state === "success" ||
    state.state === "empty" ||
    state.state === "loading" ||
    state.state === "error" ||
    state.state === "validation-error";

  // Global Ctrl+K listener
  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setIsDialogOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isDialogOpen]);

  // Close on click outside dialog
  useEffect(() => {
    if (!isDialogOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        setIsDialogOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDialogOpen]);

  const handleDialogKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDialogOpen(false);
      }
    },
    [],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
  }

  function handleClear() {
    setInputValue("");
    setSubmittedQuery("");
  }

  function handleResultClick() {
    setIsDialogOpen(false);
  }

  function openDialog() {
    setIsDialogOpen(true);
  }

  return (
    <>
      {/* Trigger button — styled as a search bar placeholder */}
      <button
        type="button"
        onClick={openDialog}
        data-testid="search-trigger"
        className="flex h-8 w-full min-w-[280px] max-w-lg items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Search documentation"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="flex-1 truncate text-left">Search docs...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          Ctrl K
        </kbd>
      </button>

      {/* Dialog overlay */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
          data-testid="search-panel"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl"
            onKeyDown={handleDialogKeyDown}
          >
            {/* Search input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center border-b border-border px-4"
              data-testid="search-form"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <label htmlFor="search-dialog-input" className="sr-only">
                Search documentation
              </label>
              <input
                ref={inputRef}
                id="search-dialog-input"
                data-testid="search-input"
                type="text"
                placeholder="Search documentation..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-12 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {(inputValue || submittedQuery) && (
                <button
                  type="button"
                  onClick={handleClear}
                  data-testid="search-clear"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </form>

            {/* Results area */}
            <div
              className="max-h-[50vh] overflow-auto"
              data-testid="search-state-region"
            >
              {state.state === "idle" && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground" data-testid="search-idle">
                  Type a query and press Enter to search.
                </div>
              )}

              {state.state === "loading" && (
                <div
                  className="p-4"
                  role="status"
                  aria-live="polite"
                  data-testid="search-loading"
                >
                  <p className="text-sm font-medium">Searching for &ldquo;{state.query}&rdquo;&hellip;</p>
                </div>
              )}

              {state.state === "empty" && (
                <div className="p-4" data-testid="search-empty">
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs text-muted-foreground">
                    No documents matched &ldquo;{state.query}&rdquo;.
                  </p>
                </div>
              )}

              {state.state === "error" && (
                <div className="p-4" role="alert" data-testid="search-error">
                  <p className="text-sm font-medium text-destructive">Search request failed</p>
                  <p className="text-xs text-muted-foreground">{state.message}</p>
                </div>
              )}

              {state.state === "validation-error" && (
                <div className="p-4" role="alert" data-testid="search-validation-error">
                  <p className="text-sm font-medium text-destructive">Invalid search data</p>
                  <p className="text-xs text-muted-foreground">{state.message}</p>
                </div>
              )}

              {state.state === "success" && (
                <div className="py-1">
                  <p className="px-4 py-1.5 text-xs text-muted-foreground" data-testid="search-results-meta">
                    Results for &ldquo;{state.query}&rdquo;
                  </p>
                  <ul data-testid="search-results" aria-live="polite">
                    {state.results.map((result) => {
                      const isCurrentPage = result.routePath === currentRoutePath;

                      return (
                        <li key={result.id} data-testid={`search-result-${result.id}`}>
                          <Link
                            href={result.routePath}
                            onClick={handleResultClick}
                            className="block px-4 py-2.5 transition-colors hover:bg-accent"
                            data-testid={`search-result-link-${result.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                              {isCurrentPage && (
                                <span
                                  className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                                  data-testid={`search-result-current-${result.id}`}
                                >
                                  Current
                                </span>
                              )}
                            </div>
                            <p
                              className="text-xs text-muted-foreground truncate"
                              data-testid={`search-result-context-${result.id}`}
                            >
                              {result.routeContext}
                            </p>
                            <p className="mt-0.5 text-xs text-foreground/80 line-clamp-2">{result.snippet}</p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>Press Esc to close</span>
              <span>Enter to search</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
