"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  buildCanonicalPathLabel,
  mapAiChunkToCanonicalProvenance,
  type WorkspaceDocument,
} from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import { useWorkspaceDocumentsList } from "../../documents/application/use-workspace-documents";
import {
  useRegenerateEmbeddingsAction,
  useWorkspaceAiContext,
  useWorkspaceAiContextStats,
} from "../application/use-workspace-ai-context";
import type { AiContextScope, DocumentChunkStats } from "../infrastructure/workspace-ai-context-api";
import { useWorkspaceContext } from "../../shared/application/workspace-context";
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

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

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

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function AiContextInspector() {
  const { activeSpaceId } = useWorkspaceContext();
  const listState = useWorkspaceDocumentsList(activeSpaceId);
  const statsState = useWorkspaceAiContextStats(activeSpaceId);
  const regenerateAction = useRegenerateEmbeddingsAction();
  const [scope, setScope] = useState<AiContextScope | null>(() =>
    getScopeFromSearchParams(),
  );
  const [activeTab, setActiveTab] = useState<"chunks" | "search">("chunks");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);
  const [regeneratingDocId, setRegeneratingDocId] = useState<string | null>(null);

  const entities = useMemo<WorkspaceDocument[]>(() => {
    if (listState.state !== "success") {
      return [];
    }

    return listState.data.documents;
  }, [listState]);

  const statsMap = useMemo<Map<string, DocumentChunkStats>>(() => {
    if (statsState.state !== "success") {
      return new Map();
    }

    return new Map(statsState.data.map((stat) => [stat.documentId, stat]));
  }, [statsState]);

  const coverageStats = useMemo(() => {
    const totalDocs = entities.length;
    const publishedDocs = entities.filter((e) => e.status === "published").length;
    const embeddedDocs = entities.filter((e) => statsMap.has(e.id)).length;
    const totalChunks = statsState.state === "success"
      ? statsState.data.reduce((sum, s) => sum + s.chunkCount, 0)
      : 0;

    return { totalDocs, publishedDocs, embeddedDocs, totalChunks };
  }, [entities, statsMap, statsState]);

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

  async function handleRegenerate(documentId: string) {
    setActionFeedback(null);
    setRegeneratingDocId(documentId);

    const result = await regenerateAction.mutateAsync(documentId);

    setRegeneratingDocId(null);

    if (result.status === "success") {
      setActionFeedback({
        tone: "success",
        message: "Embeddings regenerated successfully. Refresh to see updated chunks.",
      });
      return;
    }

    setActionFeedback({
      tone: "error",
      message: result.message,
    });
  }

  return (
    <section className="space-y-4" data-testid="admin-section-ai-context">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">AI Context</h1>
        <p className="text-muted-foreground">
          Inspect and manage AI context chunks, embeddings, and semantic search for your documentation.
        </p>
      </header>

      {actionFeedback?.tone === "success" && (
        <p className="text-sm text-emerald-600" data-testid="ai-action-feedback-success">
          {actionFeedback.message}
        </p>
      )}

      {actionFeedback?.tone === "error" && (
        <p className="text-sm text-destructive" data-testid="ai-action-feedback-error">
          {actionFeedback.message}
        </p>
      )}

      {listState.state === "success" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{coverageStats.totalDocs}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Published</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{coverageStats.publishedDocs}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">With Embeddings</p>
            <p className={cn(
              "mt-1 text-2xl font-semibold",
              coverageStats.embeddedDocs === coverageStats.publishedDocs && coverageStats.publishedDocs > 0
                ? "text-emerald-600"
                : "text-foreground",
            )}>
              {coverageStats.embeddedDocs}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Chunks</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{coverageStats.totalChunks}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Documents
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
                const pathLabel = buildCanonicalPathLabel({
                  space: entity.space,
                  slug: entity.slug,
                });
                const stat = statsMap.get(entity.id);
                const hasEmbeddings = stat && stat.chunkCount > 0;

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
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{entity.title}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {entity.status === "published" ? (
                            <span className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              hasEmbeddings ? "bg-emerald-500" : "bg-amber-500",
                            )} title={hasEmbeddings ? `${stat.chunkCount} chunks` : "No embeddings"} />
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" title="Not published" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{pathLabel}</p>
                      {stat ? (
                        <p className="text-xs text-muted-foreground">
                          {stat.chunkCount} chunks
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">No embeddings</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {selectedEntity && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedEntity.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedEntity.status} &middot; {buildCanonicalPathLabel({ space: selectedEntity.space, slug: selectedEntity.slug })}
                  </p>
                  {statsMap.get(selectedEntity.id) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {statsMap.get(selectedEntity.id)!.chunkCount} chunks &middot; Last embedded: {formatTimestamp(statsMap.get(selectedEntity.id)!.lastEmbeddedAt)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { void handleRegenerate(selectedEntity.id); }}
                  disabled={regeneratingDocId === selectedEntity.id}
                  className={cn(
                    "shrink-0 rounded-md border px-3 py-2 text-sm",
                    "border-border hover:bg-accent",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                  data-testid="ai-regenerate-button"
                >
                  {regeneratingDocId === selectedEntity.id ? "Regenerating..." : "Regenerate Embeddings"}
                </button>
              </div>
            </div>
          )}

          {selectedEntity && (
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setActiveTab("chunks")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "chunks"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Chunks ({aiContextState.state === "success" ? aiContextState.data.chunks.length : 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "search"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Test Search
              </button>
            </div>
          )}

          {activeTab === "chunks" && (
            <div className="rounded-lg border border-border bg-card p-4" data-testid="ai-context-detail">
              {!selectedEntity && listState.state === "success" && entities.length === 0 && (
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
                  message="This document has no embeddings yet. Publish the document or click 'Regenerate Embeddings' to generate them."
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
                <ol className="space-y-3" data-testid="ai-context-chunks">
                  {aiContextState.data.chunks.map((chunk, index) => {
                    const canonical = mapAiChunkToCanonicalProvenance(chunk);

                    return (
                      <li
                        key={chunk.id}
                        className="rounded-md border border-border bg-background p-3"
                        data-testid={`ai-context-chunk-${chunk.id}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-xs font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-foreground">{chunk.source.sectionTitle}</span>
                        </div>
                        <p className="text-sm text-foreground">{chunk.content}</p>
                        <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                          <div>
                            <dt className="font-semibold text-foreground">Section</dt>
                            <dd data-testid={`ai-context-source-section-${chunk.id}`}>
                              {canonical.sectionLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-foreground">Path</dt>
                            <dd data-testid={`ai-context-source-path-${chunk.id}`}>
                              {canonical.pathLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-foreground">Navigation</dt>
                            <dd data-testid={`ai-context-source-navigation-${chunk.id}`}>
                              {canonical.navigationLabel}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}

          {activeTab === "search" && selectedEntity && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Test Semantic Search</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter a query to test what chunks the AI would receive. Uses the public search endpoint.
              </p>
              <SemanticSearchTester
                space={selectedEntity.space}
                releaseVersionId={selectedEntity.releaseVersionId}
              />
            </div>
          )}

          {!selectedEntity && listState.state === "success" && entities.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <AdminFeedbackState
                testId="ai-context-select-entity"
                title="Select a document"
                message="Choose a document from the list to inspect its AI context chunks."
                variant="warning"
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">MCP Configuration</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Use these endpoints to connect AI tools to your documentation.
        </p>
        <div className="mt-3 space-y-2">
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-foreground">MCP HTTP Endpoint</p>
            <code className="mt-1 block text-xs text-muted-foreground">POST {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/mcp</code>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-foreground">REST Search Endpoint</p>
            <code className="mt-1 block text-xs text-muted-foreground">POST {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/public/ai-context/search</code>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-foreground">MCP CLI (.mcp.json)</p>
            <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">{`{
  "mcpServers": {
    "emerald": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": { "API_URL": "${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}" }
    }
  }
}`}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function SemanticSearchTester({ space, releaseVersionId }: { space: string; releaseVersionId?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; content: string; relevanceScore: number; source: { sectionTitle: string } }> | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeVersion } = useWorkspaceContext();
  const versionKey = activeVersion?.key ?? "v1";

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    setResults(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

    try {
      const response = await fetch(`${apiUrl}/api/public/ai-context/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), space, version: versionKey }),
      });

      if (!response.ok) {
        setError(`Search failed (${response.status})`);
        setSearching(false);
        return;
      }

      const data = await response.json();
      setResults(data.chunks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }

    setSearching(false);
  }

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. how to install"
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className={cn(
            "shrink-0 rounded-md border px-3 py-1.5 text-sm",
            "border-border hover:bg-accent",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {results && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No results found. Make sure the space has published documents with embeddings.</p>
      )}

      {results && results.length > 0 && (
        <ol className="space-y-2">
          {results.map((chunk, index) => (
            <li key={chunk.id} className="rounded-md border border-border bg-background p-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-xs font-medium text-foreground">{chunk.source.sectionTitle}</span>
                <span className="ml-auto text-xs text-emerald-600">{formatRelevanceScore(chunk.relevanceScore)}</span>
              </div>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{chunk.content}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
