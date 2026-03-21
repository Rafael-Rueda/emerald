"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DocumentContentSchema } from "@emerald/contracts";
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
  fetchWorkspaceDocumentEditor,
  fetchWorkspaceReleaseVersions,
  fetchWorkspaceSpaces,
} from "../infrastructure/workspace-documents-api";
import { generateDocumentSlug } from "../domain/slug";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";

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

export function DocumentEditor({ mode, documentId }: DocumentEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [spaceId, setSpaceId] = useState("");
  const [releaseVersionId, setReleaseVersionId] = useState("");
  const [editorJson, setEditorJson] = useState<JSONContent | null>(
    mode === "create" ? EMPTY_EDITOR_CONTENT : null,
  );
  const [createError, setCreateError] = useState<string | null>(null);

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
  }, [documentQuery.data, mode]);

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
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === "create" ? "Create Document" : "Edit Document"}
          </h1>
          <div className="flex items-center gap-3 text-sm">
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
      </header>

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
            initialContent={editorJson ?? EMPTY_EDITOR_CONTENT}
            onChange={setEditorJson}
          />
        </div>
      </form>
    </section>
  );
}
