"use client";

import React from "react";

/**
 * SidebarLoading — skeleton placeholder for sidebar navigation during loading.
 */
export function SidebarLoading() {
  return (
    <div
      className="space-y-2 animate-pulse"
      role="status"
      aria-label="Loading navigation"
      data-testid="sidebar-loading"
    >
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <span className="sr-only">Loading navigation…</span>
    </div>
  );
}
