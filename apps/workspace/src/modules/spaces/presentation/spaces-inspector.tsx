"use client";

import React, { useState } from "react";
import { cn } from "@emerald/ui/lib/cn";
import type { Space } from "@emerald/contracts";
import { useWorkspaceContext, WORKSPACE_SPACES_QUERY_KEY } from "../../shared/application/workspace-context";
import { useCreateWorkspaceSpaceAction, useUpdateWorkspaceSpaceAction, useDeleteWorkspaceSpaceAction } from "../application/use-workspace-spaces";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function SpacesInspector() {
  const { spaces, isLoading, activeSpaceId, setActiveSpaceId, refetchSpaces } = useWorkspaceContext();
  const createAction = useCreateWorkspaceSpaceAction();
  const updateAction = useUpdateWorkspaceSpaceAction();
  const deleteAction = useDeleteWorkspaceSpaceAction();

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;

  function openCreate() {
    setNewName("");
    setNewKey("");
    setNewDescription("");
    setCreateError(null);
    setIsCreateOpen(true);
  }

  function openEdit(space: Space) {
    setEditName(space.name);
    setEditDescription(space.description);
    setEditError(null);
    setSelectedSpaceId(space.id);
    setIsEditOpen(true);
  }

  function normalizeKey(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const key = normalizeKey(newKey || newName);
    if (!name) { setCreateError("Name is required."); return; }
    if (!key) { setCreateError("Key is required."); return; }

    setCreateError(null);
    const result = await createAction.mutateAsync({ key, name, description: newDescription.trim() });

    if (result.status === "success") {
      setFeedback({ tone: "success", message: `Space "${result.data.name}" created.` });
      setIsCreateOpen(false);
      refetchSpaces();
      return;
    }
    if ("message" in result) {
      setCreateError(result.message);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSpaceId) return;
    const name = editName.trim();
    if (!name) { setEditError("Name is required."); return; }

    setEditError(null);
    const result = await updateAction.mutateAsync({
      spaceId: selectedSpaceId,
      payload: { name, description: editDescription.trim() },
    });

    if (result.status === "success") {
      setFeedback({ tone: "success", message: `Space "${result.data.name}" updated.` });
      setIsEditOpen(false);
      refetchSpaces();
      return;
    }
    if ("message" in result) {
      setEditError(result.message);
    }
  }

  async function handleDelete() {
    if (!selectedSpaceId) return;
    const result = await deleteAction.mutateAsync(selectedSpaceId);

    if (result.status === "success") {
      setFeedback({ tone: "success", message: "Space deleted." });
      setIsDeleteConfirmOpen(false);
      setSelectedSpaceId(null);
      refetchSpaces();
      return;
    }
    if ("message" in result) {
      setFeedback({ tone: "error", message: result.message });
    }
    setIsDeleteConfirmOpen(false);
  }

  return (
    <section className="space-y-4" data-testid="admin-section-spaces">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Spaces</h1>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New Space
          </button>
        </div>
        <p className="text-muted-foreground">
          Manage workspaces. Each space contains its own documents, navigation tree, and release versions.
        </p>
      </header>

      {feedback?.tone === "success" && (
        <p className="text-sm text-emerald-600">{feedback.message}</p>
      )}
      {feedback?.tone === "error" && (
        <p className="text-sm text-destructive">{feedback.message}</p>
      )}

      {isLoading && (
        <AdminFeedbackState testId="spaces-loading" title="Loading spaces" message="Please wait..." />
      )}

      {!isLoading && spaces.length === 0 && (
        <AdminFeedbackState testId="spaces-empty" title="No spaces" message="Create your first space to get started." variant="warning" />
      )}

      {!isLoading && spaces.length > 0 && (
        <ul className="space-y-3" data-testid="spaces-list">
          {spaces.map((space) => (
            <li
              key={space.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{space.name}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {space.key}
                    </span>
                    {space.id === activeSpaceId && (
                      <span className="rounded-full border border-emerald-300 bg-emerald-50/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                        Active
                      </span>
                    )}
                  </div>
                  {space.description && (
                    <p className="text-sm text-muted-foreground">{space.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ID: {space.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {space.id !== activeSpaceId && (
                    <button
                      type="button"
                      onClick={() => setActiveSpaceId(space.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(space)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedSpaceId(space.id); setIsDeleteConfirmOpen(true); }}
                    className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Create Space</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input value={newName} onChange={(e) => { setNewName(e.target.value); if (!newKey) setNewKey(normalizeKey(e.target.value)); }} className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Key</span>
                <input value={newKey} onChange={(e) => setNewKey(normalizeKey(e.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                <p className="text-xs text-muted-foreground">URL-safe identifier. Auto-generated from name.</p>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </label>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={createAction.isPending} className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {createAction.isPending ? "Creating..." : "Create Space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {isEditOpen && selectedSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Edit Space: {selectedSpace.name}</h2>
            <form className="mt-4 space-y-3" onSubmit={handleUpdate}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </label>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={updateAction.isPending} className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {updateAction.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {isDeleteConfirmOpen && selectedSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Delete &quot;{selectedSpace.name}&quot;?</h3>
            <p className="text-sm text-muted-foreground">This will permanently delete the space and all its documents, versions, and navigation. This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="button" onClick={() => { void handleDelete(); }} disabled={deleteAction.isPending} className="rounded-md border border-destructive bg-destructive px-3 py-2 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-60">
                {deleteAction.isPending ? "Deleting..." : "Delete Space"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
