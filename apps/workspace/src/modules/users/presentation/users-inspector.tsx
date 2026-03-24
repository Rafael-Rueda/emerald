"use client";

import React, { useState } from "react";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";
import {
  useWorkspaceUsers,
  useCreateWorkspaceUserAction,
  useUpdateWorkspaceUserAction,
  useDeleteWorkspaceUserAction,
} from "../application/use-workspace-users";
import type { UserResponse } from "../infrastructure/workspace-users-api";

const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "AUTHOR", "USER", "VIEWER"] as const;

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: "border-amber-400 text-amber-500 bg-amber-50/10",
    ADMIN: "border-blue-400 text-blue-500 bg-blue-50/10",
    AUTHOR: "border-purple-400 text-purple-500 bg-purple-50/10",
    USER: "border-slate-400 text-slate-500 bg-slate-50/10",
    VIEWER: "border-gray-400 text-gray-500 bg-gray-50/10",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${colors[role] ?? "border-border text-muted-foreground"}`}>
      {role}
    </span>
  );
}

function RoleSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (roles: string[]) => void;
}) {
  function toggle(role: string) {
    if (selected.includes(role)) {
      onChange(selected.filter((r) => r !== role));
    } else {
      onChange([...selected, role]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => toggle(role)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selected.includes(role)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}

export function UsersInspector() {
  const { data: users = [], isLoading } = useWorkspaceUsers();
  const createAction = useCreateWorkspaceUserAction();
  const updateAction = useUpdateWorkspaceUserAction();
  const deleteAction = useDeleteWorkspaceUserAction();

  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  function openCreate() {
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setCreateError(null);
    setIsCreateOpen(true);
    setFeedback(null);
  }

  function openEdit(user: UserResponse) {
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRoles([...user.roles]);
    setEditError(null);
    setSelectedUser(user);
    setIsEditOpen(true);
    setFeedback(null);
  }

  function openDeleteConfirm(user: UserResponse) {
    setSelectedUser(user);
    setIsDeleteConfirmOpen(true);
    setFeedback(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const username = newUsername.trim();
    const email = newEmail.trim();

    if (!username) { setCreateError("Username is required."); return; }
    if (!email) { setCreateError("Email is required."); return; }
    if (newPassword.length < 8) { setCreateError("Password must be at least 8 characters."); return; }

    setCreateError(null);
    const result = await createAction.mutateAsync({ username, email, password: newPassword });

    if (result.status === "success") {
      setFeedback({ tone: "success", message: `User "${result.data.username}" created.` });
      setIsCreateOpen(false);
      return;
    }
    if ("message" in result) {
      setCreateError(result.message);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    const username = editUsername.trim();
    if (!username) { setEditError("Username is required."); return; }
    if (editRoles.length === 0) { setEditError("At least one role is required."); return; }
    if (editPassword && editPassword.length < 8) { setEditError("Password must be at least 8 characters."); return; }

    setEditError(null);
    const payload: { username?: string; email?: string; password?: string; roles?: string[] } = {};

    if (username !== selectedUser.username) payload.username = username;
    if (editEmail.trim() !== selectedUser.email) payload.email = editEmail.trim();
    if (editPassword) payload.password = editPassword;

    const rolesChanged =
      editRoles.length !== selectedUser.roles.length ||
      editRoles.some((r) => !selectedUser.roles.includes(r));

    if (rolesChanged) payload.roles = editRoles;

    if (Object.keys(payload).length === 0) {
      setIsEditOpen(false);
      return;
    }

    const result = await updateAction.mutateAsync({ userId: selectedUser.id, payload });

    if (result.status === "success") {
      setFeedback({ tone: "success", message: `User "${result.data.username}" updated.` });
      setIsEditOpen(false);
      return;
    }
    if ("message" in result) {
      setEditError(result.message);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    const result = await deleteAction.mutateAsync(selectedUser.id);

    if (result.status === "success") {
      setFeedback({ tone: "success", message: `User "${selectedUser.username}" deleted.` });
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
      return;
    }
    if ("message" in result) {
      setFeedback({ tone: "error", message: result.message });
    }
    setIsDeleteConfirmOpen(false);
  }

  return (
    <section className="space-y-4" data-testid="admin-section-users">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New User
          </button>
        </div>
        <p className="text-muted-foreground">
          Manage user accounts and roles. Admins can create, edit, and delete other users.
        </p>
      </header>

      {feedback?.tone === "success" && (
        <p className="text-sm text-emerald-600">{feedback.message}</p>
      )}
      {feedback?.tone === "error" && (
        <p className="text-sm text-destructive">{feedback.message}</p>
      )}

      {isLoading && (
        <AdminFeedbackState testId="users-loading" title="Loading users" message="Please wait..." />
      )}

      {!isLoading && users.length === 0 && (
        <AdminFeedbackState testId="users-empty" title="No users" message="No user accounts found." variant="warning" />
      )}

      {!isLoading && users.length > 0 && (
        <ul className="space-y-3" data-testid="users-list">
          {users.map((user) => (
            <li key={user.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{user.username}</p>
                    {user.roles.map((role) => (
                      <RoleBadge key={role} role={role} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(user)}
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
            <h2 className="text-lg font-semibold text-foreground">Create User</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Username</span>
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  autoComplete="off"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  autoComplete="off"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </label>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={createAction.isPending} className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {createAction.isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Edit User: {selectedUser.username}</h2>
            <form className="mt-4 space-y-3" onSubmit={handleUpdate}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Username</span>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">New Password (leave blank to keep current)</span>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  autoComplete="new-password"
                />
              </label>
              <div className="space-y-1 text-sm">
                <span className="text-muted-foreground">Roles</span>
                <RoleSelector selected={editRoles} onChange={setEditRoles} />
              </div>
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
      {isDeleteConfirmOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Delete &quot;{selectedUser.username}&quot;?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete this user account. If this is the last user, a default admin account will be automatically created.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
              <button
                type="button"
                onClick={() => { void handleDelete(); }}
                disabled={deleteAction.isPending}
                className="rounded-md border border-destructive bg-destructive px-3 py-2 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {deleteAction.isPending ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
