"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { WorkspaceDocument } from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import { useWorkspaceDocumentsList } from "../../documents/application/use-workspace-documents";
import {
  useWorkspaceAiContext,
} from "../application/use-workspace-ai-context";
import type { AiContextScope } from "../infrastructure/workspace-ai-context-api";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";

const AI_ENTITY_TYPE = "document";

function getScopeFromSearchParams(): AiContextScope | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (entityType !== AI_ENTITY_TYPE || !entityId) {
    return null;
  }

  return {
    entityType,
    entityId,
  };
}

function syncScopeInUrl(scope: AiContextScope) {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("entityType", scope.entityType);
  nextUrl.searchParams.set("entityId", scope.entityId);

  window.history.replaceState(
    window.history.state,
    "",
    `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`,
  );
}

function formatRelevanceScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function AiContextInspector() {
  const listState = useWorkspaceDocumentsList();
  const [scope, setScope] = useState<AiContextScope | null>(() =>
    getScopeFromSearchParams(),
  );

  const entities = useMemo<WorkspaceDocument[]>(() => {
    if (listState.state !== "success") {
      return [];
    }

    return listState.data.documents;
  }, [listState]);

  useEffect(() => {
    if (entities.length === 0) {
      setScope(null);
      return;
    }

    setScope((currentScope) => {
      if (
        currentScope &&
        entities.some((entity) => entity.id === currentScope.entityId)
      ) {
        return currentScope;
      }

      const requestedScope = getScopeFromSearchParams();

      if (
        requestedScope &&
        entities.some((entity) => entity.id === requestedScope.entityId)
      ) {
        return requestedScope;
      }

      return {
        entityType: AI_ENTITY_TYPE,
        entityId: entities[0].id,
      };
    });
  }, [entities]);

  useEffect(() => {
    if (!scope) {
      return;
    }

    syncScopeInUrl(scope);
  }, [scope]);

  const aiContextState = useWorkspaceAiContext(scope);
  const selectedEntity =
    scope?.entityId
      ? entities.find((entity) => entity.id === scope.entityId) ?? null
      : null;

  return (
    <section className="space-y-4" data-testid="admin-section-ai-context">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">AI Context</h1>
        <p className="text-muted-foreground">
          Inspect contextual chunks and references for the selected workspace
          entity.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Entities
          </h2>

          {listState.state === "loading" && (
            <AdminFeedbackState
              testId="ai-entities-loading"
              title="Loading entities"
              message="Please wait while workspace entities are fetched."
            />
          )}

          {listState.state === "error" && (
            <AdminFeedbackState
              testId="ai-entities-error"
              title="Could not load entities"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "validation-error" && (
            <AdminFeedbackState
              testId="ai-entities-validation-error"
              title="Entity payload is invalid"
              message={listState.message}
              variant="destructive"
            />
          )}

          {listState.state === "success" && entities.length === 0 && (
            <AdminFeedbackState
              testId="ai-entities-empty"
              title="No entities found"
              message="There are no workspace entities available for AI context inspection."
              variant="warning"
            />
          )}

          {listState.state === "success" && entities.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="ai-entities-list">
              {entities.map((entity) => {
                const isSelected = scope?.entityId === entity.id;

                return (
                  <li key={entity.id} className="list-none">
                    <button
                      type="button"
                      onClick={() => {
                        setScope({
                          entityType: AI_ENTITY_TYPE,
                          entityId: entity.id,
                        });
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        "border-border text-foreground hover:bg-accent",
                        isSelected && "border-primary bg-accent",
                      )}
                      data-testid={`ai-entity-item-${entity.id}`}
                    >
                      <p className="text-sm font-medium">{entity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entity.space}/{entity.slug}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4" data-testid="ai-context-detail">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Selected entity context
          </h2>

          {selectedEntity && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Scope</dt>
                <dd className="font-medium" data-testid="ai-context-scope">
                  {scope?.entityType}/{scope?.entityId}
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium" data-testid="ai-context-entity-title">
                  {selectedEntity.title}
                </dd>
              </div>
            </dl>
          )}

          {listState.state === "success" && entities.length === 0 && (
            <AdminFeedbackState
              testId="ai-context-no-entity"
              title="No selected entity"
              message="Select an entity to inspect contextual chunks and provenance."
              variant="warning"
            />
          )}

          {scope && aiContextState.state === "loading" && (
            <AdminFeedbackState
              testId="ai-context-loading"
              title="Loading AI context"
              message="Please wait while the selected entity context is fetched."
            />
          )}

          {scope && aiContextState.state === "empty" && (
            <AdminFeedbackState
              testId="ai-context-empty"
              title="No contextual chunks available"
              message="No AI chunks were returned for this entity scope."
              variant="warning"
            />
          )}

          {scope && aiContextState.state === "error" && (
            <AdminFeedbackState
              testId="ai-context-error"
              title="Failed to load AI context"
              message={aiContextState.message}
              variant="destructive"
            />
          )}

          {scope && aiContextState.state === "validation-error" && (
            <AdminFeedbackState
              testId="ai-context-validation-error"
              title="AI context payload is invalid"
              message={aiContextState.message}
              variant="destructive"
            />
          )}

          {scope && aiContextState.state === "success" && (
            <ol className="mt-3 space-y-3" data-testid="ai-context-chunks">
              {aiContextState.data.chunks.map((chunk) => (
                <li
                  key={chunk.id}
                  className="rounded-md border border-border bg-background p-3"
                  data-testid={`ai-context-chunk-${chunk.id}`}
                >
                  <p className="text-sm font-medium text-foreground">{chunk.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Relevance: {formatRelevanceScore(chunk.relevanceScore)}
                  </p>
                  <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-foreground">Document</dt>
                      <dd data-testid={`ai-context-source-document-${chunk.id}`}>
                        {chunk.source.documentTitle} ({chunk.source.documentId})
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Version</dt>
                      <dd data-testid={`ai-context-source-version-${chunk.id}`}>
                        {chunk.source.versionLabel} ({chunk.source.versionId})
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Path</dt>
                      <dd data-testid={`ai-context-source-path-${chunk.id}`}>
                        {chunk.source.space}/{chunk.source.slug}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Section</dt>
                      <dd data-testid={`ai-context-source-section-${chunk.id}`}>
                        {chunk.source.sectionTitle} ({chunk.source.sectionId})
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
