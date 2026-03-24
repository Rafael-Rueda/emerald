"use client";

import { useSpaces } from "@/modules/spaces";
import { useRouter } from "next/navigation";

/**
 * Root landing page — prompts the user to select a workspace.
 *
 * No workspace is selected yet, so we show a clean selection UI.
 * Once a space is picked, the user navigates to /[space] which
 * resolves the default version automatically.
 */
export default function HomePage() {
  const spacesState = useSpaces();
  const router = useRouter();

  function handleSelect(spaceKey: string) {
    router.push(`/${spaceKey}`);
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Emerald Docs
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Select a workspace to browse its documentation.
      </p>

      {spacesState.state === "loading" && (
        <div className="space-y-3 w-full max-w-sm" data-testid="home-loading">
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
        </div>
      )}

      {(spacesState.state === "error" || spacesState.state === "validation-error") && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-sm w-full text-center"
          data-testid="home-error"
        >
          Unable to load workspaces. Please try again later.
        </div>
      )}

      {spacesState.state === "success" && spacesState.data.spaces.length === 0 && (
        <div
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground max-w-sm w-full text-center"
          data-testid="home-empty"
        >
          No workspaces with published content yet.
        </div>
      )}

      {spacesState.state === "success" && spacesState.data.spaces.length > 0 && (
        <div className="grid gap-3 w-full max-w-sm" data-testid="home-space-list">
          {spacesState.data.spaces.map((space) => (
            <button
              key={space.key}
              type="button"
              onClick={() => handleSelect(space.key)}
              className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`space-card-${space.key}`}
            >
              <span className="font-medium text-foreground">{space.name}</span>
              {space.description && (
                <span className="text-xs text-muted-foreground">{space.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
