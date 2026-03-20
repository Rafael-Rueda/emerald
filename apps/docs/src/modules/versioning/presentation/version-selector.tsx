"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { Version } from "@emerald/contracts";
import { buildCanonicalVersionLabel } from "@emerald/contracts";
import {
  buildVersionRoutePath,
  findActiveVersion,
} from "../domain/version-route";

interface VersionSelectorProps {
  space: string;
  activeVersion: string;
  slug: string;
  versions: Version[];
  disabled?: boolean;
}

/**
 * VersionSelector — route-driven version switcher for public docs pages.
 */
export function VersionSelector({
  space,
  activeVersion,
  slug,
  versions,
  disabled = false,
}: VersionSelectorProps) {
  const router = useRouter();
  const activeVersionEntry = findActiveVersion(versions, activeVersion);

  function handleVersionChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextVersion = event.target.value;
    if (nextVersion === activeVersion) {
      return;
    }

    router.push(buildVersionRoutePath(space, nextVersion, slug));
  }

  return (
    <section
      data-testid="version-selector"
      className="rounded-lg border border-border bg-card px-3 py-2"
      aria-label="Version selector"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Version
        </span>
        <div className="flex items-center gap-2">
          <span
            className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
            data-testid="version-active-label"
          >
            {buildCanonicalVersionLabel(activeVersionEntry?.label ?? activeVersion)}
          </span>
          <label htmlFor="version-select" className="sr-only">
            Select documentation version
          </label>
          <select
            id="version-select"
            value={activeVersion}
            onChange={handleVersionChange}
            disabled={disabled}
            className="min-w-[120px] rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="version-select"
          >
            {versions.map((version) => (
              <option
                key={version.id}
                value={version.slug}
                data-testid={`version-option-${version.slug}`}
              >
                {buildCanonicalVersionLabel(version.label)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
