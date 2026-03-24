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
    <div
      data-testid="version-selector"
      className="flex items-center gap-1.5"
      role="group"
      aria-label="Version selector"
    >
      <span
        className="sr-only"
        data-testid="version-active-label"
      >
        {buildCanonicalVersionLabel(activeVersionEntry?.label ?? activeVersion)}
      </span>
      <label htmlFor="version-select" className="min-w-[4rem] text-xs font-medium text-muted-foreground">
        Version
      </label>
      <select
        id="version-select"
        value={activeVersion}
        onChange={handleVersionChange}
        disabled={disabled}
        className="min-w-[100px] rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}
