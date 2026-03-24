"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useSpaces } from "../application/use-spaces";

/**
 * SpaceSelector — header dropdown that lets users pick a workspace/space.
 *
 * When a space is selected, navigates to /[space] which resolves
 * the default version and loads the sidebar.
 */
export function SpaceSelector() {
  const router = useRouter();
  const params = useParams<{ space?: string }>();
  const activeSpace = params?.space ?? "";
  const spacesState = useSpaces();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextSpace = event.target.value;
    if (!nextSpace || nextSpace === activeSpace) return;
    router.push(`/${nextSpace}`);
  }

  if (spacesState.state === "loading") {
    return (
      <span className="text-sm text-muted-foreground" data-testid="space-selector-loading">
        Loading...
      </span>
    );
  }

  if (spacesState.state === "error" || spacesState.state === "validation-error") {
    return (
      <span className="text-sm text-destructive" data-testid="space-selector-error">
        Emerald Docs
      </span>
    );
  }

  const { spaces } = spacesState.data;

  if (spaces.length === 0) {
    return (
      <span className="text-sm text-muted-foreground" data-testid="space-selector-empty">
        No workspaces available
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="space-selector">
      <label htmlFor="space-select" className="min-w-[4rem] text-xs font-medium text-muted-foreground">
        Workspace
      </label>
      <select
        id="space-select"
        value={activeSpace}
        onChange={handleChange}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="space-select"
      >
        <option value="" disabled>
          Select a workspace
        </option>
        {spaces.map((space) => (
          <option key={space.key} value={space.key}>
            {space.name}
          </option>
        ))}
      </select>
    </div>
  );
}
