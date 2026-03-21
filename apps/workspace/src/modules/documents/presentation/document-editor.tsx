"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DocumentContentSchema,
  type DocumentContent,
  type WorkspaceDocument,
} from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import type { JSONContent } from "@tiptap/core";
import {
  EditorContent,
  fromDocumentContent,
  toDocumentContent,
} from "../../editor";
import { useDocumentAutosave } from "../application/use-document-autosave";
import { useUnsavedChangesGuard } from "../application/use-unsaved-changes-guard";
import {
  createWorkspaceDocumentDraft,
  createWorkspaceDocumentRevision,
  fetchWorkspaceDocumentRevisions,
  fetchWorkspaceDocumentEditor,
  fetchWorkspaceReleaseVersions,
  fetchWorkspaceSpaces,
} from "../infrastructure/workspace-documents-api";
import { generateDocumentSlug } from "../domain/slug";
import { usePublishWorkspaceDocumentAction } from "../application/use-workspace-documents";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";
import { DocumentStatusBadge } from "./document-status-badge";

const EMPTY_EDITOR_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Start writing your document..." }],
    },
  ],
};

interface DocumentEditorProps {
  mode: "create" | "edit";
  documentId?: string;
}

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

function getAutosaveIndicatorLabel(status: "idle" | "saving" | "saved" | "save-failed" | "validation-error") {
  switch (status) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "save-failed":
      return "Save failed";
    case "validation-error":
      return "Validation error";
    case "idle":
      return "Not saved";
  }
}

function extractRevisionPreview(content: DocumentContent): string {
  function collectTextBlocks(blocks: DocumentContent["children"]): string {
    for (const block of blocks) {
      if (block.type === "paragraph" || block.type === "heading") {
        const text = block.children.map((child) => child.text).join(" ").trim();
        if (text) {
          return text;
        }
      }

      if (block.type === "code_block") {
        const code = block.code.trim();
        if (code) {
          return code;
        }
      }

      if (block.type === "ordered_list" || block.type === "unordered_list") {
        for (const item of block.items) {
          const text = item.children.map((child) => child.text).join(" ").trim();
          if (text) {
            return text;
          }
        }
      }

      if (block.type === "callout") {
        const nested = collectTextBlocks(block.children);
        if (nested) {
          return nested;
        }
      }

      if (block.type === "tabs") {
        for (const tab of block.items) {
          const nested = collectTextBlocks(tab.children);
          if (nested) {
            return nested;
          }
        }
      }
    }

    return "";
  }

  const preview = collectTextBlocks(content.children);
  return preview || "No textual preview available for this revision.";
}

export function DocumentEditor({ mode, documentId }: DocumentEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [spaceId, setSpaceId] = useState("");
  const [releaseVersionId, setReleaseVersionId] = useState("");
  const [uploadEntityId] = useState(() => {
    if (typeof documentId === "string" && documentId.length > 0) {
      return documentId;
    }

    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return "00000000-0000-4000-8000-000000000000";
  });
  const [editorJson, setEditorJson] = useState<JSONContent | null>(
    mode === "create" ? EMPTY_EDITOR_CONTENT : null,
  );
  const [editorResetVersion, setEditorResetVersion] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isRevisionHistoryOpen, setIsRevisionHistoryOpen] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [isRestoreConfirmationOpen, setIsRestoreConfirmationOpen] = useState(false);
  const [isPublishConfirmationOpen, setIsPublishConfirmationOpen] = useState(false);
  const [documentStatusOverride, setDocumentStatusOverride] = useState<WorkspaceDocument["status"] | null>(null);
  const [publishFeedback, setPublishFeedback] = useState<ActionFeedback>(null);

  const spacesQuery = useQuery({
    queryKey: ["workspace", "spaces", "editor"],
    queryFn: fetchWorkspaceSpaces,
    retry: false,
    staleTime: 30_000,
  });

  const versionsQuery = useQuery({
    queryKey: ["workspace", "release-versions", spaceId || "none"],
    queryFn: () => fetchWorkspaceReleaseVersions(spaceId),
    enabled: spaceId.length > 0,
    retry: false,
    staleTime: 30_000,
  });

  const documentQuery = useQuery({
    queryKey: ["workspace", "documents", "editor", documentId ?? "none"],
    queryFn: () => fetchWorkspaceDocumentEditor(documentId ?? ""),
    enabled: mode === "edit" && typeof documentId === "string",
    retry: false,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createWorkspaceDocumentDraft,
  });

  const publishAction = usePublishWorkspaceDocumentAction();

  const revisionsQuery = useQuery({
    queryKey: ["workspace", "documents", "revisions", documentId ?? "none"],
    queryFn: () => fetchWorkspaceDocumentRevisions(documentId ?? ""),
    enabled: mode === "edit" && isRevisionHistoryOpen && typeof documentId === "string",
    retry: false,
    staleTime: 30_000,
  });

  const saveRevision = useCallback(async ({
    documentId: currentDocumentId,
    content_json,
  }: {
    documentId: string;
    content_json: Parameters<typeof createWorkspaceDocumentRevision>[0]["content_json"];
  }) => {
    const result = await createWorkspaceDocumentRevision({
      documentId: currentDocumentId,
      content_json,
    });

    if (result.status === "success") {
      return { status: "success" as const };
    }

    return {
      status: result.status,
      message: result.message,
    };
  }, []);

  const autosave = useDocumentAutosave({
    documentId: mode === "edit" ? documentId ?? null : null,
    editorJson,
    saveRevision,
  });

  useUnsavedChangesGuard(mode === "edit" && autosave.isDirty);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (spacesQuery.data?.status !== "success" || spaceId.length > 0) {
      return;
    }

    const [firstSpace] = spacesQuery.data.data;
    if (firstSpace) {
      setSpaceId(firstSpace.id);
    }
  }, [mode, spaceId, spacesQuery.data]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (versionsQuery.data?.status !== "success") {
      return;
    }

    const preferredVersion =
      versionsQuery.data.data.find((version) => version.isDefault)
      ?? versionsQuery.data.data.find((version) => version.status === "published")
      ?? versionsQuery.data.data[0];

    if (preferredVersion && preferredVersion.id !== releaseVersionId) {
      setReleaseVersionId(preferredVersion.id);
    }
  }, [mode, releaseVersionId, versionsQuery.data]);

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    if (documentQuery.data?.status !== "success") {
      return;
    }

    setTitle(documentQuery.data.data.title);
    setSlug(documentQuery.data.data.slug);
    setSpaceId(documentQuery.data.data.spaceId);
    setReleaseVersionId(documentQuery.data.data.releaseVersionId);
    setEditorJson(fromDocumentContent(documentQuery.data.data.content_json));
    setEditorResetVersion(0);
    setDocumentStatusOverride(null);
  }, [documentQuery.data, mode]);

  const sortedRevisions = useMemo(() => {
    if (revisionsQuery.data?.status !== "success") {
      return [];
    }

    return [...revisionsQuery.data.data].sort((first, second) => {
      const firstDate = new Date(first.createdAt).getTime();
      const secondDate = new Date(second.createdAt).getTime();

      if (firstDate === secondDate) {
        return second.revisionNumber - first.revisionNumber;
      }

      return secondDate - firstDate;
    });
  }, [revisionsQuery.data]);

  useEffect(() => {
    if (sortedRevisions.length === 0) {
      setSelectedRevisionId(null);
      return;
    }

    if (!selectedRevisionId || !sortedRevisions.some((revision) => revision.id === selectedRevisionId)) {
      setSelectedRevisionId(sortedRevisions[0].id);
    }
  }, [selectedRevisionId, sortedRevisions]);

  const selectedRevision = useMemo(
    () => sortedRevisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [selectedRevisionId, sortedRevisions],
  );

  const selectedRevisionPreview = useMemo(
    () => (selectedRevision ? extractRevisionPreview(selectedRevision.content_json) : ""),
    [selectedRevision],
  );

  function toggleRevisionHistory() {
    setIsRevisionHistoryOpen((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        setIsRestoreConfirmationOpen(false);
      }

      return nextValue;
    });
  }

  function openRestoreConfirmation() {
    if (!selectedRevision) {
      return;
    }

    setIsRestoreConfirmationOpen(true);
  }

  function confirmRestoreRevision() {
    if (!selectedRevision) {
      return;
    }

    setEditorJson(fromDocumentContent(selectedRevision.content_json));
    setEditorResetVersion((currentValue) => currentValue + 1);
    setIsRestoreConfirmationOpen(false);
  }

  const resolvedDocumentStatus: WorkspaceDocument["status"] =
    mode === "edit" && documentQuery.data?.status === "success"
      ? documentStatusOverride ?? documentQuery.data.data.status
      : "draft";

  const isPublishButtonDisabled =
    mode !== "edit"
    || documentQuery.data?.status !== "success"
    || publishAction.isPending
    || resolvedDocumentStatus === "published";

  function openPublishConfirmation() {
    if (isPublishButtonDisabled) {
      return;
    }

    setPublishFeedback(null);
    setIsPublishConfirmationOpen(true);
  }

  async function handleConfirmPublishDocument() {
    if (mode !== "edit" || documentQuery.data?.status !== "success") {
      return;
    }

    const currentDocumentId = documentQuery.data.data.id;
    const previousStatus = documentStatusOverride ?? documentQuery.data.data.status;

    setIsPublishConfirmationOpen(false);
    setPublishFeedback(null);
    setDocumentStatusOverride("published");

    try {
      const result = await publishAction.mutateAsync(currentDocumentId);

      if (result.status === "success") {
        setPublishFeedback({ tone: "success", message: result.data.message });
        return;
      }

      setDocumentStatusOverride(previousStatus);
      setPublishFeedback({ tone: "error", message: result.message });
    } catch (error) {
      setDocumentStatusOverride(previousStatus);
      setPublishFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown mutation failure",
      });
    }
  }

  useEffect(() => {
    if (mode !== "create" || isSlugManuallyEdited) {
      return;
    }

    setSlug(generateDocumentSlug(title));
  }, [isSlugManuallyEdited, mode, title]);

  const selectedSpaceName = useMemo(() => {
    if (spacesQuery.data?.status !== "success") {
      return "";
    }

    return spacesQuery.data.data.find((space) => space.id === spaceId)?.name ?? "";
  }, [spaceId, spacesQuery.data]);

  async function handleCreateDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editorJson) {
      setCreateError("Editor content is not ready yet.");
      return;
    }

    if (!title.trim()) {
      setCreateError("Document title is required.");
      return;
    }

    if (!slug.trim()) {
      setCreateError("Document slug is required.");
      return;
    }

    if (!spaceId) {
      setCreateError("Select a space before creating the document.");
      return;
    }

    if (!releaseVersionId) {
      setCreateError("No release version is available for the selected space.");
      return;
    }

    const mappedContent = toDocumentContent(editorJson);
    const parsedContent = DocumentContentSchema.safeParse(mappedContent);

    if (!parsedContent.success) {
      setCreateError("Editor content is invalid and cannot be submitted.");
      return;
    }

    setCreateError(null);

    const result = await createMutation.mutateAsync({
      title: title.trim(),
      slug: slug.trim(),
      spaceId,
      releaseVersionId,
      content_json: parsedContent.data,
    });

    if (result.status === "success") {
      router.push(`/admin/documents/${result.data.id}`);
      return;
    }

    setCreateError(result.message);
  }

  const isEditLoading = mode === "edit" && (documentQuery.isPending || documentQuery.isLoading);
  if (isEditLoading) {
    return (
      <AdminFeedbackState
        testId="document-editor-loading"
        title="Loading document"
        message="Please wait while the document editor initializes."
      />
    );
  }

  if (mode === "edit" && documentQuery.data?.status === "not-found") {
    return (
      <AdminFeedbackState
        testId="document-editor-not-found"
        title="Document not found"
        message="The selected document does not exist."
        variant="warning"
      />
    );
  }

  if (
    mode === "edit"
    && (documentQuery.data?.status === "error"
      || documentQuery.data?.status === "validation-error")
  ) {
    return (
      <AdminFeedbackState
        testId="document-editor-error"
        title="Could not load document"
        message={documentQuery.data.message}
        variant="destructive"
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="document-editor">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Documents
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {mode === "create" ? "Create Document" : "Edit Document"}
            </h1>
            <DocumentStatusBadge
              status={resolvedDocumentStatus}
              testId="document-editor-status-badge"
            />
          </div>
          <div className="flex items-center gap-3 text-sm">
            {mode === "edit" && (
              <>
                <button
                  type="button"
                  onClick={toggleRevisionHistory}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {isRevisionHistoryOpen ? "Close Revision History" : "Revision History"}
                </button>
                <button
                  type="button"
                  onClick={openPublishConfirmation}
                  disabled={isPublishButtonDisabled}
                  aria-disabled={isPublishButtonDisabled}
                  className={cn(
                    "rounded-md border border-border px-3 py-1.5 text-sm",
                    "hover:bg-accent",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {publishAction.isPending ? "Publishing…" : "Publish"}
                </button>
              </>
            )}
            <span
              className={cn(
                "rounded-md border px-2 py-1",
                autosave.status === "saved" && "border-emerald-300 text-emerald-700",
                autosave.status === "saving" && "border-amber-300 text-amber-700",
                (autosave.status === "save-failed" || autosave.status === "validation-error")
                && "border-destructive/50 text-destructive",
              )}
              data-testid="document-editor-autosave-indicator"
            >
              {getAutosaveIndicatorLabel(autosave.status)}
            </span>
            <Link
              href="/admin/documents"
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Back to documents
            </Link>
          </div>
        </div>
        {autosave.message && (
          <p className="text-sm text-destructive" data-testid="document-editor-autosave-message">
            {autosave.message}
          </p>
        )}
        {publishFeedback && (
          <div
            role={publishFeedback.tone === "error" ? "alert" : "status"}
            data-testid={`document-editor-publish-feedback-${publishFeedback.tone}`}
            className={cn(
              "fixed right-4 top-4 z-50 rounded-md border px-3 py-2 text-sm shadow-md",
              publishFeedback.tone === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            {publishFeedback.message}
          </div>
        )}
      </header>

      {isPublishConfirmationOpen && mode === "edit" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-editor-publish-title"
          data-testid="document-editor-publish-confirmation"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 id="document-editor-publish-title" className="text-lg font-semibold text-foreground">
              Confirm publish
            </h3>
            <p className="text-sm text-muted-foreground">
              Publish this document? This will make it publicly visible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPublishConfirmationOpen(false)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmPublishDocument();
                }}
                className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "edit" && isRevisionHistoryOpen && (
        <section
          className="space-y-3 rounded-lg border border-border bg-card p-4"
          data-testid="document-editor-revision-history-panel"
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Revision history
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a revision to preview and restore its content.
            </p>
          </div>

          {(revisionsQuery.isLoading || revisionsQuery.isPending) && (
            <p className="text-sm text-muted-foreground" data-testid="document-editor-revision-history-loading">
              Loading revisions...
            </p>
          )}

          {revisionsQuery.data?.status === "not-found" && (
            <p className="text-sm text-muted-foreground" data-testid="document-editor-revision-history-empty">
              No revisions found for this document.
            </p>
          )}

          {(revisionsQuery.data?.status === "error"
            || revisionsQuery.data?.status === "validation-error") && (
            <p className="text-sm text-destructive" data-testid="document-editor-revision-history-error">
              {revisionsQuery.data.message}
            </p>
          )}

          {revisionsQuery.data?.status === "success" && sortedRevisions.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="document-editor-revision-history-empty">
              No revisions found for this document.
            </p>
          )}

          {revisionsQuery.data?.status === "success" && sortedRevisions.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-[18rem_1fr]">
              <div className="space-y-2" data-testid="document-editor-revision-list">
                {sortedRevisions.map((revision) => {
                  const isSelected = revision.id === selectedRevisionId;

                  return (
                    <button
                      key={revision.id}
                      type="button"
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-primary bg-accent text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                      onClick={() => setSelectedRevisionId(revision.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="block font-medium text-foreground">
                        Revision #{revision.revisionNumber}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {revision.createdAt}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 rounded-md border border-border bg-background p-3" data-testid="document-editor-revision-preview">
                {selectedRevision ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Revision #{selectedRevision.revisionNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created at {selectedRevision.createdAt}
                      </p>
                    </div>

                    <p className="text-sm text-foreground" data-testid="document-editor-revision-preview-text">
                      {selectedRevisionPreview}
                    </p>

                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                      onClick={openRestoreConfirmation}
                    >
                      Restore this revision
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a revision to preview.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {isRestoreConfirmationOpen && selectedRevision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-editor-restore-title"
          data-testid="document-editor-restore-confirmation"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 id="document-editor-restore-title" className="text-lg font-semibold text-foreground">
              Restore revision #{selectedRevision.revisionNumber}?
            </h3>
            <p className="text-sm text-muted-foreground">
              Restoring this revision will replace the current editor content.
            </p>
            {autosave.isDirty && (
              <p className="text-sm text-destructive">
                Your current unsaved changes will be discarded.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRestoreConfirmationOpen(false)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestoreRevision}
                className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Confirm restore
              </button>
            </div>
          </div>
        </div>
      )}

      {spacesQuery.data?.status === "error" && (
        <AdminFeedbackState
          testId="document-editor-spaces-error"
          title="Could not load spaces"
          message={spacesQuery.data.message}
          variant="destructive"
        />
      )}

      {spacesQuery.data?.status === "validation-error" && (
        <AdminFeedbackState
          testId="document-editor-spaces-validation-error"
          title="Invalid spaces payload"
          message={spacesQuery.data.message}
          variant="destructive"
        />
      )}

      <form onSubmit={handleCreateDocument} className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </h2>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              readOnly={mode === "edit"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              data-testid="document-editor-title"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Slug</span>
            <input
              value={slug}
              onChange={(event) => {
                setIsSlugManuallyEdited(true);
                setSlug(generateDocumentSlug(event.target.value));
              }}
              readOnly={mode === "edit"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              data-testid="document-editor-slug"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Space</span>
            <select
              value={spaceId}
              onChange={(event) => setSpaceId(event.target.value)}
              disabled={mode === "edit"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              data-testid="document-editor-space"
            >
              <option value="">Select a space</option>
              {spacesQuery.data?.status === "success" && spacesQuery.data.data.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-muted-foreground" data-testid="document-editor-version-label">
            {releaseVersionId
              ? `Release version ID: ${releaseVersionId}`
              : "Release version will be selected automatically."}
          </div>

          {mode === "edit" && selectedSpaceName && (
            <p className="text-xs text-muted-foreground">
              Space: {selectedSpaceName}
            </p>
          )}

          {createError && (
            <p className="text-sm text-destructive" data-testid="document-editor-create-error">
              {createError}
            </p>
          )}

          {mode === "create" && (
            <button
              type="submit"
              disabled={createMutation.isPending}
              className={cn(
                "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                "border-border text-foreground hover:bg-accent",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {createMutation.isPending ? "Creating..." : "Create Document"}
            </button>
          )}
        </aside>

        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Editor
          </h2>
          <EditorContent
            key={`${mode}-${documentId ?? "new"}-${editorResetVersion}`}
            initialContent={editorJson ?? EMPTY_EDITOR_CONTENT}
            onChange={setEditorJson}
            uploadContext={{
              entityType: "document",
              entityId: uploadEntityId,
              field: "content-image",
            }}
          />
        </div>
      </form>
    </section>
  );
}
