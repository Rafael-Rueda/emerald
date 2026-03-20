"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildCanonicalDocumentTitleLabel,
  buildCanonicalPathLabel,
  type WorkspaceDocument,
} from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import {
  usePublishWorkspaceDocumentAction,
  useWorkspaceDocumentDetail,
  useWorkspaceDocumentsList,
} from "../application/use-workspace-documents";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

function formatUpdatedAt(value: string): string {
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

export function DocumentInspector() {
  const listState = useWorkspaceDocumentsList();
  const publishAction = usePublishWorkspaceDocumentAction();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [documentStatusOverrides, setDocumentStatusOverrides] = useState<
    Record<string, WorkspaceDocument["status"]>
  >({});
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

  const listDocuments = useMemo(() => {
    if (listState.state !== "success") {
      return [];
    }

    return listState.data.documents;
  }, [listState]);

  useEffect(() => {
    if (listDocuments.length === 0) {
      setSelectedDocumentId(null);
      return;
    }

    setSelectedDocumentId((currentSelectedId) => {
      if (
        currentSelectedId &&
        listDocuments.some((document) => document.id === currentSelectedId)
      ) {
        return currentSelectedId;
      }

      return listDocuments[0].id;
    });
  }, [listDocuments]);

  useEffect(() => {
    const validIds = new Set(listDocuments.map((document) => document.id));

    setDocumentStatusOverrides((currentOverrides) => {
      let hasChanges = false;
      const nextOverrides: Record<string, WorkspaceDocument["status"]> = {};

      for (const [documentId, status] of Object.entries(currentOverrides)) {
        if (validIds.has(documentId)) {
          nextOverrides[documentId] = status;
          continue;
        }

        hasChanges = true;
      }

      return hasChanges ? nextOverrides : currentOverrides;
    });
  }, [listDocuments]);

  const detailState = useWorkspaceDocumentDetail(selectedDocumentId);

  function getEffectiveStatus(documentId: string, baseStatus: WorkspaceDocument["status"]) {
    return documentStatusOverrides[documentId] ?? baseStatus;
  }

  const selectedDocumentStatus =
    selectedDocumentId && detailState.state === "success"
      ? getEffectiveStatus(detailState.data.id, detailState.data.status)
      : null;

  async function handlePublishSelectedDocument() {
    if (!selectedDocumentId || detailState.state !== "success") {
      return;
    }

    const documentId = detailState.data.id;
    const previousStatus = getEffectiveStatus(documentId, detailState.data.status);
    const nextStatus: WorkspaceDocument["status"] = "published";

    setActionFeedback(null);
    setDocumentStatusOverrides((currentOverrides) => ({
      ...currentOverrides,
      [documentId]: nextStatus,
    }));

    try {
      const result = await publishAction.mutateAsync(documentId);

      if (result.status === "success") {
        setActionFeedback({
          tone: "success",
          message: result.data.message,
        });
        return;
      }

      setDocumentStatusOverrides((currentOverrides) => ({
        ...currentOverrides,
        [documentId]: previousStatus,
      }));
      setActionFeedback({
        tone: "error",
        message: result.message,
      });
    } catch (error) {
      setDocumentStatusOverrides((currentOverrides) => ({
        ...currentOverrides,
        [documentId]: previousStatus,
      }));
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown mutation failure",
      });
    }
  }

  return (
    <section className="space-y-4" data-testid="admin-section-documents">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
        <p className="text-muted-foreground">
          Inspect mocked document records and review the selected item details.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Records
          </h2>

          {listState.state === "loading" && (
            <AdminFeedbackState
              testId="documents-list-loading"
              title="Loading documents"
              message="Please wait while document records are fetched."
            />
          )}

          {listState.state === "error" && (
            <AdminFeedbackState
              testId="documents-list-error"
              title="Could not load documents"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "validation-error" && (
            <AdminFeedbackState
              testId="documents-list-validation-error"
              title="Document list payload is invalid"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "success" && listState.data.documents.length === 0 && (
            <AdminFeedbackState
              testId="documents-list-empty"
              title="No documents found"
              message="This workspace has no document records to inspect yet."
              variant="warning"
            />
          )}

          {listState.state === "success" && listState.data.documents.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="documents-list">
              {listState.data.documents.map((document) => {
                const isSelected = selectedDocumentId === document.id;
                const status = getEffectiveStatus(document.id, document.status);
                const pathLabel = buildCanonicalPathLabel({
                  space: document.space,
                  slug: document.slug,
                });

                return (
                  <li
                    key={document.id}
                    className="list-none"
                    data-testid={`document-list-item-${document.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        "border-border text-foreground hover:bg-accent",
                        isSelected && "border-primary bg-accent",
                      )}
                    >
                      <p className="text-sm font-medium">
                        {buildCanonicalDocumentTitleLabel(document.title)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pathLabel} •{" "}
                        <span data-testid={`document-list-item-${document.id}-status`}>
                          {status}
                        </span>
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4" data-testid="document-detail">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Selected document
          </h2>

          {selectedDocumentId && detailState.state === "success" && (
            <div className="mt-3 space-y-2">
              <Link
                href={`/admin/ai-context?entityType=document&entityId=${encodeURIComponent(detailState.data.id)}`}
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "border-border text-foreground hover:bg-accent",
                )}
                data-testid="document-open-ai-context-link"
              >
                Open AI context for selected document
              </Link>

              <button
                type="button"
                onClick={() => {
                  void handlePublishSelectedDocument();
                }}
                disabled={publishAction.isPending || selectedDocumentStatus === "published"}
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "border-border text-foreground hover:bg-accent",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {publishAction.isPending ? "Publishing…" : "Publish selected document"}
              </button>

              {actionFeedback?.tone === "success" && (
                <p className="text-sm text-emerald-600" data-testid="document-action-feedback-success">
                  {actionFeedback.message}
                </p>
              )}

              {actionFeedback?.tone === "error" && (
                <p className="text-sm text-destructive" data-testid="document-action-feedback-error">
                  {actionFeedback.message}
                </p>
              )}
            </div>
          )}

          {listState.state === "success" && listState.data.documents.length === 0 && (
            <AdminFeedbackState
              testId="document-detail-empty"
              title="No selected document"
              message="Add or load document records to inspect detail fields."
              variant="warning"
            />
          )}

          {selectedDocumentId && detailState.state === "loading" && (
            <AdminFeedbackState
              testId="document-detail-loading"
              title="Loading selected document"
              message="Please wait while the selected record details are fetched."
            />
          )}

          {selectedDocumentId && detailState.state === "not-found" && (
            <AdminFeedbackState
              testId="document-detail-not-found"
              title="Selected document was not found"
              message="The selected record no longer exists in the current workspace data."
              variant="warning"
            />
          )}

          {selectedDocumentId && detailState.state === "error" && (
            <AdminFeedbackState
              testId="document-detail-error"
              title="Failed to load selected document"
              message={detailState.message}
              variant="destructive"
            />
          )}

          {selectedDocumentId && detailState.state === "validation-error" && (
            <AdminFeedbackState
              testId="document-detail-validation-error"
              title="Selected document payload is invalid"
              message={detailState.message}
              variant="destructive"
            />
          )}

          {selectedDocumentId && detailState.state === "success" && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Path</dt>
                <dd className="font-medium" data-testid="document-detail-path-label">
                  {buildCanonicalPathLabel({
                    space: detailState.data.space,
                    slug: detailState.data.slug,
                  })}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-medium" data-testid="document-detail-id">
                  {detailState.data.id}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium" data-testid="document-detail-title">
                  {buildCanonicalDocumentTitleLabel(detailState.data.title)}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-medium" data-testid="document-detail-slug">
                  {detailState.data.slug}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Space</dt>
                <dd className="font-medium" data-testid="document-detail-space">
                  {detailState.data.space}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium" data-testid="document-detail-status">
                  {selectedDocumentStatus ?? detailState.data.status}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium" data-testid="document-detail-updated-at">
                  {formatUpdatedAt(detailState.data.updatedAt)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
