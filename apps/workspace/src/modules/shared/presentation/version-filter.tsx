"use client";

import React from "react";
import type { WorkspaceReleaseVersion } from "@emerald/data-access";

interface VersionFilterProps {
  versions: WorkspaceReleaseVersion[];
  value: string | null;
  onChange: (versionId: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

export function VersionFilter({
  versions,
  value,
  onChange,
  isLoading,
  className,
}: VersionFilterProps) {
  if (isLoading) {
    return <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />;
  }

  if (versions.length === 0) {
    return null;
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none ${className ?? ""}`}
      data-testid="version-filter"
    >
      <option value="">All versions</option>
      {versions.map((v) => (
        <option key={v.id} value={v.id}>
          {v.label} ({v.key}) {v.isDefault ? "- Default" : ""}
        </option>
      ))}
    </select>
  );
}
