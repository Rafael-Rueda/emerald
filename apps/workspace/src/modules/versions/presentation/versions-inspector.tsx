"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  buildCanonicalVersionLabel,
  type WorkspaceVersion,
} from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import {
  usePublishWorkspaceVersionAction,
  useWorkspaceVersionDetail,
  useWorkspaceVersionsList,
} from "../application/use-workspace-versions";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

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
  const publishAction = usePublishWorkspaceVersionAction();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [versionStatusOverrides, setVersionStatusOverrides] = useState<
    Record<string, WorkspaceVersion["status"]>
  >({});
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

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

  useEffect(() => {
    const validIds = new Set(listVersions.map((version) => version.id));

    setVersionStatusOverrides((currentOverrides) => {
      let hasChanges = false;
      const nextOverrides: Record<string, WorkspaceVersion["status"]> = {};

      for (const [versionId, status] of Object.entries(currentOverrides)) {
        if (validIds.has(versionId)) {
          nextOverrides[versionId] = status;
          continue;
        }

        hasChanges = true;
      }

      return hasChanges ? nextOverrides : currentOverrides;
    });
  }, [listVersions]);

  const detailState = useWorkspaceVersionDetail(selectedVersionId);

  function getEffectiveStatus(versionId: string, baseStatus: WorkspaceVersion["status"]) {
    return versionStatusOverrides[versionId] ?? baseStatus;
  }

  const selectedVersionStatus =
    selectedVersionId && detailState.state === "success"
      ? getEffectiveStatus(detailState.data.id, detailState.data.status)
      : null;

  async function handlePublishSelectedVersion() {
    if (!selectedVersionId || detailState.state !== "success") {
      return;
    }

    const versionId = detailState.data.id;
    const previousStatus = getEffectiveStatus(versionId, detailState.data.status);
    const nextStatus: WorkspaceVersion["status"] = "published";

    setActionFeedback(null);
    setVersionStatusOverrides((currentOverrides) => ({
      ...currentOverrides,
      [versionId]: nextStatus,
    }));

    try {
      const result = await publishAction.mutateAsync(versionId);

      if (result.status === "success") {
        setActionFeedback({
          tone: "success",
          message: result.data.message,
        });
        return;
      }

      setVersionStatusOverrides((currentOverrides) => ({
        ...currentOverrides,
        [versionId]: previousStatus,
      }));
      setActionFeedback({
        tone: "error",
        message: result.message,
      });
    } catch (error) {
      setVersionStatusOverrides((currentOverrides) => ({
        ...currentOverrides,
        [versionId]: previousStatus,
      }));
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown mutation failure",
      });
    }
  }

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
            <AdminFeedbackState
              testId="versions-list-loading"
              title="Loading versions"
              message="Please wait while version records are fetched."
            />
          )}

          {listState.state === "error" && (
            <AdminFeedbackState
              testId="versions-list-error"
              title="Could not load versions"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "validation-error" && (
            <AdminFeedbackState
              testId="versions-list-validation-error"
              title="Version list payload is invalid"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "success" && listState.data.versions.length === 0 && (
            <AdminFeedbackState
              testId="versions-list-empty"
              title="No versions found"
              message="This workspace has no version records to inspect yet."
              variant="warning"
            />
          )}

          {listState.state === "success" && listState.data.versions.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="versions-list">
              {listState.data.versions.map((version) => {
                const isSelected = selectedVersionId === version.id;
                const status = getEffectiveStatus(version.id, version.status);
                const versionLabel = buildCanonicalVersionLabel(version.label);

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
                      <p className="text-sm font-medium">{versionLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        <span data-testid={`version-list-item-${version.id}-status`}>
                          {status}
                        </span>
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

          {selectedVersionId && detailState.state === "success" && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  void handlePublishSelectedVersion();
                }}
                disabled={publishAction.isPending || selectedVersionStatus === "published"}
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "border-border text-foreground hover:bg-accent",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {publishAction.isPending ? "Publishing…" : "Publish selected version"}
              </button>

              {actionFeedback?.tone === "success" && (
                <p className="text-sm text-emerald-600" data-testid="version-action-feedback-success">
                  {actionFeedback.message}
                </p>
              )}

              {actionFeedback?.tone === "error" && (
                <p className="text-sm text-destructive" data-testid="version-action-feedback-error">
                  {actionFeedback.message}
                </p>
              )}
            </div>
          )}

          {listState.state === "success" && listState.data.versions.length === 0 && (
            <AdminFeedbackState
              testId="version-detail-empty"
              title="No selected version"
              message="Add or load version records to inspect detail fields."
              variant="warning"
            />
          )}

          {selectedVersionId && detailState.state === "loading" && (
            <AdminFeedbackState
              testId="version-detail-loading"
              title="Loading selected version"
              message="Please wait while the selected record details are fetched."
            />
          )}

          {selectedVersionId && detailState.state === "not-found" && (
            <AdminFeedbackState
              testId="version-detail-not-found"
              title="Selected version was not found"
              message="The selected record no longer exists in the current workspace data."
              variant="warning"
            />
          )}

          {selectedVersionId && detailState.state === "error" && (
            <AdminFeedbackState
              testId="version-detail-error"
              title="Failed to load selected version"
              message={detailState.message}
              variant="destructive"
            />
          )}

          {selectedVersionId && detailState.state === "validation-error" && (
            <AdminFeedbackState
              testId="version-detail-validation-error"
              title="Selected version payload is invalid"
              message={detailState.message}
              variant="destructive"
            />
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
                  {buildCanonicalVersionLabel(detailState.data.label)}
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
                  {selectedVersionStatus ?? detailState.data.status}
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
