"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@emerald/ui/lib/cn";
import {
  useCreateWorkspaceVersionAction,
  usePublishWorkspaceVersionAction,
  useSetDefaultWorkspaceVersionAction,
  useWorkspaceVersionsList,
} from "../application/use-workspace-versions";
import { useWorkspaceContext } from "../../shared/application/workspace-context";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";
import { generateVersionKeyFromLabel } from "../domain/version-key";
import type { WorkspaceReleaseVersion } from "@emerald/data-access";

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
  const { activeSpaceId, activeSpace, refetchVersions } = useWorkspaceContext();
  const listState = useWorkspaceVersionsList();
  const createAction = useCreateWorkspaceVersionAction();
  const publishAction = usePublishWorkspaceVersionAction();
  const setDefaultAction = useSetDefaultWorkspaceVersionAction();

  const [versions, setVersions] = useState<WorkspaceReleaseVersion[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState("");
  const [newVersionKey, setNewVersionKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [publishingVersionId, setPublishingVersionId] = useState<string | null>(null);
  const [settingDefaultVersionId, setSettingDefaultVersionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

  const listVersions = listState.state === "success" ? listState.data : null;

  useEffect(() => {
    if (!listVersions) {
      return;
    }

    setVersions(listVersions);
  }, [listVersions]);

  const sortedVersions = useMemo(
    () => [...versions].sort((first, second) => first.key.localeCompare(second.key)),
    [versions],
  );

  function openCreateDialog() {
    setNewVersionLabel("");
    setNewVersionKey("");
    setIsKeyManuallyEdited(false);
    setCreateError(null);
    setIsCreateDialogOpen(true);
  }

  function normalizeVersionKey(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function replaceVersion(targetVersion: WorkspaceReleaseVersion) {
    setVersions((currentVersions) => currentVersions.map((version) => (
      version.id === targetVersion.id ? targetVersion : version
    )));
  }

  function applyDefaultVersion(versionId: string) {
    setVersions((currentVersions) => currentVersions.map((version) => ({
      ...version,
      isDefault: version.id === versionId,
    })));
  }

  function applyOptimisticPublish(versionId: string) {
    setVersions((currentVersions) => currentVersions.map((version) => (
      version.id === versionId
        ? {
          ...version,
          status: "published",
          publishedAt: version.publishedAt ?? new Date().toISOString(),
        }
        : version
    )));
  }

  async function handleCreateVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const label = newVersionLabel.trim();
    const key = normalizeVersionKey(newVersionKey);

    if (!label) {
      setCreateError("Version label is required.");
      return;
    }

    if (!key) {
      setCreateError("Version key is required.");
      return;
    }

    setCreateError(null);
    setActionFeedback(null);

    const result = await createAction.mutateAsync({
      spaceId: activeSpaceId!,
      label,
      key,
    });

    if (result.status === "success") {
      setVersions((currentVersions) => [...currentVersions, result.data]);
      setActionFeedback({
        tone: "success",
        message: `Version ${result.data.key} created successfully.`,
      });
      setIsCreateDialogOpen(false);
      refetchVersions();
      return;
    }

    if (/409|already exists/i.test(result.message)) {
      setCreateError(`Version key "${key}" already exists for this space.`);
      return;
    }

    setCreateError(result.message);
  }

  async function handlePublishVersion(versionId: string) {
    const previousVersions = versions;

    setActionFeedback(null);
    setPublishingVersionId(versionId);
    applyOptimisticPublish(versionId);

    const result = await publishAction.mutateAsync(versionId);

    if (result.status === "success") {
      replaceVersion(result.data);
      setPublishingVersionId(null);
      setActionFeedback({
        tone: "success",
        message: `Version ${result.data.key} is now published.`,
      });
      refetchVersions();
      return;
    }

    setVersions(previousVersions);
    setPublishingVersionId(null);
    setActionFeedback({
      tone: "error",
      message: result.message,
    });
  }

  async function handleSetDefaultVersion(versionId: string) {
    const previousVersions = versions;

    setActionFeedback(null);
    setSettingDefaultVersionId(versionId);
    applyDefaultVersion(versionId);

    const result = await setDefaultAction.mutateAsync(versionId);

    if (result.status === "success") {
      replaceVersion(result.data);
      applyDefaultVersion(result.data.id);
      setSettingDefaultVersionId(null);
      setActionFeedback({
        tone: "success",
        message: `Version ${result.data.key} is now the default.`,
      });
      refetchVersions();
      return;
    }

    setVersions(previousVersions);
    setSettingDefaultVersionId(null);
    setActionFeedback({
      tone: "error",
      message: result.message,
    });
  }

  return (
    <section className="space-y-4" data-testid="admin-section-versions">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Versions</h1>
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New Version
          </button>
        </div>
        <p className="text-muted-foreground">
          Manage release versions for the selected space, publish drafts, and set the
          default version shown in docs.
        </p>
      </header>

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

      {listState.state === "success" && sortedVersions.length === 0 && (
        <AdminFeedbackState
          testId="versions-list-empty"
          title="No versions found"
          message="Create your first release version to begin managing version lifecycles."
          variant="warning"
        />
      )}

      {listState.state === "success" && sortedVersions.length > 0 && (
        <ul className="space-y-3" data-testid="versions-list">
          {sortedVersions.map((version) => (
            <li
              key={version.id}
              className="rounded-lg border border-border bg-card p-4"
              data-testid={`version-list-item-${version.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground" data-testid={`version-label-${version.id}`}>
                      {version.label}
                    </p>
                    <span
                      className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                      data-testid={`version-key-${version.id}`}
                    >
                      {version.key}
                    </span>
                    {version.isDefault && (
                      <span
                        className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        data-testid={`version-default-badge-${version.id}`}
                      >
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span data-testid={`version-status-${version.id}`}>{version.status}</span>
                    <span>Created {formatTimestamp(version.createdAt)}</span>
                    <span>Updated {formatTimestamp(version.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handlePublishVersion(version.id);
                    }}
                    disabled={publishingVersionId === version.id || version.status === "published"}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      "border-border hover:bg-accent",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {publishingVersionId === version.id ? "Publishing…" : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleSetDefaultVersion(version.id);
                    }}
                    disabled={settingDefaultVersionId === version.id || version.isDefault}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      "border-border hover:bg-accent",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {settingDefaultVersionId === version.id ? "Setting default…" : "Set default"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreateDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="versions-create-dialog-title"
          data-testid="versions-create-dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h2 id="versions-create-dialog-title" className="text-lg font-semibold text-foreground">
              Create Version
            </h2>

            <form className="mt-4 space-y-3" onSubmit={handleCreateVersion}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Space</span>
                <input
                  type="text"
                  disabled
                  value={activeSpace?.name ?? "No space selected"}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 disabled:opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Controlled by the sidebar space selector.
                </p>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Label</span>
                <input
                  type="text"
                  value={newVersionLabel}
                  onChange={(event) => {
                    const nextLabel = event.target.value;
                    setNewVersionLabel(nextLabel);

                    if (!isKeyManuallyEdited) {
                      setNewVersionKey(generateVersionKeyFromLabel(nextLabel));
                    }
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  data-testid="versions-create-label"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Key</span>
                <input
                  type="text"
                  value={newVersionKey}
                  onChange={(event) => {
                    setIsKeyManuallyEdited(true);
                    setNewVersionKey(normalizeVersionKey(event.target.value));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  data-testid="versions-create-key"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from label (example: Version 2 → v2). You can edit it.
                </p>
              </label>

              {createError && (
                <p className="text-sm text-destructive" data-testid="versions-create-error">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAction.isPending}
                  className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createAction.isPending ? "Creating…" : "Create version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
