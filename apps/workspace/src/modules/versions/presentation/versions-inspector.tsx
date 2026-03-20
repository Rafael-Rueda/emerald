"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@emerald/ui/lib/cn";
import {
  useWorkspaceVersionDetail,
  useWorkspaceVersionsList,
} from "../application/use-workspace-versions";

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function VersionsInspector() {
  const listState = useWorkspaceVersionsList();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );

  const listVersions = useMemo(() => {
    if (listState.state !== "success") {
      return [];
    }

    return listState.data.versions;
  }, [listState]);

  useEffect(() => {
    if (listVersions.length === 0) {
      setSelectedVersionId(null);
      return;
    }

    setSelectedVersionId((currentSelectedId) => {
      if (
        currentSelectedId &&
        listVersions.some((version) => version.id === currentSelectedId)
      ) {
        return currentSelectedId;
      }

      return listVersions[0].id;
    });
  }, [listVersions]);

  const detailState = useWorkspaceVersionDetail(selectedVersionId);

  return (
    <section className="space-y-4" data-testid="admin-section-versions">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Versions</h1>
        <p className="text-muted-foreground">
          Inspect mocked version records and compare release metadata for the
          selected version.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Records
          </h2>

          {listState.state === "loading" && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="versions-list-loading">
              Loading versions…
            </p>
          )}

          {listState.state === "error" && (
            <p className="mt-3 text-sm text-destructive" data-testid="versions-list-error">
              Could not load versions. {listState.message}
            </p>
          )}

          {listState.state === "validation-error" && (
            <p
              className="mt-3 text-sm text-destructive"
              data-testid="versions-list-validation-error"
            >
              Version list payload is invalid. {listState.message}
            </p>
          )}

          {listState.state === "success" && listState.data.versions.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="versions-list-empty">
              No versions found.
            </p>
          )}

          {listState.state === "success" && listState.data.versions.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="versions-list">
              {listState.data.versions.map((version) => {
                const isSelected = selectedVersionId === version.id;

                return (
                  <li
                    key={version.id}
                    className="list-none"
                    data-testid={`version-list-item-${version.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedVersionId(version.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        "border-border text-foreground hover:bg-accent",
                        isSelected && "border-primary bg-accent",
                      )}
                    >
                      <p className="text-sm font-medium">{version.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {version.status}
                        {version.isDefault ? " • default" : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4" data-testid="version-detail">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Selected version
          </h2>

          {listState.state === "success" && listState.data.versions.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a version to inspect details.
            </p>
          )}

          {selectedVersionId && detailState.state === "loading" && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="version-detail-loading">
              Loading selected version…
            </p>
          )}

          {selectedVersionId && detailState.state === "not-found" && (
            <p className="mt-3 text-sm text-destructive" data-testid="version-detail-not-found">
              The selected version could not be found.
            </p>
          )}

          {selectedVersionId && detailState.state === "error" && (
            <p className="mt-3 text-sm text-destructive" data-testid="version-detail-error">
              Failed to load selected version. {detailState.message}
            </p>
          )}

          {selectedVersionId && detailState.state === "validation-error" && (
            <p
              className="mt-3 text-sm text-destructive"
              data-testid="version-detail-validation-error"
            >
              Selected version payload is invalid. {detailState.message}
            </p>
          )}

          {selectedVersionId && detailState.state === "success" && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-medium" data-testid="version-detail-id">
                  {detailState.data.id}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Label</dt>
                <dd className="font-medium" data-testid="version-detail-label">
                  {detailState.data.label}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-medium" data-testid="version-detail-slug">
                  {detailState.data.slug}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Space</dt>
                <dd className="font-medium" data-testid="version-detail-space">
                  {detailState.data.space}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium" data-testid="version-detail-status">
                  {detailState.data.status}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Default</dt>
                <dd className="font-medium" data-testid="version-detail-default">
                  {detailState.data.isDefault ? "Yes" : "No"}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium" data-testid="version-detail-created-at">
                  {formatTimestamp(detailState.data.createdAt)}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium" data-testid="version-detail-updated-at">
                  {formatTimestamp(detailState.data.updatedAt)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
