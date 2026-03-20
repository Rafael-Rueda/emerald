import React from "react";

/**
 * A placeholder welcome component used to verify that Storybook loads
 * with the shared provider stack and global styles.
 */
export function Welcome() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-lg border border-border bg-card p-8">
      <h1 className="text-3xl font-bold text-primary">
        Emerald Design System
      </h1>
      <p className="max-w-md text-center text-muted-foreground">
        Welcome to the Emerald shared UI catalog. This Storybook instance
        documents the shared primitives, compositions, and tokens used across
        the docs and workspace applications.
      </p>
      <div className="flex gap-2">
        <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Storybook
        </span>
        <span className="inline-flex items-center rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
          TanStack Query
        </span>
        <span className="inline-flex items-center rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
          Tailwind CSS
        </span>
      </div>
    </div>
  );
}
