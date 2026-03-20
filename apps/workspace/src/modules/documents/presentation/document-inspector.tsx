"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@emerald/ui/lib/cn";
import {
  useWorkspaceDocumentDetail,
  useWorkspaceDocumentsList,
} from "../application/use-workspace-documents";

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
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );

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

  const detailState = useWorkspaceDocumentDetail(selectedDocumentId);

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
            <p className="mt-3 text-sm text-muted-foreground" data-testid="documents-list-loading">
              Loading documents…
            </p>
          )}

          {listState.state === "error" && (
            <p className="mt-3 text-sm text-destructive" data-testid="documents-list-error">
              Could not load documents. {listState.message}
            </p>
          )}

          {listState.state === "validation-error" && (
            <p
              className="mt-3 text-sm text-destructive"
              data-testid="documents-list-validation-error"
            >
              Document list payload is invalid. {listState.message}
            </p>
          )}

          {listState.state === "success" && listState.data.documents.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="documents-list-empty">
              No documents found.
            </p>
          )}

          {listState.state === "success" && listState.data.documents.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="documents-list">
              {listState.data.documents.map((document) => {
                const isSelected = selectedDocumentId === document.id;

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
                      <p className="text-sm font-medium">{document.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.space}/{document.slug}
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

          {listState.state === "success" && listState.data.documents.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Select a document to inspect details.</p>
          )}

          {selectedDocumentId && detailState.state === "loading" && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="document-detail-loading">
              Loading selected document…
            </p>
          )}

          {selectedDocumentId && detailState.state === "not-found" && (
            <p className="mt-3 text-sm text-destructive" data-testid="document-detail-not-found">
              The selected document could not be found.
            </p>
          )}

          {selectedDocumentId && detailState.state === "error" && (
            <p className="mt-3 text-sm text-destructive" data-testid="document-detail-error">
              Failed to load selected document. {detailState.message}
            </p>
          )}

          {selectedDocumentId && detailState.state === "validation-error" && (
            <p
              className="mt-3 text-sm text-destructive"
              data-testid="document-detail-validation-error"
            >
              Selected document payload is invalid. {detailState.message}
            </p>
          )}

          {selectedDocumentId && detailState.state === "success" && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-medium" data-testid="document-detail-id">
                  {detailState.data.id}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium" data-testid="document-detail-title">
                  {detailState.data.title}
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
                  {detailState.data.status}
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
