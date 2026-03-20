"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@emerald/ui/lib/cn";
import {
  useWorkspaceNavigationDetail,
  useWorkspaceNavigationList,
} from "../application/use-workspace-navigation";

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
  const [selectedNavigationId, setSelectedNavigationId] = useState<string | null>(
    null,
  );

  const listItems = useMemo(() => {
    if (listState.state !== "success") {
      return [];
    }

    return listState.data.items;
  }, [listState]);

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

  const detailState = useWorkspaceNavigationDetail(selectedNavigationId);

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
            <p className="mt-3 text-sm text-muted-foreground" data-testid="navigation-list-loading">
              Loading navigation records…
            </p>
          )}

          {listState.state === "error" && (
            <p className="mt-3 text-sm text-destructive" data-testid="navigation-list-error">
              Could not load navigation records. {listState.message}
            </p>
          )}

          {listState.state === "validation-error" && (
            <p
              className="mt-3 text-sm text-destructive"
              data-testid="navigation-list-validation-error"
            >
              Navigation list payload is invalid. {listState.message}
            </p>
          )}

          {listState.state === "success" && listState.data.items.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="navigation-list-empty">
              No navigation records found.
            </p>
          )}

          {listState.state === "success" && listState.data.items.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="navigation-list">
              {listState.data.items.map((item) => {
                const isSelected = selectedNavigationId === item.id;

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
                        {item.space}/{item.slug}
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

          {listState.state === "success" && listState.data.items.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a navigation item to inspect details.
            </p>
          )}

          {selectedNavigationId && detailState.state === "loading" && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="navigation-detail-loading">
              Loading selected navigation item…
            </p>
          )}

          {selectedNavigationId && detailState.state === "not-found" && (
            <p className="mt-3 text-sm text-destructive" data-testid="navigation-detail-not-found">
              The selected navigation item could not be found.
            </p>
          )}

          {selectedNavigationId && detailState.state === "error" && (
            <p className="mt-3 text-sm text-destructive" data-testid="navigation-detail-error">
              Failed to load selected navigation item. {detailState.message}
            </p>
          )}

          {selectedNavigationId && detailState.state === "validation-error" && (
            <p
              className="mt-3 text-sm text-destructive"
              data-testid="navigation-detail-validation-error"
            >
              Selected navigation payload is invalid. {detailState.message}
            </p>
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
                  {detailState.data.order}
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
