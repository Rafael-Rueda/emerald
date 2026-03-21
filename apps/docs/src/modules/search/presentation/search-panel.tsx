"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button, TextInput } from "@emerald/ui/primitives";
import { useSearch } from "../application/use-search";

interface SearchPanelProps {
  currentRoute: {
    space: string;
    version: string;
    slug: string;
  };
}

function toRoutePath(space: string, version: string, slug: string): string {
  return `/${space}/${version}/${slug}`;
}

/**
 * SearchPanel — public docs search entry point and results view.
 */
export function SearchPanel({ currentRoute }: SearchPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const state = useSearch(submittedQuery);
  const currentRoutePath = useMemo(
    () => toRoutePath(currentRoute.space, currentRoute.version, currentRoute.slug),
    [currentRoute],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(inputValue.trim());
  }

  function handleClear() {
    setInputValue("");
    setSubmittedQuery("");
  }

  return (
    <section
      data-testid="search-panel"
      className="rounded-lg border border-border bg-card p-4"
      aria-label="Search documentation"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        data-testid="search-form"
      >
        <div className="flex-1">
          <TextInput
            id="docs-search-input"
            data-testid="search-input"
            label="Search docs"
            placeholder="Search by title or content"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            data-testid="search-submit"
            disabled={inputValue.trim().length === 0}
          >
            Search
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            data-testid="search-clear"
            disabled={inputValue.length === 0 && submittedQuery.length === 0}
          >
            Clear
          </Button>
        </div>
      </form>

      <div className="mt-4" data-testid="search-state-region">
        {state.state === "idle" && (
          <p className="text-sm text-muted-foreground" data-testid="search-idle">
            Enter a query to search documentation pages.
          </p>
        )}

        {state.state === "loading" && (
          <div
            className="space-y-1"
            role="status"
            aria-live="polite"
            data-testid="search-loading"
          >
            <p className="text-sm font-medium">Searching for “{state.query}”…</p>
            <p className="text-xs text-muted-foreground" data-testid="search-non-current-note">
              Previous results are hidden while this query is loading.
            </p>
          </div>
        )}

        {state.state === "empty" && (
          <div className="space-y-1" data-testid="search-empty">
            <p className="text-sm font-medium">No results found</p>
            <p className="text-xs text-muted-foreground">
              No documents matched “{state.query}”.
            </p>
          </div>
        )}

        {state.state === "error" && (
          <div className="space-y-1" role="alert" data-testid="search-error">
            <p className="text-sm font-medium text-destructive">Search request failed</p>
            <p className="text-xs text-muted-foreground">{state.message}</p>
            <p className="text-xs text-muted-foreground" data-testid="search-non-current-note">
              Previous results were cleared.
            </p>
          </div>
        )}

        {state.state === "validation-error" && (
          <div
            className="space-y-1"
            role="alert"
            data-testid="search-validation-error"
          >
            <p className="text-sm font-medium text-destructive">Invalid search data</p>
            <p className="text-xs text-muted-foreground">{state.message}</p>
            <p className="text-xs text-muted-foreground" data-testid="search-non-current-note">
              Results were not rendered from malformed payloads.
            </p>
          </div>
        )}

        {state.state === "success" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground" data-testid="search-results-meta">
              Results for “{state.query}”
            </p>
            <ul className="space-y-2" data-testid="search-results" aria-live="polite">
              {state.results.map((result) => {
                const isCurrentPage = result.routePath === currentRoutePath;

                return (
                  <li key={result.id} data-testid={`search-result-${result.id}`}>
                    <div data-testid="search-result-item">
                      <Link
                        href={result.routePath}
                        className="block rounded-md border border-border p-3 transition-colors hover:bg-accent"
                        data-testid={`search-result-link-${result.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{result.title}</p>
                          {isCurrentPage && (
                            <span
                              className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              data-testid={`search-result-current-${result.id}`}
                            >
                              Current page
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs text-muted-foreground"
                          data-testid={`search-result-context-${result.id}`}
                        >
                          {result.routeContext}
                        </p>
                        <p className="mt-1 text-sm text-foreground">{result.snippet}</p>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
