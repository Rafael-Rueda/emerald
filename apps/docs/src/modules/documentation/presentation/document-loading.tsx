"use client";

import React from "react";

/**
 * DocumentLoading — intentional loading state for document resolution.
 *
 * Shows a skeleton placeholder instead of a blank shell during first load.
 */
export function DocumentLoading() {
  return (
    <div
      className="max-w-3xl space-y-4 animate-pulse"
      role="status"
      aria-label="Loading document"
      data-testid="document-loading"
    >
      {/* Title skeleton */}
      <div className="h-8 w-2/3 rounded bg-muted" />
      {/* Body skeletons */}
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
      {/* Second section skeleton */}
      <div className="h-6 w-1/3 rounded bg-muted mt-6" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      <span className="sr-only">Loading document…</span>
    </div>
  );
}
