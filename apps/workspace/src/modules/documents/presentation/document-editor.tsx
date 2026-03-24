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
} from "../infrastructure/workspace-documents-api";
import { useWorkspaceContext } from "../../shared/application/workspace-context";
import { generateDocumentSlug } from "../domain/slug";
import { usePublishWorkspaceDocumentAction, useUnpublishWorkspaceDocumentAction } from "../application/use-workspace-documents";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";
import { DocumentStatusBadge } from "./document-status-badge";

const EMPTY_EDITOR_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
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

function getAutosaveIndicatorLabel(status: "idle" | "saving" | "saved" | "save-failed" | "validation-error", lastSavedAt: Date | null) {
  switch (status) {
    case "saving":
      return "Saving...";
    case "saved":
      return lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString()}` : "Saved";
    case "save-failed":
      return "Save failed";
    case "validation-error":
      return "Validation error";
    case "idle":
      return "Not saved";
  }
}

/** Read-only rendered preview of a revision's content_json */
function RevisionContentPreview({ content }: { content: DocumentContent }) {
  const tiptapJson = useMemo(() => fromDocumentContent(content), [content]);

  return (
    <EditorContent
      key={JSON.stringify(content).slice(0, 64)}
      initialContent={tiptapJson}
      editable={false}
    />
  );
}

export function DocumentEditor({ mode, documentId }: DocumentEditorProps) {
  const router = useRouter();
  const { spaces, activeSpaceId, activeSpace, activeVersionId, versions } = useWorkspaceContext();
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
  const [editingRevisionNumber, setEditingRevisionNumber] = useState<number | null>(null);
  const [isPublishConfirmationOpen, setIsPublishConfirmationOpen] = useState(false);
  const [documentStatusOverride, setDocumentStatusOverride] = useState<WorkspaceDocument["status"] | null>(null);
  const [publishFeedback, setPublishFeedback] = useState<ActionFeedback>(null);

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
  const unpublishAction = useUnpublishWorkspaceDocumentAction();

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
    documentId: mode === "edit" && editingRevisionNumber === null ? documentId ?? null : null,
    editorJson,
    saveRevision,
  });

  useUnsavedChangesGuard(mode === "edit" && autosave.isDirty);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (spaceId.length > 0 || !activeSpaceId) {
      return;
    }

    setSpaceId(activeSpaceId);
  }, [mode, spaceId, activeSpaceId]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (activeVersionId && activeVersionId !== releaseVersionId) {
      setReleaseVersionId(activeVersionId);
    }
  }, [mode, activeVersionId, releaseVersionId]);

  const hasLoadedEditorContentRef = React.useRef(false);

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    if (documentQuery.data?.status !== "success") {
      return;
    }

    if (hasLoadedEditorContentRef.current) {
      return;
    }

    hasLoadedEditorContentRef.current = true;
    setTitle(documentQuery.data.data.title);
    setSlug(documentQuery.data.data.slug);
    setSpaceId(documentQuery.data.data.spaceId);
    setReleaseVersionId(documentQuery.data.data.releaseVersionId);
    setEditorJson(fromDocumentContent(documentQuery.data.data.content_json));
    setEditorResetVersion((v) => v + 1);
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

  const REVISIONS_PER_PAGE = 10;
  const [revisionsPage, setRevisionsPage] = useState(0);
  const totalRevisionPages = Math.max(1, Math.ceil(sortedRevisions.length / REVISIONS_PER_PAGE));
  const paginatedRevisions = useMemo(
    () => sortedRevisions.slice(revisionsPage * REVISIONS_PER_PAGE, (revisionsPage + 1) * REVISIONS_PER_PAGE),
    [sortedRevisions, revisionsPage],
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
    setEditingRevisionNumber(selectedRevision.revisionNumber);
    setIsRestoreConfirmationOpen(false);
  }

  async function handleCreateNewDraft() {
    if (!editorJson || !documentId) {
      return;
    }

    const mappedContent = toDocumentContent(editorJson);
    const parsedContent = DocumentContentSchema.safeParse(mappedContent);

    if (!parsedContent.success) {
      setPublishFeedback({ tone: "error", message: "Editor content is invalid." });
      return;
    }

    const result = await createWorkspaceDocumentRevision({
      documentId,
      content_json: parsedContent.data,
      changeNote: editingRevisionNumber
        ? `New draft from revision #${editingRevisionNumber}`
        : "New draft",
    });

    if (result.status === "success") {
      setEditingRevisionNumber(null);
      setPublishFeedback({ tone: "success", message: "New draft revision created." });
      void revisionsQuery.refetch();
      return;
    }

    setPublishFeedback({ tone: "error", message: result.message });
  }

  const resolvedDocumentStatus: WorkspaceDocument["status"] =
    mode === "edit" && documentQuery.data?.status === "success"
      ? documentStatusOverride ?? documentQuery.data.data.status
      : "draft";

  const isPublishButtonDisabled =
    mode !== "edit"
    || documentQuery.data?.status !== "success"
    || publishAction.isPending
    || unpublishAction.isPending;

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

  async function handleUnpublishDocument() {
    if (mode !== "edit" || documentQuery.data?.status !== "success") {
      return;
    }

    const currentDocumentId = documentQuery.data.data.id;
    const previousStatus = documentStatusOverride ?? documentQuery.data.data.status;

    setPublishFeedback(null);
    setDocumentStatusOverride("draft");

    try {
      const result = await unpublishAction.mutateAsync(currentDocumentId);

      if (result.status === "success") {
        setPublishFeedback({ tone: "success", message: "Document unpublished." });
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
    if (spaceId === activeSpaceId) {
      return activeSpace?.name ?? "";
    }

    return spaces.find((space) => space.id === spaceId)?.name ?? "";
  }, [spaceId, activeSpaceId, activeSpace, spaces]);

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
                {resolvedDocumentStatus === "published" ? (
                  <button
                    type="button"
                    onClick={() => { void handleUnpublishDocument(); }}
                    disabled={isPublishButtonDisabled}
                    className={cn(
                      "rounded-md border border-amber-500 px-3 py-1.5 text-sm text-amber-600",
                      "hover:bg-amber-500/10",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {unpublishAction.isPending ? "Unpublishing…" : "Unpublish"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openPublishConfirmation}
                    disabled={isPublishButtonDisabled}
                    className={cn(
                      "rounded-md border border-border px-3 py-1.5 text-sm",
                      "hover:bg-accent",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {publishAction.isPending ? "Publishing…" : "Publish"}
                  </button>
                )}
              </>
            )}
            {editingRevisionNumber !== null ? (
              <span
                className="rounded-md border border-amber-400 bg-amber-500/10 px-2 py-1 text-amber-500"
                data-testid="document-editor-revision-indicator"
              >
                Editing Revision #{editingRevisionNumber}
              </span>
            ) : (
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
                {getAutosaveIndicatorLabel(autosave.status, autosave.lastSavedAt)}
              </span>
            )}
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
              <div className="flex flex-col gap-2" data-testid="document-editor-revision-list">
                <div className="space-y-1.5 flex-1">
                  {paginatedRevisions.map((revision) => {
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
                          {new Date(revision.createdAt).toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination controls */}
                {totalRevisionPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <button
                      type="button"
                      disabled={revisionsPage === 0}
                      onClick={() => setRevisionsPage((p) => Math.max(0, p - 1))}
                      className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span>
                      {revisionsPage + 1} / {totalRevisionPages}
                    </span>
                    <button
                      type="button"
                      disabled={revisionsPage >= totalRevisionPages - 1}
                      onClick={() => setRevisionsPage((p) => Math.min(totalRevisionPages - 1, p + 1))}
                      className="rounded border border-border px-2 py-1 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-md border border-border bg-background p-4 overflow-y-auto max-h-[32rem]" data-testid="document-editor-revision-preview">
                {selectedRevision ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          Revision #{selectedRevision.revisionNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created at {selectedRevision.createdAt}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
                        onClick={openRestoreConfirmation}
                      >
                        Restore this revision
                      </button>
                    </div>

                    <div className="border-t border-border pt-3" data-testid="document-editor-revision-preview-text">
                      <RevisionContentPreview content={selectedRevision.content_json} />
                    </div>
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
              disabled
              className="w-full rounded-md border border-border bg-background px-3 py-2 disabled:opacity-60"
              data-testid="document-editor-space"
            >
              <option value="">Select a space</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">
                Controlled by the sidebar space selector.
              </p>
            )}
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Version</span>
            <select
              value={releaseVersionId}
              disabled
              className="w-full rounded-md border border-border bg-background px-3 py-2 disabled:opacity-60"
              data-testid="document-editor-version"
            >
              <option value="">Select a version</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label} ({version.key}){version.isDefault ? " - Default" : ""}
                </option>
              ))}
            </select>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">
                Controlled by the sidebar version selector.
              </p>
            )}
          </label>

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

        <div className="min-w-0 space-y-3">
          {mode === "edit" && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Editor
              </h2>
              <button
                type="button"
                onClick={() => { void handleCreateNewDraft(); }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  editingRevisionNumber !== null
                    ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
                    : "border-border text-foreground hover:bg-accent",
                )}
                data-testid="document-editor-create-draft"
              >
                {editingRevisionNumber !== null
                  ? `Save as New Draft (from Rev #${editingRevisionNumber})`
                  : "Create New Draft"}
              </button>
            </div>
          )}
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
