"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { WorkspaceNavigation } from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import {
  useReorderWorkspaceNavigationAction,
  useWorkspaceNavigationDetail,
  useWorkspaceNavigationList,
} from "../application/use-workspace-navigation";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

function sortNavigationItemsByOrder(items: WorkspaceNavigation[]): WorkspaceNavigation[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.label.localeCompare(b.label);
  });
}

function buildMoveToTopOrderOverrides(
  items: WorkspaceNavigation[],
  targetId: string,
): Record<string, number> {
  const targetItem = items.find((item) => item.id === targetId);
  if (!targetItem) {
    return {};
  }

  const targetOrder = targetItem.order;
  const nextOrders: Record<string, number> = {};

  for (const item of items) {
    if (item.id === targetId) {
      nextOrders[item.id] = 0;
      continue;
    }

    nextOrders[item.id] = item.order < targetOrder ? item.order + 1 : item.order;
  }

  return nextOrders;
}

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

export function NavigationInspector() {
  const listState = useWorkspaceNavigationList();
  const reorderAction = useReorderWorkspaceNavigationAction();
  const [selectedNavigationId, setSelectedNavigationId] = useState<string | null>(
    null,
  );
  const [navigationOrderOverrides, setNavigationOrderOverrides] = useState<
    Record<string, number>
  >({});
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

  const listItems = useMemo<WorkspaceNavigation[]>(() => {
    if (listState.state !== "success") {
      return [];
    }

    const itemsWithEffectiveOrder = listState.data.items.map((item) => ({
      ...item,
      order: navigationOrderOverrides[item.id] ?? item.order,
    }));

    return sortNavigationItemsByOrder(itemsWithEffectiveOrder);
  }, [listState, navigationOrderOverrides]);

  useEffect(() => {
    if (listItems.length === 0) {
      setSelectedNavigationId(null);
      return;
    }

    setSelectedNavigationId((currentSelectedId) => {
      if (currentSelectedId && listItems.some((item) => item.id === currentSelectedId)) {
        return currentSelectedId;
      }

      return listItems[0].id;
    });
  }, [listItems]);

  useEffect(() => {
    const validIds = new Set(listItems.map((item) => item.id));

    setNavigationOrderOverrides((currentOverrides) => {
      let hasChanges = false;
      const nextOverrides: Record<string, number> = {};

      for (const [navigationId, order] of Object.entries(currentOverrides)) {
        if (validIds.has(navigationId)) {
          nextOverrides[navigationId] = order;
          continue;
        }

        hasChanges = true;
      }

      return hasChanges ? nextOverrides : currentOverrides;
    });
  }, [listItems]);

  const detailState = useWorkspaceNavigationDetail(selectedNavigationId);

  function getEffectiveOrder(navigationId: string, baseOrder: number) {
    return navigationOrderOverrides[navigationId] ?? baseOrder;
  }

  const selectedNavigationOrder =
    selectedNavigationId && detailState.state === "success"
      ? getEffectiveOrder(detailState.data.id, detailState.data.order)
      : null;

  async function handleMoveSelectedNavigationToTop() {
    if (!selectedNavigationId || detailState.state !== "success") {
      return;
    }

    const navigationId = detailState.data.id;
    const previousOverrides = { ...navigationOrderOverrides };
    const nextOverrides = buildMoveToTopOrderOverrides(listItems, navigationId);

    setActionFeedback(null);
    setNavigationOrderOverrides(nextOverrides);

    try {
      const result = await reorderAction.mutateAsync(navigationId);

      if (result.status === "success") {
        setActionFeedback({
          tone: "success",
          message: result.data.message,
        });
        return;
      }

      setNavigationOrderOverrides(previousOverrides);
      setActionFeedback({
        tone: "error",
        message: result.message,
      });
    } catch (error) {
      setNavigationOrderOverrides(previousOverrides);
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown mutation failure",
      });
    }
  }

  return (
    <section className="space-y-4" data-testid="admin-section-navigation">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Navigation</h1>
        <p className="text-muted-foreground">
          Inspect mocked navigation records and compare structural metadata for
          the selected item.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Records
          </h2>

          {listState.state === "loading" && (
            <AdminFeedbackState
              testId="navigation-list-loading"
              title="Loading navigation records"
              message="Please wait while navigation data is fetched."
            />
          )}

          {listState.state === "error" && (
            <AdminFeedbackState
              testId="navigation-list-error"
              title="Could not load navigation records"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "validation-error" && (
            <AdminFeedbackState
              testId="navigation-list-validation-error"
              title="Navigation list payload is invalid"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "success" && listItems.length === 0 && (
            <AdminFeedbackState
              testId="navigation-list-empty"
              title="No navigation records found"
              message="This workspace has no navigation records to inspect yet."
              variant="warning"
            />
          )}

          {listState.state === "success" && listItems.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="navigation-list">
              {listItems.map((item) => {
                const isSelected = selectedNavigationId === item.id;
                const order = getEffectiveOrder(item.id, item.order);

                return (
                  <li
                    key={item.id}
                    className="list-none"
                    data-testid={`navigation-list-item-${item.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedNavigationId(item.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        "border-border text-foreground hover:bg-accent",
                        isSelected && "border-primary bg-accent",
                      )}
                    >
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.space}/{item.slug} • order{" "}
                        <span data-testid={`navigation-list-item-${item.id}-order`}>
                          {order}
                        </span>
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4" data-testid="navigation-detail">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Selected navigation item
          </h2>

          {selectedNavigationId && detailState.state === "success" && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  void handleMoveSelectedNavigationToTop();
                }}
                disabled={reorderAction.isPending || selectedNavigationOrder === 0}
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "border-border text-foreground hover:bg-accent",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {reorderAction.isPending ? "Moving…" : "Move selected item to top"}
              </button>

              {actionFeedback?.tone === "success" && (
                <p className="text-sm text-emerald-600" data-testid="navigation-action-feedback-success">
                  {actionFeedback.message}
                </p>
              )}

              {actionFeedback?.tone === "error" && (
                <p className="text-sm text-destructive" data-testid="navigation-action-feedback-error">
                  {actionFeedback.message}
                </p>
              )}
            </div>
          )}

          {listState.state === "success" && listItems.length === 0 && (
            <AdminFeedbackState
              testId="navigation-detail-empty"
              title="No selected navigation item"
              message="Add or load navigation records to inspect detail fields."
              variant="warning"
            />
          )}

          {selectedNavigationId && detailState.state === "loading" && (
            <AdminFeedbackState
              testId="navigation-detail-loading"
              title="Loading selected navigation item"
              message="Please wait while the selected record details are fetched."
            />
          )}

          {selectedNavigationId && detailState.state === "not-found" && (
            <AdminFeedbackState
              testId="navigation-detail-not-found"
              title="Selected navigation item was not found"
              message="The selected record no longer exists in the current workspace data."
              variant="warning"
            />
          )}

          {selectedNavigationId && detailState.state === "error" && (
            <AdminFeedbackState
              testId="navigation-detail-error"
              title="Failed to load selected navigation item"
              message={detailState.message}
              variant="destructive"
            />
          )}

          {selectedNavigationId && detailState.state === "validation-error" && (
            <AdminFeedbackState
              testId="navigation-detail-validation-error"
              title="Selected navigation payload is invalid"
              message={detailState.message}
              variant="destructive"
            />
          )}

          {selectedNavigationId && detailState.state === "success" && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-medium" data-testid="navigation-detail-id">
                  {detailState.data.id}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Label</dt>
                <dd className="font-medium" data-testid="navigation-detail-label">
                  {detailState.data.label}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-medium" data-testid="navigation-detail-slug">
                  {detailState.data.slug}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Space</dt>
                <dd className="font-medium" data-testid="navigation-detail-space">
                  {detailState.data.space}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Parent</dt>
                <dd className="font-medium" data-testid="navigation-detail-parent">
                  {detailState.data.parentId ?? "Root"}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Order</dt>
                <dd className="font-medium" data-testid="navigation-detail-order">
                  {selectedNavigationOrder ?? detailState.data.order}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium" data-testid="navigation-detail-updated-at">
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
